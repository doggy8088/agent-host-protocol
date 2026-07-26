/**
 * 根通道通知 — 在 `ahp-root://` 通道上傳遞的工作階段目錄事件。
 *
 * @module channels-root/notifications
 */

import type { URI } from '../common/state.js';
import type { SessionSummary } from '../channels-session/state.js';

// ─── root/sessionAdded ───────────────────────────────────────────────────────

/**
 * 當建立新工作階段時，廣播給所有訂閱根通道的用戶端。
 *
 * @category Protocol Notifications
 * @method root/sessionAdded
 * @direction 伺服器 → 用戶端
 * @messageType Notification
 * @version 1
 * @example
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "root/sessionAdded",
 *   "params": {
 *     "channel": "ahp-root://",
 *     "summary": {
 *       "resource": "ahp-session:/<uuid>",
 *       "provider": "copilot",
 *       "title": "New Session",
 *       "status": 1,
 *       "createdAt": "2024-03-09T16:00:00.000Z",
 *       "modifiedAt": "2024-03-09T16:00:00.000Z"
 *     }
 *   }
 * }
 * ```
 */
export interface SessionAddedParams {
  /** 此通知所屬的通道 URI（根通道） */
  channel: URI;
  /** 新工作階段的摘要 */
  summary: SessionSummary;
}

// ─── root/sessionRemoved ─────────────────────────────────────────────────────

/**
 * 當工作階段被處置時，廣播給所有訂閱根通道的用戶端。
 *
 * @category Protocol Notifications
 * @method root/sessionRemoved
 * @direction 伺服器 → 用戶端
 * @messageType Notification
 * @version 1
 * @example
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "root/sessionRemoved",
 *   "params": {
 *     "channel": "ahp-root://",
 *     "session": "ahp-session:/<uuid>"
 *   }
 * }
 * ```
 */
export interface SessionRemovedParams {
  /** 此通知所屬的通道 URI（根通道） */
  channel: URI;
  /** 已移除工作階段的 URI */
  session: URI;
}

// ─── root/sessionSummaryChanged ──────────────────────────────────────────────

/**
 * 當現有工作階段的摘要變更（標題、狀態、`modifiedAt`、模型、工作目錄、已讀/完成
 * 狀態或差異統計）時，廣播給所有訂閱根通道的用戶端。
 *
 * 此通知讓維護快取工作階段清單的用戶端（例如先前 `listSessions()` 呼叫的結果）
 * 能與進行中的工作階段保持同步，而無須個別訂閱每個工作階段 URI。它是
 * `root/sessionAdded` 與 `root/sessionRemoved` 的補充，而非取代：後兩者發出
 * 生命週期（建立/處置）訊號，而此通知發出已知工作階段上的摘要層級變動訊號。
 *
 * 語意：
 *
 * - 僅存在於 `changes` 中的欄位具有新值；省略的欄位在用戶端快取的摘要中未變更。
 * - 身分識別欄位（`resource`、`provider`、`createdAt`）永不變更且不予承載。
 * - 如同所有協定通知，此通知為短暫的：它 **不** 會在重新連線時重播。在重新
 *   連線時，用戶端應如常透過 `listSessions()` 重新取得完整目錄。
 * - 每當伺服器已透過 `listSessions()` 或 `root/sessionAdded` 呈現之工作階段的
 *   {@link SessionSummary | `SessionSummary`} 上任何可變欄位變更時，伺服器
 *   SHOULD 發出此通知。伺服器 MAY 自行斟酌合併或去抖動頻繁變動欄位的更新
 *   （例如回合串流時的 `modifiedAt` 更新）。
 * - 對 `session` 沒有快取項目的用戶端 MAY 忽略此通知；它不是
 *   `root/sessionAdded` 的替代品。
 *
 * @category Protocol Notifications
 * @method root/sessionSummaryChanged
 * @direction 伺服器 → 用戶端
 * @messageType Notification
 * @version 1
 * @example
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "root/sessionSummaryChanged",
 *   "params": {
 *     "channel": "ahp-root://",
 *     "session": "ahp-session:/<uuid>",
 *     "changes": {
 *       "title": "Refactor auth middleware",
 *       "status": 8,
 *       "modifiedAt": "2024-03-09T16:02:03.456Z"
 *     }
 *   }
 * }
 * ```
 */
export interface SessionSummaryChangedParams {
  /** 此通知所屬的通道 URI（根通道） */
  channel: URI;
  /** 摘要變更之工作階段的 URI */
  session: URI;
  /**
   * 已變更的可變摘要欄位；省略的欄位未變更。
   *
   * 身分識別欄位（`resource`、`provider`、`createdAt`）永不變更且傳送者 MUST
   * 予以省略；接收者若收到 SHOULD 忽略它們。
   */
  changes: Partial<SessionSummary>;
}

// ─── progress ────────────────────────────────────────────────────────────────

/**
 * 長時間執行作業的通用進度通知。
 *
 * 用戶端透過在請求中納入 `progressToken` 來選擇加入該請求的進度（目前：
 * `createSession` 上的 `progressToken` 欄位）。若伺服器為服務該請求而執行長時間
 * 執行的工作 —— 例如在該提供者之工作階段首次具體化時，延遲下載代理程式的原生
 * SDK —— 它會發出帶有相同權杖的 `progress` 通知。
 *
 * 此通知與作業無關：它對 *什麼* 正在進展不予說明。用戶端將 `progressToken`
 * 關聯回其發起的請求（因而關聯至等待它的 UI 介面），並呈現自身本地化的指示器。
 * 同一通道可服務未來任何長時間執行的作業，而無需新的方法。
 *
 * 語意：
 *
 * - 對給定的 `progressToken`，`progress` 為單調非遞減。
 * - `total` 僅在伺服器事先知道大小（例如 `Content-Length`）時存在；缺席時
 *   用戶端 SHOULD 顯示不定指示器。
 * - 當 `progress === total` 時作業完成。伺服器 MUST 發出滿足
 *   `progress === total` 的結尾訊框；當大小從未知時，它會在該訊框上將 `total`
 *   設為最終的 `progress`。之後不會有其他訊框參照該權杖。
 * - 伺服器 MAY 完全不發出進度（例如工作已完成）；則用戶端永不顯示指示器。
 * - 如同所有通知，此通知為短暫的且 **不** 會在重新連線時重播。從未收到結尾訊框
 *   的用戶端 SHOULD 在閒置逾時後讓指示器過期。
 *
 * @category Protocol Notifications
 * @method root/progress
 * @direction 伺服器 → 用戶端
 * @messageType Notification
 * @version 1
 * @example
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "root/progress",
 *   "params": {
 *     "channel": "ahp-root://",
 *     "progressToken": "9b2c1f7e-4a0d-4e2b-8b1a-2f7e4a0d4e2b",
 *     "progress": 18874368,
 *     "total": 41957498
 *   }
 * }
 * ```
 */
export interface ProgressParams {
  /** 此通知所屬的通道 URI（根通道）。 */
  channel: URI;
  /**
   * 回應用戶端在發起請求上提供的 `progressToken`（例如 `createSession` 的
   * `progressToken` 欄位），將此訊框關聯至該呼叫。在用戶端作用中的請求間為唯一。
   */
  progressToken: string;
  /**
   * 目前為止的進度，以作業定義的單位表示（例如已接收位元組）。對給定的
   * `progressToken` 為單調非遞減。
   */
  progress: number;
  /**
   * 事先知道大小時的總計（例如來自 `Content-Length`）；省略 ⇒ 不定。一旦
   * `progress === total` 時作業即完成。
   */
  total?: number;
  /**
   * 選用的人類可讀進度訊息。用戶端擁有自身衍生自發起請求的（本地化）呈現；
   * 不追蹤權杖的通用用戶端 MAY 改為顯示此訊息。
   */
  message?: string;
}
