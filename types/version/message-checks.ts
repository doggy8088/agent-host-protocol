/**
 * 訊息對應窮盡檢查 — 編譯時期驗證 messages.ts 中的指令與通知
 * 對應與實際的方法定義保持同步，且每個指令與通知皆攜帶頂層
 * `channel: URI`。
 *
 * 若方法加入 commands.ts 或 notifications.ts 但未註冊於對應中
 * （或反之），編譯器會在此顯示錯誤。若任何指令或通知的 params
 * 形狀缺少 `channel: URI`，編譯器也會顯示錯誤。
 *
 * @module version/message-checks
 */

import type {
  CommandMap,
  ClientNotificationMap,
  ServerNotificationMap,
  ServerCommandMap,
} from '../messages.js';
import type { BaseParams } from '../commands.js';
import type { URI } from '../state.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type _Exact<A, B> = [A] extends [B] ? [B] extends [A] ? true : never : never;

/**
 * 若 `M` 中每個項目都有擴充 {@link BaseParams} 的 params
 * （即攜帶頂層 `channel: URI`）則解析為 `true`。任何違規的鍵
 * 會被對應為 `never`，因此最終聯集求值為 `never`，而下方的
 * 斷言編譯失敗。
 */
type _AllParamsHaveChannel<M> = {
  [K in keyof M]: M[K] extends { params: BaseParams } ? true : never;
}[keyof M];

/**
 * 與 {@link _AllParamsHaveChannel} 相同，但用於 params 不需
 * 直接擴充 `BaseParams` 的通知對應——僅需有 `channel: URI`
 * 欄位。通知持續使用結構檢查，讓外部產生者（例如 `action`
 * 信封）不需要匯入 `BaseParams`。
 */
type _AllNotificationParamsHaveChannel<M> = {
  [K in keyof M]: M[K] extends { params: { channel: URI } } ? true : never;
}[keyof M];

// ─── Expected Method Names ───────────────────────────────────────────────────

/** commands.ts 中所有標註 `@messageType Request` 的方法。 */
type _ExpectedCommands =
  | 'initialize'
  | 'ping'
  | 'reconnect'
  | 'subscribe'
  | 'createSession'
  | 'disposeSession'
  | 'createChat'
  | 'disposeChat'
  | 'createTerminal'
  | 'disposeTerminal'
  | 'createResourceWatch'
  | 'listSessions'
  | 'resourceRead'
  | 'resourceWrite'
  | 'resourceList'
  | 'resourceCopy'
  | 'resourceDelete'
  | 'resourceMove'
  | 'resourceResolve'
  | 'resourceMkdir'
  | 'resourceRequest'
  | 'fetchTurns'
  | 'authenticate'
  | 'resolveSessionConfig'
  | 'sessionConfigCompletions'
  | 'completions'
  | 'invokeChangesetOperation';

/** 所有標註 `@messageType Notification` 的方法（用戶端 → 伺服器）。 */
type _ExpectedClientNotifications =
  | 'unsubscribe'
  | 'dispatchAction';

/** 所有伺服器 → 用戶端通知方法。 */
type _ExpectedServerNotifications =
  | 'action'
  | 'root/sessionAdded'
  | 'root/sessionRemoved'
  | 'root/sessionSummaryChanged'
  | 'root/progress'
  | 'auth/required'
  | 'otlp/exportLogs'
  | 'otlp/exportTraces'
  | 'otlp/exportMetrics';

/** 所有伺服器 → 用戶端請求方法。 */
type _ExpectedServerCommands =
  | 'resourceRead'
  | 'resourceWrite'
  | 'resourceList'
  | 'resourceCopy'
  | 'resourceDelete'
  | 'resourceMove'
  | 'resourceResolve'
  | 'resourceMkdir'
  | 'resourceRequest'
  | 'createResourceWatch';

// ─── Assertions ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _CheckCommandMapKeys = _Exact<keyof CommandMap, _ExpectedCommands>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _CheckClientNotificationMapKeys = _Exact<keyof ClientNotificationMap, _ExpectedClientNotifications>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _CheckServerNotificationMapKeys = _Exact<keyof ServerNotificationMap, _ExpectedServerNotifications>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _CheckServerCommandMapKeys = _Exact<keyof ServerCommandMap, _ExpectedServerCommands>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _CheckClientNotificationsHaveChannel = _AllNotificationParamsHaveChannel<ClientNotificationMap> extends true ? true : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _CheckServerNotificationsHaveChannel = _AllNotificationParamsHaveChannel<ServerNotificationMap> extends true ? true : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _CheckCommandsHaveChannel = _AllParamsHaveChannel<CommandMap> extends true ? true : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _CheckServerCommandsHaveChannel = _AllParamsHaveChannel<ServerCommandMap> extends true ? true : never;
