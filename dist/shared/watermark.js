/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var watermark_exports = {};
__export(watermark_exports, {
  DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
  WATERMARK_SETTINGS_CHANGED_EVENT: () => WATERMARK_SETTINGS_CHANGED_EVENT,
  WatermarkManager: () => WatermarkManager
});
module.exports = __toCommonJS(watermark_exports);
const WATERMARK_SETTINGS_CHANGED_EVENT = "nocobase-plugin-watermark:settingsChanged";
const DEFAULT_SETTINGS = {
  enabled: true,
  text: "{{user}}\n{{date}}",
  opacity: 0.15,
  fontSize: 16,
  density: "medium"
};
const DENSITIES = ["sparse", "medium", "dense"];
const AUTH_ROUTE_PREFIXES = ["/signin", "/signup", "/forgot-password", "/reset-password"];
const DENSITY_GAP = {
  sparse: { x: 140, y: 160 },
  medium: { x: 100, y: 110 },
  dense: { x: 50, y: 60 }
};
const SYNC_INTERVAL = 5e3;
const SETTINGS_TTL = 3e4;
const WATERMARK_ATTR = "data-nocobase-watermark";
const WATERMARK_Z_INDEX = 99999;
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function formatDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function estimateTextWidth(text, fontSize) {
  let width = 0;
  for (const ch of text) {
    width += ch.charCodeAt(0) > 11904 ? fontSize : fontSize * 0.55;
  }
  return width;
}
function buildWatermarkSvg(options) {
  const { text, fontSize, opacity, gap } = options;
  const lines = text.split("\n");
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  const lineHeight = fontSize * 1.4;
  const contentWidth = Math.max(...lines.map((line) => estimateTextWidth(line, fontSize)), fontSize);
  const contentHeight = lines.length * lineHeight;
  const angle = 25 * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotatedW = contentWidth * cos + contentHeight * sin;
  const rotatedH = contentWidth * sin + contentHeight * cos;
  const margin = fontSize * 0.6;
  const width = Math.ceil(rotatedW + margin * 2 + gap.x);
  const height = Math.ceil(rotatedH + margin * 2 + gap.y);
  const cx = (width - gap.x) / 2;
  const cy = (height - gap.y) / 2;
  const startY = cy - contentHeight / 2 + lineHeight / 2;
  const tspans = lines.map((line, index) => {
    const y = startY + index * lineHeight;
    return `<tspan x="50%" y="${y}">${escapeXml(line)}</tspan>`;
  }).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<g transform="rotate(-25 ${cx} ${cy})">`,
    `<text text-anchor="middle" dominant-baseline="middle" font-family="'Microsoft YaHei','PingFang SC',Arial,sans-serif" font-size="${fontSize}" fill="rgba(0,0,0,${opacity})">${tspans}</text>`,
    `</g></svg>`
  ].join("");
}
class WatermarkManager {
  constructor(host) {
    this.host = host;
  }
  el = null;
  timer = null;
  observer = null;
  unsubscribers = [];
  settings = null;
  settingsFetchedAt = 0;
  user = null;
  destroyed = false;
  /** 主动移除水印时置位，避免 MutationObserver 回调触发重建 */
  removing = false;
  start() {
    var _a;
    this.host.eventBus.addEventListener("auth:tokenChanged", this.handleTokenChanged);
    this.host.eventBus.addEventListener(WATERMARK_SETTINGS_CHANGED_EVENT, this.handleSettingsChanged);
    const router = (_a = this.host.router) == null ? void 0 : _a.router;
    if (router && typeof router.subscribe === "function") {
      this.unsubscribers.push(router.subscribe(this.handleRouteChanged));
    }
    if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
      this.observer = new MutationObserver(this.handleMutations);
      this.observer.observe(document.body, { childList: true, subtree: false });
    }
    this.timer = window.setInterval(() => this.sync(), SYNC_INTERVAL);
    this.sync();
  }
  stop() {
    var _a;
    this.destroyed = true;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    (_a = this.observer) == null ? void 0 : _a.disconnect();
    this.observer = null;
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.host.eventBus.removeEventListener("auth:tokenChanged", this.handleTokenChanged);
    this.host.eventBus.removeEventListener(WATERMARK_SETTINGS_CHANGED_EVENT, this.handleSettingsChanged);
    this.remove();
  }
  /** 主动刷新（供测试或外部调用） */
  refresh() {
    this.sync();
  }
  handleTokenChanged = (event) => {
    var _a;
    const token = (_a = event.detail) == null ? void 0 : _a.token;
    if (token) {
      this.user = null;
      void this.fetchSettings();
    }
    this.sync();
  };
  handleRouteChanged = () => {
    this.sync();
  };
  handleSettingsChanged = () => {
    void this.fetchSettings();
  };
  handleMutations = () => {
    if (this.removing) {
      return;
    }
    if (this.el && !this.el.isConnected) {
      this.el = null;
      if (this.shouldShow()) {
        this.render();
      }
    }
  };
  get pathname() {
    var _a, _b, _c, _d;
    return ((_d = (_c = (_b = (_a = this.host.router) == null ? void 0 : _a.router) == null ? void 0 : _b.state) == null ? void 0 : _c.location) == null ? void 0 : _d.pathname) || (typeof window !== "undefined" ? window.location.pathname : "") || "";
  }
  /** 当前是否处于登录/注册等公共页面（不显示水印） */
  isAuthRoute() {
    var _a, _b;
    const pathname = this.pathname;
    if (!pathname) {
      return false;
    }
    const basename = ((_b = (_a = this.host.router) == null ? void 0 : _a.getBasename) == null ? void 0 : _b.call(_a)) || "";
    let path = pathname;
    if (basename && basename !== "/" && path.startsWith(basename)) {
      path = path.slice(basename.length) || "/";
    }
    return AUTH_ROUTE_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    );
  }
  shouldShow() {
    var _a;
    if (!this.settings) {
      return false;
    }
    if (!this.settings.enabled) {
      return false;
    }
    if (!((_a = this.host.apiClient.auth) == null ? void 0 : _a.token)) {
      return false;
    }
    if (this.isAuthRoute()) {
      return false;
    }
    return true;
  }
  async fetchSettings() {
    var _a;
    let fetched = false;
    try {
      const res = await this.host.apiClient.request({ url: "watermarkSettings:get" });
      const data = (_a = res == null ? void 0 : res.data) == null ? void 0 : _a.data;
      if (data && typeof data === "object") {
        const opacity = Number(data.opacity);
        const fontSize = Number(data.fontSize);
        this.settings = {
          enabled: data.enabled !== false,
          text: typeof data.text === "string" && data.text ? data.text : DEFAULT_SETTINGS.text,
          opacity: Number.isFinite(opacity) ? clamp(opacity, 0.05, 1) : DEFAULT_SETTINGS.opacity,
          fontSize: Number.isFinite(fontSize) ? clamp(Math.round(fontSize), 8, 64) : DEFAULT_SETTINGS.fontSize,
          density: DENSITIES.includes(data.density) ? data.density : DEFAULT_SETTINGS.density
        };
        fetched = true;
      }
    } catch {
      this.settings = this.settings || { ...DEFAULT_SETTINGS };
    }
    this.settingsFetchedAt = Date.now();
    if (fetched) {
      this.sync();
    }
  }
  async fetchUser() {
    var _a, _b;
    try {
      const res = await this.host.apiClient.request({
        url: "auth:check",
        skipNotify: true,
        skipAuth: true
      });
      const user = (_a = res == null ? void 0 : res.data) == null ? void 0 : _a.data;
      if (user && user.id != null) {
        const name = user.nickname || user.username || user.email || String(user.id);
        if (name !== ((_b = this.user) == null ? void 0 : _b.name)) {
          this.user = { name };
          this.sync();
        }
      }
    } catch {
    }
  }
  /** 定时同步：按当前状态显示/隐藏水印，并做健康检查 */
  sync() {
    var _a;
    if (this.destroyed) {
      return;
    }
    const token = (_a = this.host.apiClient.auth) == null ? void 0 : _a.token;
    if (!token) {
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
      const expected = this.buildBackground();
      if (this.el && this.el.isConnected && this.el.style.backgroundImage === expected.image && this.el.style.backgroundSize === expected.size) {
        return;
      }
      this.render();
    } else {
      this.remove();
    }
  }
  resolveText() {
    var _a, _b;
    const template = ((_a = this.settings) == null ? void 0 : _a.text) || DEFAULT_SETTINGS.text;
    const name = ((_b = this.user) == null ? void 0 : _b.name) || "";
    const date = formatDate(/* @__PURE__ */ new Date());
    return template.replace(/\{\{user\}\}/g, name).replace(/\{user\}/g, name).replace(/\{\{date\}\}/g, date).replace(/\{date\}/g, date);
  }
  /** 根据当前设置与用户生成期望的背景样式（渲染与健康检查共用） */
  buildBackground() {
    const settings = this.settings || DEFAULT_SETTINGS;
    const gap = DENSITY_GAP[settings.density] || DENSITY_GAP.medium;
    const svg = buildWatermarkSvg({
      text: this.resolveText(),
      fontSize: settings.fontSize,
      opacity: settings.opacity,
      gap
    });
    return {
      image: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
      // 单元宽度随文字自适应，不限制文字区块宽度
      size: "auto"
    };
  }
  render() {
    this.remove();
    const { image, size } = this.buildBackground();
    const div = document.createElement("div");
    div.setAttribute(WATERMARK_ATTR, "1");
    div.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "width:100vw",
      "height:100vh",
      `z-index:${WATERMARK_Z_INDEX}`,
      "pointer-events:none",
      "overflow:hidden",
      "background-repeat:repeat",
      `background-image:${image}`,
      `background-size:${size}`
    ].join(";");
    document.body.appendChild(div);
    this.el = div;
  }
  remove() {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_SETTINGS,
  WATERMARK_SETTINGS_CHANGED_EVENT,
  WatermarkManager
});
