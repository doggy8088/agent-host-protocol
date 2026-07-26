/**
 * 根通道指令 — `listSessions`、`resolveSessionConfig` 與
 * `sessionConfigCompletions`。這些指令雖描述每個工作階段的中繼資料，但其目標為
 * `ahp-root://`。
 *
 * @module channels-root/commands
 */

import type { URI } from '../common/state.js';
import type { BaseParams, PaginatedParams, PaginatedResult } from '../common/commands.js';
import type { SessionSummary, SessionConfigSchema } from '../channels-session/state.js';

// Re-export schema types so the legacy `commands.ts` aggregator continues to
// expose them from the same import path.
export type { ConfigPropertySchema, ConfigSchema } from '../common/state.js';
export type { SessionConfigPropertySchema, SessionConfigSchema } from '../channels-session/state.js';

// ─── listSessions ────────────────────────────────────────────────────────────

/**
 * 傳回工作階段摘要的清單。用於填入工作階段清單與側邊欄。
 *
 * 工作階段清單 **不** 是狀態樹的一部分，因為它可能任意龐大。用戶端以命令式
 * 方式取得它，並維護一個由 `root/sessionAdded` 與 `root/sessionRemoved` 通知
 * 更新的本機快取。
 *
 * 大型目錄可透過 {@link PaginatedParams} 的 `limit`/`cursor` 輸入以漸進方式取得
 * （完整的分頁合約請參見該型別）。伺服器 SHOULD 先傳回最近修改的項目，使第一頁
 * 成為立即可用的一頁。`root/session*` 通知讓已取得的頁面保持最新；分頁僅控管
 * 初始與回填的取得。
 *
 * @category Commands
 * @method listSessions
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 * @example
 * ```jsonc
 * // Client → Server (fetch the first page of up to 50 sessions)
 * { "jsonrpc": "2.0", "id": 4, "method": "listSessions",
 *   "params": { "channel": "ahp-root://", "limit": 50 } }
 *
 * // Server → Client (a cursor signals more entries exist)
 * { "jsonrpc": "2.0", "id": 4, "result": {
 *   "items": [ { "id": "s1", ... }, { "id": "s2", ... } ],
 *   "nextCursor": "eyJvIjo1MH0="
 * }}
 *
 * // Client → Server (fetch the next page)
 * { "jsonrpc": "2.0", "id": 5, "method": "listSessions",
 *   "params": { "channel": "ahp-root://", "limit": 50, "cursor": "eyJvIjo1MH0=" } }
 * ```
 */
export interface ListSessionsParams extends BaseParams, PaginatedParams {
  channel: 'ahp-root://';
}

/** `listSessions` 指令的結果。 */
export interface ListSessionsResult extends PaginatedResult {
  /**
   * 工作階段摘要的清單。伺服器 SHOULD 將其以最近修改優先排序。
   */
  items: SessionSummary[];
}

// ─── resolveSessionConfig ────────────────────────────────────────────────────

/**
 * 反覆解析工作階段組態結構描述。用戶端傳送目前的部分工作階段組態與任何
 * 使用者填入的中繼資料值。伺服器傳回一個屬性結構描述，說明在目前選取的脈絡
 * 下還需要哪些額外中繼資料。
 *
 * 每當使用者變更重大輸入（例如挑選工作目錄、切換屬性）時，用戶端就會呼叫此
 * 指令。每次回應都會傳回完整的目前屬性集合（而非差異）。所傳回的 `values`
 * 包含伺服器解析後的預設值，以傳遞給 `createSession`。
 *
 * @category Commands
 * @method resolveSessionConfig
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 * @example
 * ```jsonc
 * // Step 1: Client picks a working directory
 * // Client → Server
 * { "jsonrpc": "2.0", "id": 5, "method": "resolveSessionConfig",
 *   "params": { "workingDirectory": "file:///home/user/my-project" } }
 *
 * // Server → Client (git repo detected, offers worktree option)
 * { "jsonrpc": "2.0", "id": 5, "result": {
 *   "schema": {
 *     "type": "object",
 *     "properties": {
 *       "target": { "type": "string", "title": "Target", "enum": ["workspace", "worktree"] }
 *     }
 *   },
 *   "values": {}
 * }}
 *
 * // Step 2: User enables worktree
 * // Client → Server
 * { "jsonrpc": "2.0", "id": 6, "method": "resolveSessionConfig",
 *   "params": { "workingDirectory": "file:///home/user/my-project",
 *               "config": { "target": "worktree" } } }
 *
 * // Server → Client (now requires branch selection)
 * { "jsonrpc": "2.0", "id": 6, "result": {
 *   "schema": {
 *     "type": "object",
 *     "properties": {
 *       "target": { "type": "string", "title": "Target", "enum": ["workspace", "worktree"] },
 *       "baseBranch": { "type": "string", "title": "Base Branch",
 *                       "enum": ["main", "develop"],
 *                       "enumLabels": ["main", "develop"] }
 *     },
 *     "required": ["baseBranch"]
 *   },
 *   "values": { "target": "worktree" }
 * }}
 * ```
 */
export interface ResolveSessionConfigParams extends BaseParams {
  channel: 'ahp-root://';
  /** 代理程式提供者 ID */
  provider?: string;
  /** 工作階段的工作目錄 */
  workingDirectory?: URI;
  /** 目前使用者填入的組態值 */
  config?: Record<string, unknown>;
}

/**
 * `resolveSessionConfig` 指令的結果。
 */
export interface ResolveSessionConfigResult {
  /** 描述給定目前脈絡下可用組態屬性的 JSON Schema */
  schema: SessionConfigSchema;
  /** 目前的組態值（回送並套用伺服器解析後的預設值） */
  values: Record<string, unknown>;
}

// ─── sessionConfigCompletions ────────────────────────────────────────────────

/**
 * `sessionConfigCompletions` 傳回的單一值項目。
 *
 * @category Commands
 */
export interface SessionConfigValueItem {
  /** 要儲存於組態中的值 */
  value: string;
  /** 人類可讀的顯示標籤 */
  label: string;
  /** 選用的次要描述 */
  description?: string;
}

/**
 * 向伺服器查詢動態工作階段組態屬性的允許值。
 *
 * 用於 `resolveSessionConfig` 傳回之結構描述中的屬性具有
 * `enumDynamic: true` 時。用戶端傳送搜尋查詢，並接收帶有顯示中繼資料的相符
 * 值。
 *
 * @category Commands
 * @method sessionConfigCompletions
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 * @example
 * ```jsonc
 * // Client → Server (user types "ma" in branch picker)
 * { "jsonrpc": "2.0", "id": 7, "method": "sessionConfigCompletions",
 *   "params": { "workingDirectory": "file:///home/user/my-project",
 *               "config": { "target": "worktree" },
 *               "property": "baseBranch", "query": "ma" } }
 *
 * // Server → Client
 * { "jsonrpc": "2.0", "id": 7, "result": {
 *   "items": [
 *     { "value": "main", "label": "main", "icon": "git-branch" },
 *     { "value": "main-v2", "label": "main-v2", "icon": "git-branch" }
 *   ]
 * }}
 * ```
 */
export interface SessionConfigCompletionsParams extends BaseParams {
  channel: 'ahp-root://';
  /** 代理程式提供者 ID */
  provider?: string;
  /** 工作階段的工作目錄 */
  workingDirectory?: URI;
  /** 目前使用者填入的組態值（為查詢提供脈絡） */
  config?: Record<string, unknown>;
  /** 要為其查詢值的結構描述屬性 id */
  property: string;
  /** 搜尋篩選文字（空白或省略時傳回預設/最近值） */
  query?: string;
}

/**
 * `sessionConfigCompletions` 指令的結果。
 */
export interface SessionConfigCompletionsResult {
  /** 相符的值項目 */
  items: SessionConfigValueItem[];
}
