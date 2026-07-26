/**
 * 狀態型別 — 重新匯出依通道組織之狀態宣告的聚合器墊片。新程式碼應直接從
 * `types/common/`、`types/channels-root/`、`types/channels-session/`、
 * `types/channels-terminal/` 與 `types/channels-changeset/` 下的個別通道檔案匯入。
 *
 * @module state
 */

export * from './common/state.js';
export * from './channels-root/state.js';
export * from './channels-session/state.js';
export * from './channels-chat/state.js';
export * from './channels-terminal/state.js';
export * from './channels-changeset/state.js';
export * from './channels-annotations/state.js';
export * from './channels-otlp/state.js';
export * from './channels-resource-watch/state.js';
