/**
 * v1 客户端（/admin/）水印插件
 */
import { Plugin } from '@nocobase/client';
export declare class NocobasePluginWatermarkClient extends Plugin {
    private watermark;
    load(): Promise<void>;
}
export default NocobasePluginWatermarkClient;
