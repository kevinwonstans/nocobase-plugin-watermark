/**
 * 水印设置页表单（v1 / v2 客户端共用，纯 React + antd）
 * 通过 props 注入 api / t / notifySaved，避免依赖具体客户端包。
 */
import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Radio, Space, Switch, message } from 'antd';
import { DEFAULT_SETTINGS, WatermarkDensity } from './watermark';

interface ApiLike {
  request(options: { url: string; method?: string; data?: unknown }): Promise<any>;
}

interface WatermarkSettingsFormProps {
  api: ApiLike;
  t: (key: string) => string;
  /** 保存成功后通知水印运行时立即刷新 */
  notifySaved: () => void;
}

interface FormValues {
  enabled: boolean;
  text: string;
  opacity: number;
  fontSize: number;
  density: WatermarkDensity;
}

const DENSITY_OPTIONS: Array<{ value: WatermarkDensity; labelKey: string }> = [
  { value: 'sparse', labelKey: 'Sparse' },
  { value: 'medium', labelKey: 'Medium' },
  { value: 'dense', labelKey: 'Dense' },
];

export default function WatermarkSettingsForm({ api, t, notifySaved }: WatermarkSettingsFormProps) {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.request({ url: 'watermarkSettings:get' });
      const data = res?.data?.data;
      form.setFieldsValue({
        enabled: data?.enabled ?? DEFAULT_SETTINGS.enabled,
        text: data?.text ?? DEFAULT_SETTINGS.text,
        opacity: data?.opacity ?? DEFAULT_SETTINGS.opacity,
        fontSize: data?.fontSize ?? DEFAULT_SETTINGS.fontSize,
        density: data?.density ?? DEFAULT_SETTINGS.density,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFinish = async (values: FormValues) => {
    setSaving(true);
    try {
      await api.request({
        url: 'watermarkSettings:put',
        method: 'post',
        data: values,
      });
      // 通知水印运行时立即刷新
      notifySaved();
      message.success(t('Saved successfully'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title={t('Watermark Settings')}
      loading={loading}
      style={{ maxWidth: 640 }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ ...DEFAULT_SETTINGS }}
        onFinish={onFinish}
      >
        <Form.Item name="enabled" label={t('Enable watermark')} valuePropName="checked">
          <SwitchChecked />
        </Form.Item>
        <Form.Item
          name="text"
          label={t('Watermark text')}
          extra={t('Placeholder help')}
          rules={[{ required: true, message: t('Watermark text is required') }]}
        >
          <Input placeholder={`${DEFAULT_SETTINGS.text}`} maxLength={200} />
        </Form.Item>
        <Form.Item name="opacity" label={t('Watermark opacity')} rules={[{ required: true }]}>
          <InputNumber min={0.05} max={1} step={0.05} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item name="fontSize" label={t('Watermark font size')} rules={[{ required: true }]}>
          <InputNumber min={8} max={64} step={1} style={{ width: 200 }} addonAfter="px" />
        </Form.Item>
        <Form.Item name="density" label={t('Watermark density')} rules={[{ required: true }]}>
          <Radio.Group>
            <Space direction="vertical">
              {DENSITY_OPTIONS.map((option) => (
                <Radio key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            {t('Save')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

// Form.Item 使用 valuePropName="checked" 时注入的是 checked 而非 value
function SwitchChecked({ checked, onChange }: { checked?: boolean; onChange?: (value: boolean) => void }) {
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      checkedChildren="ON"
      unCheckedChildren="OFF"
    />
  );
}
