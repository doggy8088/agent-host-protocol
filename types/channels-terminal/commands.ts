/**
 * 終端機通道指令 — `createTerminal` 與 `disposeTerminal`。
 *
 * @module channels-terminal/commands
 */

import type { URI } from '../common/state.js';
import type { BaseParams } from '../common/commands.js';
import type { TerminalClaim } from './state.js';

// ─── createTerminal ──────────────────────────────────────────────────────────

/**
 * 在伺服器上建立新的終端機。
 *
 * 建立後，用戶端應訂閱終端機 URI 以接收狀態更新。伺服器分派
 * `root/terminalsChanged` 以更新根終端機清單。
 *
 * @category Commands
 * @method createTerminal
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 */
export interface CreateTerminalParams extends BaseParams {
  /** 終端機 URI（由用戶端選擇）。 */
  channel: URI;
  /** 終端機的初始擁有者 */
  claim: TerminalClaim;
  /** 人類可讀的終端機名稱 */
  name?: string;
  /** 初始工作目錄 URI */
  cwd?: URI;
  /** 初始終端機寬度（以欄為單位） */
  cols?: number;
  /** 初始終端機高度（以列為單位） */
  rows?: number;
}

// ─── disposeTerminal ─────────────────────────────────────────────────────────

/**
 * 處置終端機，若其行程仍在執行則予以終止。
 *
 * 伺服器分派 `root/terminalsChanged` 以從根終端機清單中移除該終端機。
 *
 * @category Commands
 * @method disposeTerminal
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 */
export interface DisposeTerminalParams extends BaseParams {}
