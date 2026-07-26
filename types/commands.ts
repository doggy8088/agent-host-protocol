/**
 * 指令型別 — 重新匯出依通道組織之指令宣告的聚合器墊片。新程式碼應直接從
 * `types/common/`、`types/channels-root/`、`types/channels-session/`、
 * `types/channels-terminal/` 與 `types/channels-changeset/` 下的個別通道檔案匯入。
 *
 * @module commands
 */

export * from './common/commands.js';
export * from './channels-root/commands.js';
export * from './channels-session/commands.js';
export * from './channels-chat/commands.js';
export * from './channels-terminal/commands.js';
export * from './channels-changeset/commands.js';
export * from './channels-resource-watch/commands.js';
