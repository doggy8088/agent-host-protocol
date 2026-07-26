/**
 * 終端機通道操作 — 對 `ahp-terminal:` 通道狀態的變動。
 *
 * @module channels-terminal/actions
 */

import { ActionType } from '../common/actions.js';
import type { URI } from '../common/state.js';
import type { TerminalClaim } from './state.js';

// ─── Terminal Actions ────────────────────────────────────────────────────────

/**
 * 終端機輸出資料（pty → 用戶端方向）。
 *
 * 在 reducer 中將 `data` 附加到終端機的 `content`。
 *
 * `terminal/data` 與 `terminal/input` 是刻意分開的操作，因為標準的
 * 預寫入協調對終端機 I/O 並不安全。pty 是有狀態、可變動的行程 —
 * 樂觀地套用輸入或預測輸出會產生不正確的狀態。相反地，`terminal/input`
 * 是僅具副作用的操作（用戶端 → 伺服器 → pty），而 `terminal/data` 是
 * 伺服器權威的輸出（pty → 伺服器 → 用戶端）。
 *
 * @category Terminal Actions
 * @version 1
 */
export interface TerminalDataAction {
  type: ActionType.TerminalData;
  /** 輸出資料（可能包含 ANSI 逸出序列） */
  data: string;
}

/**
 * 傳送給終端機行程的鍵盤輸入（用戶端 → pty 方向）。
 *
 * 這是僅具副作用的操作：伺服器將資料轉送到終端機的 pty。reducer 將此
 * 視為 no-op，因為 `terminal/data` 操作會反映任何產生的輸出。
 *
 * 關於這兩個操作為何保持分開，請參見 `terminal/data`。
 *
 * @category Terminal Actions
 * @version 1
 * @clientDispatchable
 */
export interface TerminalInputAction {
  type: ActionType.TerminalInput;
  /** 要傳送給 pty 的輸入資料 */
  data: string;
}

/**
 * 終端機尺寸已變更。
 *
 * 可由用戶端分派以請求調整大小，或由伺服器分派以告知用戶端實際的
 * 終端機尺寸。
 *
 * @category Terminal Actions
 * @version 1
 * @clientDispatchable
 */
export interface TerminalResizedAction {
  type: ActionType.TerminalResized;
  /** 終端機寬度（以欄為單位） */
  cols: number;
  /** 終端機高度（以列為單位） */
  rows: number;
}

/**
 * 終端機聲明已變更。用戶端或工作階段轉移終端機的所有權。
 *
 * 若分派的用戶端目前未持有聲明，伺服器 SHOULD 拒絕。
 *
 * @category Terminal Actions
 * @version 1
 * @clientDispatchable
 */
export interface TerminalClaimedAction {
  type: ActionType.TerminalClaimed;
  /** 新的聲明 */
  claim: TerminalClaim;
}

/**
 * 終端機標題已變更。
 *
 * 當終端機行程更新其標題（例如透過逸出序列）時由伺服器引發，
 * 或由用戶端分派以重新命名終端機。
 *
 * @category Terminal Actions
 * @version 1
 * @clientDispatchable
 */
export interface TerminalTitleChangedAction {
  type: ActionType.TerminalTitleChanged;
  /** 新的終端機標題 */
  title: string;
}

/**
 * 終端機工作目錄已變更。
 *
 * @category Terminal Actions
 * @version 1
 */
export interface TerminalCwdChangedAction {
  type: ActionType.TerminalCwdChanged;
  /** 新的工作目錄 */
  cwd: URI;
}

/**
 * 終端機行程已結束。
 *
 * @category Terminal Actions
 * @version 1
 */
export interface TerminalExitedAction {
  type: ActionType.TerminalExited;
  /** 行程結束代碼。若行程被終止而未產生結束代碼則為 `undefined`。 */
  exitCode?: number;
}

/**
 * 終端機回捲緩衝區已清除。
 *
 * @category Terminal Actions
 * @version 1
 * @clientDispatchable
 */
export interface TerminalClearedAction {
  type: ActionType.TerminalCleared;
}

/**
 * shell 整合已載入，終端機現在支援指令偵測。當 shell 整合變為可用時
 * （這可能在終端機建立後非同步地發生），伺服器會分派此操作。
 *
 * 在收到此操作（或 `terminal/commandExecuted`）之前，用戶端 MUST NOT
 * 假設指令偵測可用。
 *
 * @category Terminal Actions
 * @version 1
 */
export interface TerminalCommandDetectionAvailableAction {
  type: ActionType.TerminalCommandDetectionAvailable;
}

/**
 * 指令已提交給 shell 並正在執行。
 * 所有後續的 `terminal/data` 操作（直到對應的
 * `terminal/commandFinished`）構成此指令的輸出。
 *
 * @category Terminal Actions
 * @version 1
 */
export interface TerminalCommandExecutedAction {
  type: ActionType.TerminalCommandExecuted;
  /**
   * 此指令的穩定識別碼，範圍限定於終端機 URI。
   * 允許將 `commandExecuted` → `commandFinished` 配對關聯起來。
   */
  commandId: string;
  /** 已提交的命令列文字 */
  commandLine: string;
  /**
   * 指令開始執行時的 Unix 時間戳記（毫秒），於伺服器端量測。
   */
  timestamp: number;
}

/**
 * 指令已完成執行。
 *
 * 在先前的 `terminal/commandExecuted`（相同 `commandId`）與此操作
 * 之間的 `terminal/data` 操作序列，構成該指令的完整輸出。
 *
 * @category Terminal Actions
 * @version 1
 */
export interface TerminalCommandFinishedAction {
  type: ActionType.TerminalCommandFinished;
  /** 與對應的 `commandExecuted` 之 `commandId` 相符 */
  commandId: string;
  /** shell 結束代碼。若 shell 未回報則為 `undefined`。 */
  exitCode?: number;
  /**
   * 指令的實際耗時（毫秒），由伺服器端的 shell 整合指令稿量測。
   */
  durationMs?: number;
}
