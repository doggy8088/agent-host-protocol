/**
 * 資源監視通道指令 — `createResourceWatch`。
 *
 * @module channels-resource-watch/commands
 */

import type { URI } from '../common/state.js';
import type { BaseParams } from '../common/commands.js';

// ─── createResourceWatch ─────────────────────────────────────────────────────

/**
 * 在接收端的檔案系統上建立資源監視器。
 *
 * 接收端配置一個 `ahp-resource-watch:/<id>` 通道 URI 並
 * 於 {@link CreateResourceWatchResult.channel} 回傳。呼叫端接著
 * [`subscribe`](./subscriptions) 至該通道，以透過標準操作信封接收
 * `resourceWatch/changed` 操作。
 *
 * 監視生命週期與訂閱繫結：當每個訂閱者都已取消訂閱（或底層連線
 * 中斷）時，接收端 MUST 釋放監視器。沒有明確的 dispose 指令——
 * `unsubscribe` 是呼叫端所需的唯一控制柄。
 *
 * 如同 `resource*` 家族的其餘部分，`createResourceWatch` 是對稱的，
 * MAY 在任一方向傳送。存取透過與 `resourceRead`／`resourceWrite`
 * 相同的權限流程管制。
 *
 * @category Commands
 * @method createResourceWatch
 * @direction 用戶端 ↔ 伺服器
 * @messageType Request
 * @version 1
 * @throws `NotFound` (`-32008`) 若 `uri` 不存在。
 * @throws `PermissionDenied` (`-32009`) 若呼叫端未獲允許監視該 URI。
 * @example
 * ```jsonc
 * // Client → Server
 * { "jsonrpc": "2.0", "id": 30, "method": "createResourceWatch",
 *   "params": {
 *     "channel": "ahp-root://",
 *     "uri": "file:///workspace",
 *     "recursive": true,
 *     "excludes": { "items": ["**\u002f.git/**", "**\u002fnode_modules/**"] }
 *   } }
 *
 * // Server → Client
 * { "jsonrpc": "2.0", "id": 30, "result": {
 *   "channel": "ahp-resource-watch:/d3a9f1e0-…"
 * } }
 * ```
 */
export interface CreateResourceWatchParams extends BaseParams {
  channel: 'ahp-root://';
  /** 要監視的 URI。 */
  uri: URI;
  /**
   * 若為 `true`，接收端 MUST 回報 `uri` 後代的變更。
   * 若為 `false`（預設），僅回報 `uri` 本身的變更——且當 `uri`
   * 為目錄時，回報其直接子項。
   */
  recursive?: boolean;
  /**
   * 相對於 `uri` 的 glob 模式或路徑，用於從回報中排除。
   * 為向前相容而包裝於 `{ items }`。
   */
  excludes?: { items: string[] };
  /**
   * 相對於 `uri` 的 glob 模式或路徑，用於限制回報範圍。
   * 省略以回報 `uri` 下受 `excludes` 限制的每個變更。
   * 為向前相容而包裝於 `{ items }`。
   */
  includes?: { items: string[] };
}

/**
 * `createResourceWatch` 指令的結果。
 */
export interface CreateResourceWatchResult {
  /**
   * 接收端指派的監視通道 URI（`ahp-resource-watch:/<id>`）。
   * 呼叫端訂閱此 URI 以開始接收變更事件，並取消訂閱以釋放
   * 監視器。
   */
  channel: URI;
}
