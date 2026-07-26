/**
 * 化簡函式 — 重新匯出依通道組織之純狀態化簡器與分派輔助函式的聚合器墊片。
 *
 * @module reducers
 */

export { rootReducer } from './channels-root/reducer.js';
export { sessionReducer } from './channels-session/reducer.js';
export { chatReducer } from './channels-chat/reducer.js';
export { terminalReducer } from './channels-terminal/reducer.js';
export { changesetReducer } from './channels-changeset/reducer.js';
export { annotationsReducer } from './channels-annotations/reducer.js';
export { resourceWatchReducer } from './channels-resource-watch/reducer.js';
export { softAssertNever, isClientDispatchable } from './common/reducer-helpers.js';
