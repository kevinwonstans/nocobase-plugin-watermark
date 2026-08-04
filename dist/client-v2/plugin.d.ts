/**
 * v2 客户端（/v/admin/）水印插件
 */
import { Application, Plugin } from '@nocobase/client-v2';
export declare class NocobasePluginWatermarkClientV2 extends Plugin<any, Application> {
    private watermark;
    load(): Promise<void>;
}
export default NocobasePluginWatermarkClientV2;
