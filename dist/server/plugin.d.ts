import { Plugin } from '@nocobase/server';
/**
 * 水印插件服务端
 *
 * - 提供 watermarkSettings 单例配置的读取（get）与保存（put）接口
 * - get 允许已登录用户访问（客户端渲染水印需要读取配置）
 * - put 仅管理员可访问（snippet: pm.watermark.settings）
 */
export declare class NocobasePluginWatermarkServer extends Plugin {
    load(): Promise<void>;
    /** 过滤只允许写入的配置字段，防止注入无关数据 */
    private sanitize;
    private getSettings;
    private putSettings;
}
export default NocobasePluginWatermarkServer;
