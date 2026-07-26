/**
 * 通用 reducer 輔助工具 — 各通道 reducer 所共用的公用程式（`softAssertNever`、
 * 分派驗證）。
 *
 * @module common/reducer-helpers
 */

import type {
  RootAction,
  ClientRootAction,
  SessionAction,
  ClientSessionAction,
  TerminalAction,
  ClientTerminalAction,
  ChangesetAction,
  ClientChangesetAction,
  AnnotationsAction,
  ClientAnnotationsAction,
} from '../action-origin.generated.js';
import { IS_CLIENT_DISPATCHABLE } from '../action-origin.generated.js';

/**
 * 用於窮盡性檢查的軟斷言。置於對判別聯集進行 switch 的 `default` 分支中，
 * 如此一來當新增了未處理的變體時，編譯器會報錯。
 *
 * 在執行時期，會記錄警告而非拋出例外，這樣向前相容的用戶端在接收來自較新伺服器的
 * 未知操作時，能夠優雅地降級。
 */
export function softAssertNever(value: never, log?: (msg: string) => void): void {
  const msg = `Unhandled action type: ${JSON.stringify(value)}`;
  (log ?? console.warn)(msg);
}

// ─── Dispatch Validation ─────────────────────────────────────────────────────

/**
 * 型別守衛，檢查某個操作是否可由用戶端分派。
 *
 * 伺服器 SHOULD 呼叫此函式來驗證傳入的 `dispatchAction` 請求，
 * 並拒絕任何用戶端不允許發起的操作。
 */
export function isClientDispatchable(action: RootAction | SessionAction | TerminalAction | ChangesetAction | AnnotationsAction): action is ClientRootAction | ClientSessionAction | ClientTerminalAction | ClientChangesetAction | ClientAnnotationsAction {
  return IS_CLIENT_DISPATCHABLE[action.type];
}
