/**
 * 通知型別 — 重新匯出依通道組織之通知宣告的聚合器墊片。新程式碼應直接從
 * `types/common/` 與 `types/channels-root/` 下的個別通道檔案匯入。
 *
 * @module notifications
 */

export * from './common/notifications.js';
export * from './channels-root/notifications.js';
export * from './channels-otlp/notifications.js';
