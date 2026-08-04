import { defineCollection } from '@nocobase/database';

/**
 * 水印插件配置（单例表，id 固定为 1）
 */
export default defineCollection({
  name: 'watermarkSettings',
  dumpRules: 'required',
  fields: [
    {
      type: 'boolean',
      name: 'enabled',
      defaultValue: true,
    },
    {
      type: 'string',
      name: 'text',
      defaultValue: '{{user}} {{date}}',
    },
    {
      type: 'double',
      name: 'opacity',
      defaultValue: 0.15,
    },
    {
      type: 'integer',
      name: 'fontSize',
      defaultValue: 16,
    },
    {
      type: 'string',
      name: 'density',
      defaultValue: 'medium',
    },
  ],
});
