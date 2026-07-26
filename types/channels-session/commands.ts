/**
 * 工作階段通道指令 — `createSession`、`disposeSession`、`fetchTurns`
 * 與 `completions`。大多數針對特定的 `ahp-session:` URI。
 *
 * @module channels-session/commands
 */

import type { URI } from '../common/state.js';
import type { BaseParams } from '../common/commands.js';
import type {
  SessionActiveClient,
} from './state.js';
import type {
  MessageAttachment,
} from '../channels-chat/state.js';

// ─── createSession ───────────────────────────────────────────────────────────

/**
 * 以指定的代理程式提供者建立新工作階段。
 *
 * 若工作階段 URI 已存在，伺服器 MUST 回傳代碼為
 * `-32003`（`SessionAlreadyExists`）的錯誤。
 *
 * 建立後，用戶端應訂閱工作階段 URI 以接收狀態更新。伺服器也會向
 * 所有用戶端廣播 `root/sessionAdded` 通知。
 *
 * @category Commands
 * @method createSession
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 * @example
 * ```jsonc
 * // Client → Server
 * { "jsonrpc": "2.0", "id": 2, "method": "createSession",
 *   "params": { "channel": "ahp-session:/<uuid>", "provider": "copilot" } }
 *
 * // Server → Client (success)
 * { "jsonrpc": "2.0", "id": 2, "result": null }
 *
 * // Server → Client (failure — provider not found)
 * { "jsonrpc": "2.0", "id": 2, "error": { "code": -32002, "message": "No agent for provider" } }
 *
 * // Server → Client (failure — session already exists)
 * { "jsonrpc": "2.0", "id": 2, "error": { "code": -32003, "message": "Session already exists" } }
 * ```
 */
/**
 * 識別要從中分叉的來源工作階段與回合。
 *
 * 在 `createSession` 中提供時，伺服器會以來源工作階段的內容填入新工作階段，
 * 範圍至並包含指定回合的回應為止。
 */
export interface SessionForkSource {
  /** 要從中分叉的現有工作階段 URI */
  session: URI;
  /** 來源工作階段中的回合 ID；至並包含此回合回應為止的內容會被複製 */
  turnId: string;
}

export interface CreateSessionParams extends BaseParams {
  /** 工作階段 URI（由用戶端選擇，例如 `ahp-session:/<uuid>`） */
  channel: URI;
  /** 代理程式提供者 ID */
  provider?: string;
  /**
   * 工作階段代理程式被授予工具存取權的工作目錄。一個工作階段可跨越多個
   * 目錄；它們是平等的同儕，除非代理程式通告了
   * {@link MultipleWorkingDirectoriesCapability.requiresPrimary}，此時
   * 應透過 {@link primaryWorkingDirectory} 將其中之一指定為主要目錄。
   *
   * 除非代理程式通告了
   * {@link AgentCapabilities.multipleWorkingDirectories}，否則用戶端 MUST NOT
   * 提供多個項目；不具此能力的伺服器僅將第一個項目視為工作階段的工作
   * 目錄，並忽略其餘項目。在工作階段啟動後，分派
   * `session/workingDirectorySet` / `session/workingDirectoryRemoved` 來
   * 變更此集合。
   *
   * 分叉的工作階段會忽略此欄位 — 分叉會從 `fork` 所識別的來源工作階段
   * 繼承其工作目錄。
   */
  workingDirectories?: URI[];
  /**
   * 工作階段**預設聊天**的主要工作目錄。
   *
   * 工作階段本身沒有主要目錄 — 主要目錄是每個聊天的概念（見
   * {@link ChatState.primaryWorkingDirectory}）。但 `createSession` 會隱含
   * 建立工作階段的預設聊天，且沒有獨立的 `createChat` 呼叫可承載該聊天的
   * 建立時間欄位。因此，此欄位是用戶端唯一能在誕生時指定**預設聊天**
   * 主要目錄之處；它會被複製到該聊天唯讀的
   * `primaryWorkingDirectory`。對任何非預設聊天，請改為傳遞
   * {@link CreateChatParams.primaryWorkingDirectory}。
   *
   * 設定時，它 MUST 是 {@link workingDirectories} 之一。當代理程式通告
   * {@link MultipleWorkingDirectoriesCapability.requiresPrimary} 時，用戶端
   * SHOULD 提供此欄位；主機 MAY 拒絕省略它的建立請求，或退回使用
   * `workingDirectories` 的第一個項目。分叉的工作階段會忽略此欄位
   * （分叉會繼承來源工作階段的聊天及其主要目錄）。
   */
  primaryWorkingDirectory?: URI;
  /**
   * 從現有工作階段分叉。新工作階段會以來源工作階段的內容填入，範圍至
   * 並包含指定回合的回應為止。
   */
  fork?: SessionForkSource;
  /**
   * 透過 `resolveSessionConfig` 收集的代理程式特定設定值。鍵與值對應於
   * 伺服器回傳的綱要。
   */
  config?: Record<string, unknown>;
  /**
   * 為新工作階段主動認領作用中用戶端角色。
   *
   * 提供時，伺服器會以此用戶端作為作用中用戶端初始化工作階段，等同於
   * 在建立後立即分派 `session/activeClientSet` 操作。`clientId` MUST
   * 與建立用戶端在 `initialize` 中提供的 `clientId` 相符。
   */
  activeClient?: SessionActiveClient;
  /**
   * 選擇加入的進度權杖。設定時，用戶端表示願意接收伺服器為帶起此工作
   * 階段所做任何長時間執行工作的 `progress` 通知（見 `ProgressParams`）
   * — 最顯著的是提供者原生 SDK 的延遲首次使用下載。伺服器會在每個
   * `progress` 框架上回應此確切權杖，讓用戶端能將其與此
   * `createSession` 呼叫（及等待它的 UI）關聯。
   *
   * 權杖 MUST 在用戶端的作用中請求間是唯一的。伺服器 MAY 忽略它
   * （例如當不需要任何長時間執行的工作時），此情況下不會發出任何
   * `progress` 通知。
   */
  progressToken?: string;
}

// ─── disposeSession ──────────────────────────────────────────────────────────

/**
 * 處置工作階段並清理伺服器端資源。
 *
 * 伺服器會向所有用戶端廣播 `root/sessionRemoved` 通知。
 *
 * @category Commands
 * @method disposeSession
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 */
export interface DisposeSessionParams extends BaseParams {}

// ─── fetchTurns ──────────────────────────────────────────────────────────────

/**
 * 請求主機將較舊的歷史回合載入聊天狀態。
 *
 * 指令結果不承載回合。相反地，在回應前，主機 MUST 分派
 * `chat/turnsLoaded`，將任何已載入的回合插入聊天通道的 `turns`
 * 狀態，置於已載入視窗之前，並更新或清除 `turnsNextCursor`。
 *
 * 在套用任何參照目前載入視窗外回合的操作前，主機 MUST 主動將足夠的
 * 舊回合載入狀態，讓該操作能對有效狀態進行歸約。
 *
 * @category Commands
 * @method fetchTurns
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 * @example
 * ```jsonc
 * // Client → Server (load the next page indicated by ChatState.turnsNextCursor)
 * { "jsonrpc": "2.0", "id": 8, "method": "fetchTurns",
 *   "params": { "channel": "ahp-chat:/<uuid>", "cursor": "opaque-cursor" } }
 *
 * // Server updates chat state, then responds
 * { "jsonrpc": "2.0", "id": 8, "result": {} }
 * ```
 */
export interface FetchTurnsParams extends BaseParams {
  /** 聊天 URI */
  channel: URI;
  /**
   * 來自 `ChatState.turnsNextCursor` 的不透明游標。
   *
   * 主機 MUST 以 `InvalidParams` 拒絕無法辨識的游標。僅在要求主機為
   * 聊天（若有的話）順勢載入其下一個較舊分頁時才省略。
   */
  cursor?: string;
}

/**
 * `fetchTurns` 指令的結果。
 */
export interface FetchTurnsResult {}

// ─── completions ─────────────────────────────────────────────────────────────

/**
 * 所請求的補全項目種類。
 *
 * @category Commands
 */
export const enum CompletionItemKind {
  /**
   * 使用者正在撰寫的 {@link Message} 文字補全。每個回傳項目都承載一個
   * 附件，在接受時會與訊息關聯。
   */
  UserMessage = 'userMessage',
}

/**
 * 為部分輸入的內容請求補全項目（例如使用者目前正在撰寫的使用者
 * 訊息）。用於驅動 `@` 提及選擇器、檔案/符號參照，以及類似的內嵌
 * 補全體驗。
 *
 * 伺服器 SHOULD 將此指令視為盡力而為並迅速回傳。用戶端 SHOULD 對呼叫
 * 進行去抖動，以避免在每次按鍵時用請求淹沒伺服器。
 *
 * @category Commands
 * @method completions
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 * @example
 * ```jsonc
 * // User has typed "look at @foo" and the cursor is just after "@foo".
 * // Client → Server
 * { "jsonrpc": "2.0", "id": 12, "method": "completions",
 *   "params": { "kind": "userMessage", "channel": "ahp-chat:/<uuid>",
 *               "text": "look at @foo", "offset": 12 } }
 *
 * // Server → Client
 * { "jsonrpc": "2.0", "id": 12, "result": {
 *   "items": [
 *     {
 *       "insertText": "@foo.ts",
 *       "rangeStart": 8,
 *       "rangeEnd": 12,
 *       "attachment": {
 *         "type": "resource",
 *         "label": "foo.ts",
 *         "displayKind": "document",
 *         "uri": "file:///workspace/foo.ts"
 *       }
 *     }
 *   ]
 * }}
 * ```
 */
export interface CompletionsParams extends BaseParams {
  /** 所請求的補全種類。 */
  kind: CompletionItemKind;
  /** 請求補全的聊天 URI。 */
  channel: URI;
  /**
   * 正在補全之輸入的完整文字（例如目前為止輸入的完整使用者訊息文字）。
   */
  text: string;
  /**
   * 在 `text` 中請求補全的字元偏移量，以 UTF-16 碼單位測量。MUST 滿足
   * `0 <= offset <= text.length`。
   */
  offset: number;
}

/**
 * `completions` 指令回傳的單一補全項目。
 *
 * 當使用者接受項目時，用戶端 SHOULD：
 * 1. 以 `insertText` 取代輸入中 `[rangeStart, rangeEnd)` 範圍
 *    （或省略範圍時在游標處插入 `insertText`）。
 * 2. 將項目的 `attachment` 與產生的 {@link Message} 關聯。
 *
 * @category Commands
 */
export interface CompletionItem {
  /**
   * 接受此項目時插入到輸入中的文字。
   */
  insertText: string;

  /**
   * 若已定義，為輸入 `text` 中被 `insertText` 取代的範圍起點。此範圍
   * 為字元偏移量的半開區間 `[rangeStart, rangeEnd)`，以 UTF-16 碼單位
   * 測量。
   *
   * 省略時，用戶端 SHOULD 在游標處插入 `insertText`。
   *
   * 注意：此範圍參照的是*目前*輸入中的位置。附件自身的
   * `rangeStart`/`rangeEnd`（若存在）參照的是項目被接受後最終
   * {@link Message.text} 中的位置。
   */
  rangeStart?: number;

  /**
   * 輸入 `text` 中被 `insertText` 取代的範圍終點。見
   * {@link rangeStart}。
   */
  rangeEnd?: number;

  /**
   * 與此補全項目關聯的附件。
   */
  attachment: MessageAttachment;
}

/**
 * `completions` 指令的結果。
 */
export interface CompletionsResult {
  /** 補全項目，按伺服器建議顯示的順序排列。 */
  items: CompletionItem[];
}
