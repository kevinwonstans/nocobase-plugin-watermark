/**
 * 水印设置页表单（v1 / v2 客户端共用，纯 React + antd）
 * 通过 props 注入 api / t / notifySaved，避免依赖具体客户端包。
 */
import React from 'react';
interface ApiLike {
    request(options: {
        url: string;
        method?: string;
        data?: unknown;
    }): Promise<any>;
}
interface WatermarkSettingsFormProps {
    api: ApiLike;
    t: (key: string) => string;
    /** 保存成功后通知水印运行时立即刷新 */
    notifySaved: () => void;
}
export default function WatermarkSettingsForm({ api, t, notifySaved }: WatermarkSettingsFormProps): React.JSX.Element;
export {};
