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
var plugin_exports = {};
__export(plugin_exports, {
  NocobasePluginWatermarkServer: () => NocobasePluginWatermarkServer,
  default: () => plugin_default
});
module.exports = __toCommonJS(plugin_exports);
var import_server = require("@nocobase/server");
const SETTINGS_FIELDS = ["enabled", "text", "opacity", "fontSize", "density"];
class NocobasePluginWatermarkServer extends import_server.Plugin {
  async load() {
    this.app.acl.registerSnippet({
      name: "pm.watermark.settings",
      actions: ["watermarkSettings:get", "watermarkSettings:put"]
    });
    this.app.acl.allow("watermarkSettings", "get", "loggedIn");
    this.app.resourceManager.define({
      name: "watermarkSettings",
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
        }
      }
    });
  }
  /** 过滤只允许写入的配置字段，防止注入无关数据 */
  sanitize(values) {
    const result = {};
    for (const key of SETTINGS_FIELDS) {
      if (values[key] !== void 0) {
        result[key] = values[key];
      }
    }
    return result;
  }
  async getSettings() {
    const repository = this.db.getRepository("watermarkSettings");
    let row = await repository.findOne({ filter: { id: 1 } });
    if (!row) {
      row = await repository.create({ values: { id: 1 } });
    }
    return row.toJSON();
  }
  async putSettings(values) {
    const repository = this.db.getRepository("watermarkSettings");
    const sanitized = this.sanitize(values);
    const row = await repository.findOne({ filter: { id: 1 } });
    if (row) {
      await row.update(sanitized);
    } else {
      await repository.create({ values: { id: 1, ...sanitized } });
    }
  }
}
var plugin_default = NocobasePluginWatermarkServer;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  NocobasePluginWatermarkServer
});
