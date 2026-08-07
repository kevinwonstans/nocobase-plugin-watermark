/**
 * 水印运行时（纯 DOM 实现，v1 / v2 客户端共用）
 *
 * 功能：
 * - 登录成功后在全页覆盖半透明水印（当前登录用户名 + 日期），防止截图泄密
 * - 登录页、注册页等公共页面以及未登录时自动移除水印，30s 内生效
 * - 定时检测 + MutationObserver 监听，水印 DOM 被删除后立即重建
 * - 水印文字支持换行多行排版（默认用户名与日期各占一行），文字宽度自适应不截断
 * - 支持配置水印文字、透明度、字号、排列密度与总开关
 */
/** 设置页保存后通知水印运行时立即刷新的自定义事件名 */
export declare const WATERMARK_SETTINGS_CHANGED_EVENT = "nocobase-plugin-watermark:settingsChanged";
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
export declare const DEFAULT_SETTINGS: WatermarkSettings;
interface RequestOptions {
    url: string;
    method?: string;
    data?: unknown;
    [key: string]: unknown;
}
/** 水印运行时依赖的最小 app 接口（v1 / v2 的 Application 均满足） */
export interface WatermarkHost {
    apiClient: {
        auth?: {
            token?: string | null;
        };
        request(options: RequestOptions): Promise<{
            data?: {
                data?: any;
            };
        }>;
    };
    eventBus: EventTarget;
    router?: {
        getBasename?(): string;
        router?: {
            state?: {
                location?: {
                    pathname?: string;
                };
            };
            subscribe?(listener: () => void): () => void;
        };
    };
}
export declare class WatermarkManager {
    private host;
    private el;
    private timer;
    private observer;
    private unsubscribers;
    private settings;
    private settingsFetchedAt;
    private user;
    private destroyed;
    /** 主动移除水印时置位，避免 MutationObserver 回调触发重建 */
    private removing;
    constructor(host: WatermarkHost);
    start(): void;
    stop(): void;
    /** 主动刷新（供测试或外部调用） */
    refresh(): void;
    private handleTokenChanged;
    private handleRouteChanged;
    private handleSettingsChanged;
    private handleMutations;
    private get pathname();
    /** 当前是否处于登录/注册等公共页面（不显示水印） */
    private isAuthRoute;
    private shouldShow;
    private fetchSettings;
    private fetchUser;
    /** 定时同步：按当前状态显示/隐藏水印，并做健康检查 */
    private sync;
    private resolveText;
    /** 根据当前设置与用户生成期望的背景样式（渲染与健康检查共用） */
    private buildBackground;
    private render;
    private remove;
}
export {};
