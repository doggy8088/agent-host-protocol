/**
 * 操作型別 — 重新匯出依通道組織之操作宣告的聚合器墊片。新程式碼應直接從
 * `types/common/`、`types/channels-root/`、`types/channels-session/`、
 * `types/channels-terminal/` 與 `types/channels-changeset/` 下的個別通道檔案匯入。
 *
 * @module actions
 */

export * from './common/actions.js';
export * from './channels-root/actions.js';
export * from './channels-session/actions.js';
export * from './channels-chat/actions.js';
export * from './channels-terminal/actions.js';
export * from './channels-changeset/actions.js';
export * from './channels-annotations/actions.js';
export * from './channels-resource-watch/actions.js';
