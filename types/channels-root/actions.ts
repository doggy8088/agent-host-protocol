/**
 * 根通道操作 — `ahp-root://` 狀態的變動。
 *
 * @module channels-root/actions
 */

import type { AgentInfo } from './state.js';
import type { TerminalInfo } from '../channels-terminal/state.js';
import { ActionType } from '../common/actions.js';

// ─── Root Actions ────────────────────────────────────────────────────────────

/**
 * 當可用的代理程式後端或其模型變更時觸發。
 *
 * @category Root Actions
 * @version 1
 */
export interface RootAgentsChangedAction {
  type: ActionType.RootAgentsChanged;
  /** 更新後的代理程式清單 */
  agents: AgentInfo[];
}

/**
 * 當作用中工作階段的數量變更時觸發。
 *
 * @category Root Actions
 * @version 1
 */
export interface RootActiveSessionsChangedAction {
  type: ActionType.RootActiveSessionsChanged;
  /** 目前作用中工作階段的計數 */
  activeSessions: number;
}

/**
 * 當已知終端機清單變更時觸發。
 *
 * 全替換語意：`terminals` 陣列完全取代先前的 `terminals`。
 *
 * @category Root Actions
 * @version 1
 */
export interface RootTerminalsChangedAction {
  type: ActionType.RootTerminalsChanged;
  /** 更新後的終端機清單（全替換） */
  terminals: TerminalInfo[];
}

/**
 * 當代理主機組態值變更時觸發。
 *
 * 依預設，化簡器會將新值合併進 `state.config.values`。將 `replace` 設為
 * `true` 以取代所有值，而不是合併。
 *
 * @category Root Actions
 * @version 1
 * @clientDispatchable
 */
export interface RootConfigChangedAction {
  type: ActionType.RootConfigChanged;
  /** 更新後的組態值 */
  config: Record<string, unknown>;
  /** 為 `true` 時，取代所有組態值而不是合併 */
  replace?: boolean;
}
