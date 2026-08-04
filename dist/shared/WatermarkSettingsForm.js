/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var WatermarkSettingsForm_exports = {};
__export(WatermarkSettingsForm_exports, {
  default: () => WatermarkSettingsForm
});
module.exports = __toCommonJS(WatermarkSettingsForm_exports);
var import_react = __toESM(require("react"));
var import_antd = require("antd");
var import_watermark = require("./watermark");
const DENSITY_OPTIONS = [
  { value: "sparse", labelKey: "Sparse" },
  { value: "medium", labelKey: "Medium" },
  { value: "dense", labelKey: "Dense" }
];
function WatermarkSettingsForm({ api, t, notifySaved }) {
  const [form] = import_antd.Form.useForm();
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [saving, setSaving] = (0, import_react.useState)(false);
  const load = async () => {
    var _a;
    setLoading(true);
    try {
      const res = await api.request({ url: "watermarkSettings:get" });
      const data = (_a = res == null ? void 0 : res.data) == null ? void 0 : _a.data;
      form.setFieldsValue({
        enabled: (data == null ? void 0 : data.enabled) ?? import_watermark.DEFAULT_SETTINGS.enabled,
        text: (data == null ? void 0 : data.text) ?? import_watermark.DEFAULT_SETTINGS.text,
        opacity: (data == null ? void 0 : data.opacity) ?? import_watermark.DEFAULT_SETTINGS.opacity,
        fontSize: (data == null ? void 0 : data.fontSize) ?? import_watermark.DEFAULT_SETTINGS.fontSize,
        density: (data == null ? void 0 : data.density) ?? import_watermark.DEFAULT_SETTINGS.density
      });
    } finally {
      setLoading(false);
    }
  };
  (0, import_react.useEffect)(() => {
    void load();
  }, []);
  const onFinish = async (values) => {
    setSaving(true);
    try {
      await api.request({
        url: "watermarkSettings:put",
        method: "post",
        data: values
      });
      notifySaved();
      import_antd.message.success(t("Saved successfully"));
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ import_react.default.createElement(
    import_antd.Card,
    {
      title: t("Watermark Settings"),
      loading,
      style: { maxWidth: 640 }
    },
    /* @__PURE__ */ import_react.default.createElement(
      import_antd.Form,
      {
        form,
        layout: "vertical",
        initialValues: { ...import_watermark.DEFAULT_SETTINGS },
        onFinish
      },
      /* @__PURE__ */ import_react.default.createElement(import_antd.Form.Item, { name: "enabled", label: t("Enable watermark"), valuePropName: "checked" }, /* @__PURE__ */ import_react.default.createElement(SwitchChecked, null)),
      /* @__PURE__ */ import_react.default.createElement(
        import_antd.Form.Item,
        {
          name: "text",
          label: t("Watermark text"),
          extra: t("Placeholder help"),
          rules: [{ required: true, message: t("Watermark text is required") }]
        },
        /* @__PURE__ */ import_react.default.createElement(import_antd.Input, { placeholder: `${import_watermark.DEFAULT_SETTINGS.text}`, maxLength: 200 })
      ),
      /* @__PURE__ */ import_react.default.createElement(import_antd.Form.Item, { name: "opacity", label: t("Watermark opacity"), rules: [{ required: true }] }, /* @__PURE__ */ import_react.default.createElement(import_antd.InputNumber, { min: 0.05, max: 1, step: 0.05, style: { width: 200 } })),
      /* @__PURE__ */ import_react.default.createElement(import_antd.Form.Item, { name: "fontSize", label: t("Watermark font size"), rules: [{ required: true }] }, /* @__PURE__ */ import_react.default.createElement(import_antd.InputNumber, { min: 8, max: 64, step: 1, style: { width: 200 }, addonAfter: "px" })),
      /* @__PURE__ */ import_react.default.createElement(import_antd.Form.Item, { name: "density", label: t("Watermark density"), rules: [{ required: true }] }, /* @__PURE__ */ import_react.default.createElement(import_antd.Radio.Group, null, /* @__PURE__ */ import_react.default.createElement(import_antd.Space, { direction: "vertical" }, DENSITY_OPTIONS.map((option) => /* @__PURE__ */ import_react.default.createElement(import_antd.Radio, { key: option.value, value: option.value }, t(option.labelKey)))))),
      /* @__PURE__ */ import_react.default.createElement(import_antd.Form.Item, null, /* @__PURE__ */ import_react.default.createElement(import_antd.Button, { type: "primary", htmlType: "submit", loading: saving }, t("Save")))
    )
  );
}
function SwitchChecked({ checked, onChange }) {
  return /* @__PURE__ */ import_react.default.createElement(
    import_antd.Switch,
    {
      checked,
      onChange,
      checkedChildren: "ON",
      unCheckedChildren: "OFF"
    }
  );
}
