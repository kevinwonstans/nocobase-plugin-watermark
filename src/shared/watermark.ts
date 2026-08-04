/**
 * 水印运行时（纯 DOM 实现，v1 / v2 客户端共用）
 *
 * 功能：
 * - 登录成功后在全页覆盖半透明水印（当前登录用户名 + 日期），防止截图泄密
 * - 登录页、注册页等公共页面以及未登录时自动移除水印，30s 内生效
 * - 定时检测 + MutationObserver 监听，水印 DOM 被删除后立即重建
 * - 支持配置水印文字、透明度、字号、排列密度与总开关
 */

/** 设置页保存后通知水印运行时立即刷新的自定义事件名 */
export const WATERMARK_SETTINGS_CHANGED_EVENT = 'nocobase-plugin-watermark:settingsChanged';

export type WatermarkDensity = 'sparse' | 'medium' | 'dense';

export interface WatermarkSettings {
  /** 总开关 */
  enabled: boolean;
  /** 水印文字模板，支持占位符 {{user}} / {{date}}（及兼容写法 {user} / {date}） */
  text: string;
  /** 透明度 0.05 ~ 1 */
  opacity: number;
  /** 字号（px）8 ~ 64 */
  fontSize: number;
  /** 排列密度 */
  density: WatermarkDensity;
}

export const DEFAULT_SETTINGS: WatermarkSettings = {
  enabled: true,
  text: '{{user}} {{date}}',
  opacity: 0.15,
  fontSize: 16,
  density: 'medium',
};

const DENSITIES: WatermarkDensity[] = ['sparse', 'medium', 'dense'];

/** 认证类公共页面（登录/注册/找回密码等），这些页面不显示水印 */
const AUTH_ROUTE_PREFIXES = ['/signin', '/signup', '/forgot-password', '/reset-password'];

/** 密度 -> 平铺单元尺寸（px） */
const DENSITY_TILE_SIZE: Record<WatermarkDensity, number> = {
  sparse: 320,
  medium: 220,
  dense: 140,
};

/** 定时检测周期（5s，保证登出/进入公共页面后 30s 内移除） */
const SYNC_INTERVAL = 5000;
/** 设置缓存有效期（30s 定时拉取最新配置） */
const SETTINGS_TTL = 30000;

/** 水印容器挂载属性，用于标记与防篡改校验 */
const WATERMARK_ATTR = 'data-nocobase-watermark';

/** 水印层 z-index（高于页面所有内容，pointer-events 不拦截点击） */
const WATERMARK_Z_INDEX = 99999;

interface RequestOptions {
  url: string;
  method?: string;
  data?: unknown;
  [key: string]: unknown;
}

/** 水印运行时依赖的最小 app 接口（v1 / v2 的 Application 均满足） */
export interface WatermarkHost {
  apiClient: {
    auth?: { token?: string | null };
    request(options: RequestOptions): Promise<{ data?: { data?: any } }>;
  };
  eventBus: EventTarget;
  router?: {
    getBasename?(): string;
    router?: {
      state?: { location?: { pathname?: string } };
      subscribe?(listener: () => void): () => void;
    };
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 本地时区 yyyy-MM-dd 日期 */
function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 超长文字自动换行，避免超出平铺单元 */
function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  const limit = Math.max(1, maxChars);
  for (const rawLine of text.split('\n')) {
    if (!rawLine) {
      lines.push('');
      continue;
    }
    for (let i = 0; i < rawLine.length; i += limit) {
      lines.push(rawLine.slice(i, i + limit));
    }
  }
  return lines;
}

/** 生成单个平铺单元的 SVG（旋转 -25° 的半透明文字） */
function buildWatermarkSvg(options: {
  text: string;
  fontSize: number;
  opacity: number;
  size: number;
}): string {
  const { text, fontSize, opacity, size } = options;
  // CJK 字符宽度约等于 1em
  const maxChars = Math.floor((size * 0.85) / fontSize);
  const lines = wrapText(text, maxChars);
  const lineHeight = fontSize * 1.4;
  const totalHeight = lines.length * lineHeight;
  const startY = size / 2 - totalHeight / 2 + lineHeight / 2;
  const tspans = lines
    .map((line, index) => {
      const y = startY + index * lineHeight;
      return `<tspan x="50%" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<g transform="rotate(-25 ${size / 2} ${size / 2})">`,
    `<text text-anchor="middle" dominant-baseline="middle" font-family="'Microsoft YaHei','PingFang SC',Arial,sans-serif" font-size="${fontSize}" fill="rgba(0,0,0,${opacity})">${tspans}</text>`,
    `</g></svg>`,
  ].join('');
}

export class WatermarkManager {
  private el: HTMLDivElement | null = null;
  private timer: number | null = null;
  private observer: MutationObserver | null = null;
  private unsubscribers: Array<() => void> = [];
  private settings: WatermarkSettings | null = null;
  private settingsFetchedAt = 0;
  private user: { name: string } | null = null;
  private destroyed = false;
  /** 主动移除水印时置位，避免 MutationObserver 回调触发重建 */
  private removing = false;

  constructor(private host: WatermarkHost) {}

  start(): void {
    this.host.eventBus.addEventListener('auth:tokenChanged', this.handleTokenChanged);
    this.host.eventBus.addEventListener(WATERMARK_SETTINGS_CHANGED_EVENT, this.handleSettingsChanged);

    const router = this.host.router?.router;
    if (router && typeof router.subscribe === 'function') {
      this.unsubscribers.push(router.subscribe(this.handleRouteChanged));
    }

    // 监听水印节点被（人为）删除，立即重建
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      this.observer = new MutationObserver(this.handleMutations);
      this.observer.observe(document.body, { childList: true, subtree: false });
    }

    this.timer = window.setInterval(() => this.sync(), SYNC_INTERVAL);
    this.sync();
  }

  stop(): void {
    this.destroyed = true;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.observer?.disconnect();
    this.observer = null;
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.host.eventBus.removeEventListener('auth:tokenChanged', this.handleTokenChanged);
    this.host.eventBus.removeEventListener(WATERMARK_SETTINGS_CHANGED_EVENT, this.handleSettingsChanged);
    this.remove();
  }

  /** 主动刷新（供测试或外部调用） */
  refresh(): void {
    this.sync();
  }

  private handleTokenChanged = (event: Event) => {
    const token = (event as CustomEvent).detail?.token;
    if (token) {
      // 登录成功：重置用户缓存并立即拉取最新设置
      this.user = null;
      void this.fetchSettings();
    }
    this.sync();
  };

  private handleRouteChanged = () => {
    this.sync();
  };

  private handleSettingsChanged = () => {
    void this.fetchSettings();
  };

  private handleMutations = () => {
    if (this.removing) {
      return;
    }
    // 水印节点被删除：若仍应显示则立即重建
    if (this.el && !this.el.isConnected) {
      this.el = null;
      if (this.shouldShow()) {
        this.render();
      }
    }
  };

  private get pathname(): string {
    return (
      this.host.router?.router?.state?.location?.pathname ||
      (typeof window !== 'undefined' ? window.location.pathname : '') ||
      ''
    );
  }

  /** 当前是否处于登录/注册等公共页面（不显示水印） */
  private isAuthRoute(): boolean {
    const pathname = this.pathname;
    if (!pathname) {
      return false;
    }
    const basename = this.host.router?.getBasename?.() || '';
    let path = pathname;
    if (basename && basename !== '/' && path.startsWith(basename)) {
      path = path.slice(basename.length) || '/';
    }
    return AUTH_ROUTE_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }

  private shouldShow(): boolean {
    if (!this.settings) {
      return false;
    }
    if (!this.settings.enabled) {
      return false;
    }
    if (!this.host.apiClient.auth?.token) {
      return false;
    }
    if (this.isAuthRoute()) {
      return false;
    }
    return true;
  }

  private async fetchSettings(): Promise<void> {
    let fetched = false;
    try {
      const res = await this.host.apiClient.request({ url: 'watermarkSettings:get' });
      const data = res?.data?.data;
      if (data && typeof data === 'object') {
        const opacity = Number(data.opacity);
        const fontSize = Number(data.fontSize);
        this.settings = {
          enabled: data.enabled !== false,
          text: typeof data.text === 'string' && data.text ? data.text : DEFAULT_SETTINGS.text,
          opacity: Number.isFinite(opacity) ? clamp(opacity, 0.05, 1) : DEFAULT_SETTINGS.opacity,
          fontSize: Number.isFinite(fontSize) ? clamp(Math.round(fontSize), 8, 64) : DEFAULT_SETTINGS.fontSize,
          density: DENSITIES.includes(data.density) ? data.density : DEFAULT_SETTINGS.density,
        };
        fetched = true;
      }
    } catch {
      // 拉取失败时保留旧设置；首次失败则回退默认配置
      this.settings = this.settings || { ...DEFAULT_SETTINGS };
    }
    this.settingsFetchedAt = Date.now();
    if (fetched) {
      this.sync();
    }
  }

  private async fetchUser(): Promise<void> {
    try {
      const res = await this.host.apiClient.request({
        url: 'auth:check',
        skipNotify: true,
        skipAuth: true,
      });
      const user = res?.data?.data;
      if (user && user.id != null) {
        const name = user.nickname || user.username || user.email || String(user.id);
        // 用户名变化时触发同步（期望背景变化，健康检查会触发重渲染）
        if (name !== this.user?.name) {
          this.user = { name };
          this.sync();
        }
      }
    } catch {
      // 获取失败：保留空用户名，等待下个周期重试
    }
  }

  /** 定时同步：按当前状态显示/隐藏水印，并做健康检查 */
  private sync(): void {
    if (this.destroyed) {
      return;
    }
    const token = this.host.apiClient.auth?.token;
    if (!token) {
      // 未登录（含登出后回到登录页）：移除水印
      this.remove();
      return;
    }
    if (Date.now() - this.settingsFetchedAt > SETTINGS_TTL) {
      void this.fetchSettings();
    }
    if (!this.user) {
      void this.fetchUser();
    }
    if (this.shouldShow()) {
      // 健康检查：节点缺失、被移出文档或样式与"当前期望"不一致（含被篡改）时重建
      const expected = this.buildBackground();
      if (
        this.el &&
        this.el.isConnected &&
        this.el.style.backgroundImage === expected.image &&
        this.el.style.backgroundSize === expected.size
      ) {
        return;
      }
      this.render();
    } else {
      this.remove();
    }
  }

  private resolveText(): string {
    const template = this.settings?.text || DEFAULT_SETTINGS.text;
    const name = this.user?.name || '';
    const date = formatDate(new Date());
    return template
      .replace(/\{\{user\}\}/g, name)
      .replace(/\{user\}/g, name)
      .replace(/\{\{date\}\}/g, date)
      .replace(/\{date\}/g, date);
  }

  /** 根据当前设置与用户生成期望的背景样式（渲染与健康检查共用） */
  private buildBackground(): { image: string; size: string } {
    const settings = this.settings || DEFAULT_SETTINGS;
    const size = DENSITY_TILE_SIZE[settings.density] || DENSITY_TILE_SIZE.medium;
    const svg = buildWatermarkSvg({
      text: this.resolveText(),
      fontSize: settings.fontSize,
      opacity: settings.opacity,
      size,
    });
    return {
      image: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
      size: `${size}px ${size}px`,
    };
  }

  private render(): void {
    this.remove();
    const { image, size } = this.buildBackground();

    const div = document.createElement('div');
    div.setAttribute(WATERMARK_ATTR, '1');
    div.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      `z-index:${WATERMARK_Z_INDEX}`,
      'pointer-events:none',
      'overflow:hidden',
      'background-repeat:repeat',
      `background-image:${image}`,
      `background-size:${size}`,
    ].join(';');
    document.body.appendChild(div);
    this.el = div;
  }

  private remove(): void {
    if (!this.el) {
      return;
    }
    this.removing = true;
    try {
      this.el.remove();
    } finally {
      this.el = null;
      this.removing = false;
    }
  }
}
