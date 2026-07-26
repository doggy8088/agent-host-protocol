/**
 * 訊息類型 — AHP 線路協定的完整型別化 JSON-RPC 訊息定義。
 *
 * @module common/messages
 * @description 為所有 AHP 方法提供型別化的 JSON-RPC 請求、回應與通知類型。
 * 對 `method` 欄位縮窄即可得到完整型別化的 `params` 與 result 類型。
 */

import type {
  InitializeParams,
  InitializeResult,
  PingParams,
  ReconnectParams,
  ReconnectResult,
  SubscribeParams,
  SubscribeResult,
  ResourceReadParams,
  ResourceReadResult,
  ResourceWriteParams,
  ResourceWriteResult,
  ResourceListParams,
  ResourceListResult,
  ResourceCopyParams,
  ResourceCopyResult,
  ResourceDeleteParams,
  ResourceDeleteResult,
  ResourceMoveParams,
  ResourceMoveResult,
  ResourceResolveParams,
  ResourceResolveResult,
  ResourceMkdirParams,
  ResourceMkdirResult,
  ResourceRequestParams,
  ResourceRequestResult,
  UnsubscribeParams,
  DispatchActionParams,
  AuthenticateParams,
  AuthenticateResult,
} from './commands.js';
import type {
  ListSessionsParams,
  ListSessionsResult,
  ResolveSessionConfigParams,
  ResolveSessionConfigResult,
  SessionConfigCompletionsParams,
  SessionConfigCompletionsResult,
} from '../channels-root/commands.js';
import type {
  CreateSessionParams,
  DisposeSessionParams,
  FetchTurnsParams,
  FetchTurnsResult,
  CompletionsParams,
  CompletionsResult,
} from '../channels-session/commands.js';
import type {
  CreateChatParams,
  DisposeChatParams,
} from '../channels-chat/commands.js';
import type {
  CreateTerminalParams,
  DisposeTerminalParams,
} from '../channels-terminal/commands.js';
import type {
  CreateResourceWatchParams,
  CreateResourceWatchResult,
} from '../channels-resource-watch/commands.js';
import type {
  InvokeChangesetOperationParams,
  InvokeChangesetOperationResult,
} from '../channels-changeset/commands.js';

import type { ActionEnvelope } from './actions.js';
import type {
  SessionAddedParams,
  SessionRemovedParams,
  SessionSummaryChangedParams,
  ProgressParams,
} from '../channels-root/notifications.js';
import type { AuthRequiredParams } from './notifications.js';
import type {
  OtlpExportLogsParams,
  OtlpExportTracesParams,
  OtlpExportMetricsParams,
} from '../channels-otlp/notifications.js';
import type { AhpError } from './errors.js';

// ─── JSON-RPC Base Types ─────────────────────────────────────────────────────

/** JSON-RPC 請求：同時具有 `method` 與 `id`。 */
export interface JsonRpcRequest {
  readonly jsonrpc: '2.0';
  readonly id: number;
  readonly method: string;
  readonly params?: unknown;
}

/** JSON-RPC 成功回應。 */
export interface JsonRpcSuccessResponse {
  readonly jsonrpc: '2.0';
  readonly id: number;
  readonly result: unknown;
}

/** JSON-RPC 錯誤回應。 */
export interface JsonRpcErrorResponse {
  readonly jsonrpc: '2.0';
  readonly id: number;
  readonly error: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
}

/**
 * 一個型別化的 JSON-RPC 錯誤回應，其錯誤物件為完整型別化的
 * {@link AhpError}。當呼叫端知道該回應是 AHP 應用錯誤，且希望 `data` 依
 * `code` 縮窄時，此型別相當實用。
 */
export interface AhpErrorResponse {
  readonly jsonrpc: '2.0';
  readonly id: number;
  readonly error: AhpError;
}

/** JSON-RPC 回應（成功或錯誤）。 */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

/** JSON-RPC 通知：具有 `method` 但沒有 `id`。 */
export interface JsonRpcNotification {
  readonly jsonrpc: '2.0';
  readonly method: string;
  readonly params?: unknown;
}

// ─── Command Map ─────────────────────────────────────────────────────────────

/**
 * 將每個指令 method 名稱對應到其 params 與 result 類型的登錄。
 *
 * `CommandMap` 涵蓋由用戶端傳送給伺服器的 method。也可能由伺服器發起的
 * method 會重複出現在 {@link ServerCommandMap} 中；兩份對應中的項目保持一致。
 *
 * @category Commands
 */
export interface CommandMap {
  'initialize': { params: InitializeParams; result: InitializeResult };
  'ping': { params: PingParams; result: null };
  'reconnect': { params: ReconnectParams; result: ReconnectResult };
  'subscribe': { params: SubscribeParams; result: SubscribeResult };
  'createSession': { params: CreateSessionParams; result: null };
  'disposeSession': { params: DisposeSessionParams; result: null };
  'createChat': { params: CreateChatParams; result: null };
  'disposeChat': { params: DisposeChatParams; result: null };
  'createTerminal': { params: CreateTerminalParams; result: null };
  'disposeTerminal': { params: DisposeTerminalParams; result: null };
  'createResourceWatch': { params: CreateResourceWatchParams; result: CreateResourceWatchResult };
  'listSessions': { params: ListSessionsParams; result: ListSessionsResult };
  'resourceRead': { params: ResourceReadParams; result: ResourceReadResult };
  'resourceWrite': { params: ResourceWriteParams; result: ResourceWriteResult };
  'resourceList': { params: ResourceListParams; result: ResourceListResult };
  'resourceCopy': { params: ResourceCopyParams; result: ResourceCopyResult };
  'resourceDelete': { params: ResourceDeleteParams; result: ResourceDeleteResult };
  'resourceMove': { params: ResourceMoveParams; result: ResourceMoveResult };
  'resourceResolve': { params: ResourceResolveParams; result: ResourceResolveResult };
  'resourceMkdir': { params: ResourceMkdirParams; result: ResourceMkdirResult };
  'resourceRequest': { params: ResourceRequestParams; result: ResourceRequestResult };
  'fetchTurns': { params: FetchTurnsParams; result: FetchTurnsResult };
  'authenticate': { params: AuthenticateParams; result: AuthenticateResult };
  'resolveSessionConfig': { params: ResolveSessionConfigParams; result: ResolveSessionConfigResult };
  'sessionConfigCompletions': { params: SessionConfigCompletionsParams; result: SessionConfigCompletionsResult };
  'completions': { params: CompletionsParams; result: CompletionsResult };
  'invokeChangesetOperation': { params: InvokeChangesetOperationParams; result: InvokeChangesetOperationResult };
}

/**
 * 將每個伺服器 → 用戶端請求 method 對應到其 params 與 result 類型的登錄。
 *
 * `resource*` 家族是對稱的：每個出現在 {@link CommandMap} 中的 method 也會
 * 以相同的 params／result 形狀出現在此處，而無論由哪一端發起，接收端都會決定
 * 要允許、拒絕或針對所請求的操作提示使用者。主機使用反向方向來讀取用戶端發佈的
 * URI（例如 `virtual://my-client/...` 外掛），並驅動各工作階段的檔案系統提供者，
 * 而用戶端無需重新實作線路結構描述。
 *
 * @category Commands
 */
export interface ServerCommandMap {
  'resourceRead': { params: ResourceReadParams; result: ResourceReadResult };
  'resourceWrite': { params: ResourceWriteParams; result: ResourceWriteResult };
  'resourceList': { params: ResourceListParams; result: ResourceListResult };
  'resourceCopy': { params: ResourceCopyParams; result: ResourceCopyResult };
  'resourceDelete': { params: ResourceDeleteParams; result: ResourceDeleteResult };
  'resourceMove': { params: ResourceMoveParams; result: ResourceMoveResult };
  'resourceResolve': { params: ResourceResolveParams; result: ResourceResolveResult };
  'resourceMkdir': { params: ResourceMkdirParams; result: ResourceMkdirResult };
  'resourceRequest': { params: ResourceRequestParams; result: ResourceRequestResult };
  'createResourceWatch': { params: CreateResourceWatchParams; result: CreateResourceWatchResult };
}

// ─── Notification Maps ───────────────────────────────────────────────────────

/**
 * 將每個用戶端 → 伺服器通知 method 對應到其 params 類型的登錄。
 *
 * 每個通知的 params MUST 帶有頂層的 `channel: URI`，以便伺服器能將訊息路由到
 * 正確的訂閱。關於標準的「基底」形狀，請參見 {@link UnsubscribeParams}。
 *
 * @category Notifications
 */
export interface ClientNotificationMap {
  'unsubscribe': { params: UnsubscribeParams };
  'dispatchAction': { params: DispatchActionParams };
}

/**
 * 將每個伺服器 → 用戶端通知 method 對應到其 params 類型的登錄。
 *
 * 每個通知的 params MUST 帶有頂層的 `channel: URI`，以便用戶端能將訊息分派到
 * 正確的訂閱。
 *
 * @category Notifications
 */
export interface ServerNotificationMap {
  'action': { params: ActionEnvelope };
  'root/sessionAdded': { params: SessionAddedParams };
  'root/sessionRemoved': { params: SessionRemovedParams };
  'root/sessionSummaryChanged': { params: SessionSummaryChangedParams };
  'root/progress': { params: ProgressParams };
  'auth/required': { params: AuthRequiredParams };
  'otlp/exportLogs': { params: OtlpExportLogsParams };
  'otlp/exportTraces': { params: OtlpExportTracesParams };
  'otlp/exportMetrics': { params: OtlpExportMetricsParams };
}

// ─── Typed Requests ──────────────────────────────────────────────────────────

/**
 * 針對特定 AHP 指令的完整型別化 JSON-RPC 請求。
 *
 * 當作為聯集使用時（預設泛型），對 `method` 縮窄即可得到型別化的 `params`：
 *
 * ```ts
 * function handle(req: AhpRequest) {
 *   if (req.method === 'fetchTurns') {
 *     req.params.session; // typed as URI
 *   }
 * }
 * ```
 *
 * 預設為用戶端 → 伺服器請求（{@link CommandMap}）。請使用
 * {@link AhpServerRequest} 來處理伺服器 → 用戶端請求。
 */
export type AhpRequest<M extends keyof CommandMap = keyof CommandMap> =
  M extends unknown ? {
    readonly jsonrpc: '2.0';
    readonly id: number;
    readonly method: M;
    readonly params: CommandMap[M]['params'];
  } : never;

/**
 * 由伺服器發起的完整型別化 JSON-RPC 請求。形狀與 {@link AhpRequest} 相同，
 * 但以 {@link ServerCommandMap} 參數化。
 */
export type AhpServerRequest<M extends keyof ServerCommandMap = keyof ServerCommandMap> =
  M extends unknown ? {
    readonly jsonrpc: '2.0';
    readonly id: number;
    readonly method: M;
    readonly params: ServerCommandMap[M]['params'];
  } : never;

// ─── Typed Responses ─────────────────────────────────────────────────────────

/**
 * 針對特定 AHP 指令的完整型別化 JSON-RPC 成功回應。
 *
 * 由於 JSON-RPC 回應不帶有 `method`，當您從關聯的請求得知 method 時，
 * 請搭配明確的泛型參數使用此型別：
 *
 * ```ts
 * const result: AhpSuccessResponse<'listSessions'> = ...;
 * result.result.items; // typed as SessionSummary[]
 * ```
 */
export type AhpSuccessResponse<M extends keyof CommandMap = keyof CommandMap> =
  M extends unknown ? {
    readonly jsonrpc: '2.0';
    readonly id: number;
    readonly result: CommandMap[M]['result'];
  } : never;

/** 型別化的 JSON-RPC 回應（帶有已知 result 類型的成功回應，或錯誤回應）。 */
export type AhpResponse<M extends keyof CommandMap = keyof CommandMap> =
  | AhpSuccessResponse<M>
  | JsonRpcErrorResponse;

/**
 * 針對伺服器 → 用戶端請求（{@link ServerCommandMap}）的完整型別化
 * JSON-RPC 成功回應。
 */
export type AhpServerSuccessResponse<M extends keyof ServerCommandMap = keyof ServerCommandMap> =
  M extends unknown ? {
    readonly jsonrpc: '2.0';
    readonly id: number;
    readonly result: ServerCommandMap[M]['result'];
  } : never;

/** 針對伺服器 → 用戶端請求的型別化 JSON-RPC 回應。 */
export type AhpServerResponse<M extends keyof ServerCommandMap = keyof ServerCommandMap> =
  | AhpServerSuccessResponse<M>
  | JsonRpcErrorResponse;

// ─── Typed Notifications ─────────────────────────────────────────────────────

/** 用戶端 → 伺服器通知。 */
export type AhpClientNotification<M extends keyof ClientNotificationMap = keyof ClientNotificationMap> =
  M extends unknown ? {
    readonly jsonrpc: '2.0';
    readonly method: M;
    readonly params: ClientNotificationMap[M]['params'];
  } : never;

/** 伺服器 → 用戶端通知。 */
export type AhpServerNotification<M extends keyof ServerNotificationMap = keyof ServerNotificationMap> =
  M extends unknown ? {
    readonly jsonrpc: '2.0';
    readonly method: M;
    readonly params: ServerNotificationMap[M]['params'];
  } : never;

/**
 * 完整型別化的 JSON-RPC 通知 — 任一方向皆可。
 *
 * 用戶端 → 伺服器的 `dispatchAction` method 與伺服器 → 用戶端的
 * `action` method 是登錄中兩個不同的項目；其 params 具有不相關的形狀
 *（{@link DispatchActionParams} 與 {@link ActionEnvelope}）。
 */
export type AhpNotification = AhpClientNotification | AhpServerNotification;

// ─── Protocol Message Union ──────────────────────────────────────────────────

/**
 * 所有 AHP 協定訊息的判別聯集。
 *
 * 使用標準 JSON-RPC 結構來縮窄：
 * - 帶有 `method` + `id` → 請求（{@link AhpRequest} 或 {@link AhpServerRequest}）
 * - 帶有 `method`、無 `id` → 通知（{@link AhpNotification}）
 * - 帶有 `result` 或 `error` + `id` → 回應（{@link AhpResponse}）
 *
 * 接著對 `method` 縮窄以取得完整型別化的 params：
 *
 * ```ts
 * function dispatch(msg: ProtocolMessage) {
 *   if ('method' in msg && 'id' in msg) {
 *     // msg is AhpRequest | AhpServerRequest
 *     if (msg.method === 'fetchTurns') {
 *       msg.params.session; // URI
 *     }
 *   }
 * }
 * ```
 */
export type ProtocolMessage =
  | AhpRequest
  | AhpServerRequest
  | AhpSuccessResponse
  | AhpServerSuccessResponse
  | JsonRpcErrorResponse
  | AhpNotification;
