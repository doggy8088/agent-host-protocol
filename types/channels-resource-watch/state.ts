/**
 * 資源監視通道狀態類型 — 於 `ahp-resource-watch:` 通道公開的
 * 每監視狀態。
 *
 * @module channels-resource-watch/state
 */

import type { URI } from '../common/state.js';

// ─── Resource Watch Types ────────────────────────────────────────────────────

/**
 * 單一資源監視的完整狀態，於用戶端訂閱 `ahp-resource-watch:`
 * URI 時回傳。
 *
 * 監視器本身是無狀態的：監視器的存在是為了傳遞
 * {@link ResourceWatchChangedAction} 事件。狀態僅攜帶被監視
 * 內容的描述子，讓重新訂閱的用戶端能在重新連線後恢復監視
 * 設定。
 *
 * @category Resource Watch Types
 */
export interface ResourceWatchState {
  /**
   * 被監視的 URI。對於遞迴監視，這是子樹的根；對於非遞迴
   * 監視，這是單一檔案或目錄。
   */
  root: URI;
  /**
   * 若監視器回報 `root` 後代的變更則為 `true`；
   * 若僅回報 `root` 本身的變更（且當 `root` 為目錄時，其直接
   * 子項）則為 `false`。
   */
  recursive: boolean;
  /**
   * 選用的 glob 模式或相對於 `root` 的路徑，用於從變更回報中
   * 排除。
   */
  excludes?: { items: string[] };
  /**
   * 選用的 glob 模式或相對於 `root` 的路徑，用於限制變更回報
   * 範圍。省略以回報 `root` 下受 `excludes` 限制的每個變更。
   */
  includes?: { items: string[] };
}

// ─── Resource Change ─────────────────────────────────────────────────────────

/**
 * {@link ResourceChange.type} 的判別欄位。
 *
 * @category Resource Watch Types
 */
export const enum ResourceChangeType {
  Added = 'added',
  Updated = 'updated',
  Deleted = 'deleted',
}

/**
 * 資源監視器觀察到的單一變更。
 *
 * @category Resource Watch Types
 */
export interface ResourceChange {
  /** 變更之資源的 URI。 */
  uri: URI;
  /** 觀察到的變更類型。 */
  type: ResourceChangeType;
}
