/**
 * v2 客户端（/v/admin/）水印插件
 */
import { Application, Plugin } from '@nocobase/client-v2';
import { WatermarkHost, WatermarkManager } from '../shared/watermark';

export class NocobasePluginWatermarkClientV2 extends Plugin<any, Application> {
  private watermark: WatermarkManager | null = null;

  async load() {
    // 全局水印运行时（纯 DOM，v1 / v2 共用同一实现）
    this.watermark = new WatermarkManager(this.app as unknown as WatermarkHost);
    this.watermark.start();

    // i18next 的 t() 类型嵌套过深（TS2589），此处桥接为宽松类型
    const i18n = this.app.i18n as any;
    const t = (key: string) => i18n.t(key, { ns: this.options?.packageName || 'nocobase-plugin-watermark' });

    // 注册设置菜单与页面（/v/admin/settings/watermark）
    this.pluginSettingsManager.addMenuItem({
      key: 'watermark',
      title: t('Watermark'),
      icon: 'SafetyCertificateOutlined',
      aclSnippet: 'pm.watermark.settings',
    });
    this.pluginSettingsManager.addPageTabItem({
      menuKey: 'watermark',
      key: 'index',
      title: t('Watermark Settings'),
      componentLoader: () => import('./pages/WatermarkSettingsPage'),
    });
  }
}

export default NocobasePluginWatermarkClientV2;
