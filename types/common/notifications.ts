/**
 * 通用通知類型 — `auth/required`，目前唯一的連線層級（非通道專屬）協定通知。
 *
 * @module common/notifications
 */

import type { URI } from './state.js';

/**
 * 要求驗證的原因。
 *
 * @category Protocol Notifications
 */
export const enum AuthRequiredReason {
  /** 用戶端尚未針對該資源進行驗證 */
  Required = 'required',
  /** 先前有效的令牌已過期或被撤銷 */
  Expired = 'expired',
}

// ─── auth/required ───────────────────────────────────────────────────────────

/**
 * 當受保護資源需要（重新）驗證時，由伺服器發送。
 *
 * 此通知 MAY 與任何通道關聯 — 例如在根通道上公告的代理程式，或是某個
 * 工作階段專屬資源。`channel` 欄位識別此驗證需求所屬的訂閱；`resource`
 * 欄位則帶有受 OAuth 保護的資源識別碼（依 RFC 9728）。
 *
 * 用戶端應取得新的令牌，並透過 `authenticate` 指令推送它。
 *
 * @category Protocol Notifications
 * @method auth/required
 * @direction 伺服器 → 用戶端
 * @messageType Notification
 * @version 1
 * @see {@link /specification/authentication | 驗證}
 * @example
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "auth/required",
 *   "params": {
 *     "channel": "ahp-root://",
 *     "resource": "https://api.github.com",
 *     "reason": "expired"
 *   }
 * }
 * ```
 */
export interface AuthRequiredParams {
  /** 此通知所屬的通道 URI */
  channel: URI;
  /** 需要驗證的受保護資源識別碼 */
  resource: string;
  /** 要求驗證的原因 */
  reason?: AuthRequiredReason;
}
