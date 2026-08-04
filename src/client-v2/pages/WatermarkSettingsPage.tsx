/**
 * v2 客户端（/v/admin/）水印设置页
 */
import React from 'react';
import { useApp } from '@nocobase/client-v2';
import WatermarkSettingsForm from '../../shared/WatermarkSettingsForm';
import { WATERMARK_SETTINGS_CHANGED_EVENT } from '../../shared/watermark';

const PACKAGE_NAME = 'nocobase-plugin-watermark';

export default function WatermarkSettingsPage() {
  const app = useApp();
  return (
    <WatermarkSettingsForm
      api={app.apiClient}
      t={(key: string) => app.i18n.t(key, { ns: PACKAGE_NAME })}
      notifySaved={() =>
        app.eventBus.dispatchEvent(new CustomEvent(WATERMARK_SETTINGS_CHANGED_EVENT))
      }
    />
  );
}
