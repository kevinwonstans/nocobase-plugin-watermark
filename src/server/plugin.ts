import { Plugin } from '@nocobase/server';

const SETTINGS_FIELDS = ['enabled', 'text', 'opacity', 'fontSize', 'density'] as const;

/**
 * 水印插件服务端
 *
 * - 提供 watermarkSettings 单例配置的读取（get）与保存（put）接口
 * - get 允许已登录用户访问（客户端渲染水印需要读取配置）
 * - put 仅管理员可访问（snippet: pm.watermark.settings）
 */
export class NocobasePluginWatermarkServer extends Plugin {
  async load() {
    this.app.acl.registerSnippet({
      name: 'pm.watermark.settings',
      actions: ['watermarkSettings:get', 'watermarkSettings:put'],
    });

    // 客户端登录后需要读取水印配置
    this.app.acl.allow('watermarkSettings', 'get', 'loggedIn');

    this.app.resourceManager.define({
      name: 'watermarkSettings',
      actions: {
        get: async (ctx, next) => {
          ctx.body = await this.getSettings();
          await next();
        },
        put: async (ctx, next) => {
          const values = ctx.action.params.values || {};
          await this.putSettings(values);
          ctx.body = await this.getSettings();
          await next();
        },
      },
    });
  }

  /** 过滤只允许写入的配置字段，防止注入无关数据 */
  private sanitize(values: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of SETTINGS_FIELDS) {
      if (values[key] !== undefined) {
        result[key] = values[key];
      }
    }
    return result;
  }

  private async getSettings() {
    const repository = this.db.getRepository('watermarkSettings');
    let row = await repository.findOne({ filter: { id: 1 } });
    if (!row) {
      row = await repository.create({ values: { id: 1 } });
    }
    return row.toJSON();
  }

  private async putSettings(values: Record<string, unknown>) {
    const repository = this.db.getRepository('watermarkSettings');
    const sanitized = this.sanitize(values);
    const row = await repository.findOne({ filter: { id: 1 } });
    if (row) {
      await row.update(sanitized);
    } else {
      await repository.create({ values: { id: 1, ...sanitized } });
    }
  }
}

export default NocobasePluginWatermarkServer;
