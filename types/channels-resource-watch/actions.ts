/**
 * 資源監視通道操作 — 對 `ahp-resource-watch:`
 * 通道狀態的變動。
 *
 * @module channels-resource-watch/actions
 */

import { ActionType } from '../common/actions.js';
import type { ResourceChange } from './state.js';

// ─── Resource Watch Actions ──────────────────────────────────────────────────

/**
 * 監視器觀察到的一批資源變更。
 *
 * 監視事件由伺服器合併為批次，以保持操作串流易於處理；
 * 空的 `changes.items` 清單 MUST NOT 被分派。reducer 不保留變更
 * 歷史——這些操作純粹是為了將事件傳遞給訂閱者，訂閱者直接
 * 從操作串流取用並套用各自的邏輯。
 *
 * @category Resource Watch Actions
 * @version 1
 */
export interface ResourceWatchChangedAction {
  type: ActionType.ResourceWatchChanged;
  /** 此批次中的變更集合，為向前相容而包裝。 */
  changes: { items: ResourceChange[] };
}
