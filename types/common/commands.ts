/**
 * 通用指令類型 — 連線層級指令（握手、ping、重新連線、訂閱／取消訂閱、
 * dispatchAction）加上檔案系統 `resource*` 家族，以及不專屬於任一狀態通道的
 * `authenticate`。
 *
 * @module common/commands
 */

import type { URI, Snapshot } from './state.js';
import type { ActionEnvelope, StateAction } from './actions.js';
import type { TelemetryCapabilities } from '../channels-otlp/state.js';

// ─── BaseParams ──────────────────────────────────────────────────────────────

/**
 * 每個指令的 params 所擴充的基底形狀。
 *
 * `channel` 識別該指令所針對的通道，與每個協定通知上的 `channel` 欄位互相對應。
 * 對於操作特定通道（工作階段、終端機或變更集）的指令，`channel` 為該通道的 URI。
 * 對於連線層級而非通道範圍的指令（例如 {@link InitializeParams | `initialize`}、
 * {@link PingParams | `ping`}、{@link ListSessionsParams | `listSessions`}、
 * `resource*` 檔案系統指令，以及 {@link AuthenticateParams | `authenticate`}），
 * 其 params 類型會將 `channel` 縮窄為字面根 URI `'ahp-root://'`。
 *
 * 此不變性讓實作能藉由檢查 `params.channel` 來路由每個傳入訊息 —
 * 無論是請求、回應或通知 — 而無需知道各 method 的 params 形狀。
 *
 * @category Commands
 */
export interface BaseParams {
  /** 此指令所針對的通道 URI。 */
  channel: URI;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

/**
 * 基於游標的分頁輸入，混入任何能對大型結果集分頁的清單指令之 params 中
 * （例如 {@link ListSessionsParams | `listSessions`}）。配對的輸出為
 * {@link PaginatedResult}。
 *
 * 分頁是**不透明且基於游標的**，映照 `fetchTurns` 已用於聊天歷史記錄的形狀：
 * 伺服器擁有排序與鍵集，用戶端藉由在前一次請求中回傳
 * {@link PaginatedResult.nextCursor} 的游標來逐頁瀏覽。
 *
 * 每個分頁指令共用的合約：
 *
 * - 若要取得第一頁，請省略 `cursor`。提供 `limit` 來限制分頁大小。
 * - 若結果帶有 {@link PaginatedResult.nextCursor}，表示還有更多項目 —
 *   將其作為 `cursor` 回傳以取得下一頁。缺少 `nextCursor` 即代表集合已到結尾。
 * - 游標是**伺服器定義且不透明的**：用戶端 MUST NOT 解析、修改或跨連線保留它們。
 *   無法識別的游標 SHOULD 以 `InvalidParams` 錯誤拒絕。
 * - 分頁是**完全附加的**：省略 `limit`／`cursor` 並忽略 `nextCursor` 的用戶端
 *   會看到分頁前的行為（受伺服器施加的任何上限限制），而不分頁的伺服器則會忽略
 *   這些輸入，並在單一頁面中回傳所有內容。
 *
 * @category Commands
 */
export interface PaginatedParams {
  /**
   * 此頁面要回傳的項目數上限。伺服器 SHOULD 遵守此界限，但 MAY 回傳較少的項目，
   * 也 MAY 施加自己的上限。省略以讓伺服器選擇分頁大小。
   */
  limit?: number;
  /**
   * 來自前一個 {@link PaginatedResult.nextCursor} 的不透明分頁游標。省略以
   * 取得第一頁。游標是伺服器定義的，且 MUST 視為不透明 — 請勿解析、修改或
   * 跨連線保留它們。無法識別的游標 SHOULD 以 `InvalidParams` 錯誤拒絕。
   */
  cursor?: string;
}

/**
 * 基於游標的分頁輸出，由任何能對大型結果集分頁的清單指令之 result 擴充
 * （例如 {@link ListSessionsResult | `listSessions`}）。關於每個分頁指令
 * 共用的完整分頁合約，請參見 {@link PaginatedParams}。
 *
 * @category Commands
 */
export interface PaginatedResult {
  /**
   * 下一頁的不透明游標。當回傳頁面之外還有更多項目時出現；缺少即代表集合已到
   * 結尾。將其作為 {@link PaginatedParams.cursor} 回傳以取得下一頁。
   */
  nextCursor?: string;
}

// ─── initialize ──────────────────────────────────────────────────────────────

/**
 * 識別一個協定實作 — 連線某一端的軟體（與組建），有別於它所承載的
 * {@link AgentInfo | 代理程式角色}。在用戶端以
 * {@link InitializeParams.clientInfo | `clientInfo`} 承載，在伺服器以
 * {@link InitializeResult.serverInfo | `serverInfo`} 承載，映照 LSP 的
 * `clientInfo`／`serverInfo` 與 MCP 的 `Implementation`。
 *
 * 此為**僅供參考**：用於日誌、遙測、關於／狀態的呈現，以及 — 作為最後手段 —
 * 針對特定有問題組建的已知問題權宜措施。它**不是**功能偵測機制。功能可用性取決於
 * 能力模型（{@link ClientCapabilities} 與各個 `*.capabilities` 宣告）；實作
 * SHOULD NOT 根據解析 {@link Implementation.version | `version`} 來決定協定行為。
 *
 * @category Commands
 */
export interface Implementation {
  /** 實作名稱，例如產品或套件識別碼。 */
  name: string;
  /**
   * 實作版本。建議使用 [SemVer](https://semver.org) 字串，但非必要。
   */
  version?: string;
  /** 選用的人類可讀顯示名稱。 */
  title?: string;
}

/**
 * 建立新連線並協商協定版本。
 * 這 MUST 是用戶端傳送的第一個訊息。
 *
 * @category Commands
 * @method initialize
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 * @see {@link /specification/lifecycle | 生命週期} 以了解完整的握手流程。
 */
export interface InitializeParams extends BaseParams {
  channel: 'ahp-root://';
  /**
   * 用戶端願意使用的協定版本，依最偏好到最不偏好排序。每個項目為一個
   * [SemVer](https://semver.org) `MAJOR.MINOR.PATCH` 字串（例如 `"0.1.0"`）。
   *
   * 伺服器會選取一個項目，並以 `InitializeResult.protocolVersion` 回傳。
   * 若伺服器無法使用提供的任何版本，它 MUST 回傳錯誤碼 `-32005`
   *（`UnsupportedProtocolVersion`）。
   */
  protocolVersions: string[];
  /** 唯一的用戶端識別碼 */
  clientId: string;
  /**
   * 選用的用戶端實作識別（名稱與版本）。僅供參考 — 關於其可用與不可用的方式，
   * 請參見 {@link Implementation}。有別於 {@link InitializeParams.clientId | `clientId`}，
   * 後者是每個連線用於重新連線的不透明識別碼，而非人類可讀的實作名稱。
   */
  clientInfo?: Implementation;
  /** 握手期間要訂閱的 URI */
  initialSubscriptions?: URI[];
  /**
   * IETF BCP 47 語言標籤，指出用戶端的偏好地區設定（例如 `"en-US"`、`"ja"`）。
   * 伺服器 SHOULD 使用此值來本地化面向使用者的字串，例如確認選項標籤。
   */
  locale?: string;
  /**
   * 選用的用戶端能力宣告。
   *
   * 伺服器 SHOULD 僅宣佈其對應用戶端能力在此處已設定的功能。缺少代表
   * 「未宣告」— 伺服器 MUST 假設用戶端不支援該功能。
   */
  capabilities?: ClientCapabilities;
}

/**
 * 用戶端在 `initialize` 期間宣告的選用能力。
 *
 * 每個欄位是一個存在性旗標：空的物件 `{}` 代表「支援」，缺少則代表「不支援」。
 * 個別能力上的子欄位保留供未來的各能力選項使用。
 *
 * @category Commands
 */
export interface ClientCapabilities {
  /**
   * 用戶端可呈現
   * [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) — 亦即
   * 它可承載 View 沙盒、對其執行 `ui/*` 協定，並代表 App 轉送 `mcp://` 通道流量。
   *
   * 主機 SHOULD 僅在此能力被宣告時填入
   * {@link McpServerCustomization.mcpApp | `McpServerCustomization.mcpApp`}
   *（並公開對應的 {@link McpServerCustomization.channel | `mcp://` 通道}）。
   * 省略此能力的用戶端 MUST 將帶有 App 的工具呼叫視為一般的 MCP 工具呼叫。
   */
  mcpApps?: Record<string, never>;
}

/**
 * `initialize` 指令的結果。
 *
 * `protocolVersion` 是伺服器從用戶端的 `protocolVersions` 清單中選取的版本。
 * 用戶端與伺服器 MUST 在連線的其餘部分使用此版本。若伺服器無法使用提供的任何
 * 版本，它 MUST 回傳錯誤碼 `-32005`（`UnsupportedProtocolVersion`）而非結果。
 */
export interface InitializeResult {
  /**
   * 伺服器選取的協定版本。MUST 是 `InitializeParams.protocolVersions` 中的其中
   * 一個項目。格式為 [SemVer](https://semver.org) `MAJOR.MINOR.PATCH` 字串
   *（例如 `"0.1.0"`）。
   */
  protocolVersion: string;
  /** 目前的伺服器序號 */
  serverSeq: number;
  /**
   * 選用的伺服器實作識別（名稱與版本）。僅供參考 — 關於其可用與不可用的方式，
   * 請參見 {@link Implementation}。相對於
   * {@link InitializeResult.protocolVersion | `protocolVersion`} 識別已協商的協定，
   * `serverInfo` 則識別其背後的主機軟體。
   */
  serverInfo?: Implementation;
  /** 每個 `initialSubscriptions` URI 的快照 */
  snapshots: Snapshot[];
  /** 建議用於遠端檔案系統瀏覽的預設目錄 */
  defaultDirectory?: URI;
  /**
   * 在 {@link Message} 輸入中輸入時，SHOULD 讓用戶端發出帶有
   * {@link CompletionItemKind.UserMessage} 之 `completions` 請求的字元。
   * 通常包含如 `'@'` 或 `'/'` 等字元。
   */
  completionTriggerCharacters?: string[];
  /**
   * 主機在使用者 {@link Message.text} 開頭識別的前綴，作為將剩餘部分當作終端機
   * 指令執行的速記。目前標準化的慣例為 `"!"`；缺少代表主機不支援指令前綴。
   */
  terminalCommandPrefix?: string;
  /**
   * 主機發出的 OTLP 遙測通道（若有）。每個已填入的欄位若非字面的 `ahp-otlp:`
   * 通道 URI，即為用戶端在訂閱前展開的 RFC 6570 URI 範本（目前只有 `logs`
   * 通道定義了範本變數 `{level}`，供訂閱端進行嚴重性篩選）。用戶端 MAY 忽略
   * 其無法處理的訊號。
   *
   * @see {@link /specification/telemetry-channel | 遙測通道}
   */
  telemetry?: TelemetryCapabilities;
}

// ─── ping ────────────────────────────────────────────────────────────────────

/**
 * 驗證 AHP 連線是否仍存活，並避免被閒置逾時的中介者（代理伺服器、負載平衡器等）
 * 關閉。
 *
 * 無論用戶端是否已完成 `initialize` 或持有任何訂閱，伺服器都 MUST 回應。Ping 在
 * 任一方向都不帶有效負載；回應本身即為訊號。
 *
 * @category Commands
 * @method ping
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 */
export interface PingParams extends BaseParams {
  channel: 'ahp-root://';
}

// ─── reconnect ───────────────────────────────────────────────────────────────

/**
 * 重新連線結果類型的判別欄位。
 *
 * @category Commands
 */
export const enum ReconnectResultType {
  Replay = 'replay',
  Snapshot = 'snapshot',
}

/**
 * 重新建立已中斷的連線。伺服器會重播遺漏的操作或提供新的快照。
 *
 * @category Commands
 * @method reconnect
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 * @see {@link /specification/lifecycle | 生命週期} 以了解詳情。
 */
export interface ReconnectParams extends BaseParams {
  channel: 'ahp-root://';
  /** 原始連線的用戶端識別碼 */
  clientId: string;
  /** 用戶端收到的最後一個 `serverSeq` */
  lastSeenServerSeq: number;
  /** 用戶端已訂閱的 URI */
  subscriptions: URI[];
}

/**
 * 當伺服器能從請求的序列重播時的重新連線結果。
 *
 * 伺服器 MUST 在回應中包含所有重播的資料。
 */
export interface ReconnectReplayResult {
  /** 判別欄位 */
  type: ReconnectResultType.Replay;
  /** 自 `lastSeenServerSeq` 以來遺漏的操作信封 */
  actions: ActionEnvelope[];
  /**
   * `ReconnectParams.subscriptions` 中伺服器無法恢復的 URI。這包括已不存在的資源
   *（例如已處置的工作階段或終端機），以及用戶端不再獲許觀察的資源。用戶端
   * SHOULD 將這些從其本地訂閱集合中捨棄。
   */
  missing: URI[];
}

/**
 * 當間隔超過重播緩衝區時的重新連線結果。
 */
export interface ReconnectSnapshotResult {
  /** 判別欄位 */
  type: ReconnectResultType.Snapshot;
  /** 每個訂閱的新快照 */
  snapshots: Snapshot[];
}

/** `reconnect` 指令的結果。 */
export type ReconnectResult = ReconnectReplayResult | ReconnectSnapshotResult;

// ─── subscribe ───────────────────────────────────────────────────────────────

/**
 * 訂閱以 URI 識別的通道。
 *
 * 通道 MAY 帶有相關聯的狀態（例如根、工作階段、終端機），或是無狀態的
 *（純粹用於串流資料的發佈／訂閱）。對於帶有狀態的通道，結果會包含快照；
 * 對於無狀態的通道則省略 `snapshot`。
 *
 * @category Commands
 * @method subscribe
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 * @see {@link /specification/subscriptions | 訂閱}
 */
export interface SubscribeParams extends BaseParams {
  /**
   * 此訂閱的選用傳遞偏好。
   *
   * 伺服器 MAY 使用這些偏好來緩衝並合併高頻率的更新，同時保留相同的縮減狀態。
   * 省略此欄位則採用伺服器的預設傳遞行為。
   */
  delivery?: SubscriptionDeliveryOptions;
  /**
   * 針對回傳快照的選用用戶端請求形狀。
   *
   * 不理解所請求 view 的伺服器會忽略它並回傳其預設快照。用戶端 MUST 容忍收到
   * 比請求更多的狀態。
   */
  view?: SubscribeView;
}

/**
 * 訂閱快照的選用用戶端請求形狀。
 *
 * @category Commands
 */
export interface SubscribeView {
  /**
   * 建議在聊天快照中公開的最近已完成回合數。
   *
   * 伺服器 MAY 回傳比請求更多或更少的回合。省略時，主機 MUST 回傳所有保留的回合。
   * 當仍有較舊的回合可用時，回傳的 {@link ChatState} 會帶有 `turnsNextCursor`；
   * 用戶端將該游標傳給 `fetchTurns`，以要求主機將更多回合分頁納入聊天狀態。
   */
  turns?: number;
}

/**
 * 單一訂閱的建議傳遞偏好。
 *
 * @category Commands
 */
export interface SubscriptionDeliveryOptions {
  /**
   * 伺服器在為此訂閱緩衝／合併更新時，可刻意延遲傳遞的最大時間（以毫秒為單位）。
   *
   * 值為 `0` 時請求立即傳遞，不進行任何刻意合併。
   */
  maxLatencyMs?: number;
}

/**
 * `subscribe` 指令的結果。
 *
 * 當已訂閱的通道帶有相關聯的狀態時 `snapshot` 會出現，無狀態的通道則省略。
 */
export interface SubscribeResult {
  /** 已訂閱通道狀態的快照（無狀態的通道會省略） */
  snapshot?: Snapshot;
}

// ─── unsubscribe ─────────────────────────────────────────────────────────────

/**
 * 停止接收某個通道的更新。
 *
 * @category Commands
 * @method unsubscribe
 * @direction 用戶端 → 伺服器
 * @messageType Notification
 * @version 1
 * @see {@link /specification/subscriptions | 訂閱}
 */
export interface UnsubscribeParams {
  /** 要取消訂閱的通道 URI */
  channel: URI;
}

// ─── dispatchAction ──────────────────────────────────────────────────────────

/**
 * 射後即忘的操作分派（預寫入）。用戶端將操作樂觀地套用到本地狀態，而伺服器一旦
 * 接受就會以 {@link ActionEnvelope} 回傳它們。
 *
 * 用戶端 → 伺服器的 method 名為 `dispatchAction`；伺服器的回覆會透過
 * 伺服器 → 用戶端的 `action` 通知抵達（params：{@link ActionEnvelope}）。
 *
 * @category Commands
 * @method dispatchAction
 * @direction 用戶端 → 伺服器
 * @messageType Notification
 * @version 1
 * @see {@link /guide/actions | 操作} 以取得完整的用戶端可分派操作清單。
 */
export interface DispatchActionParams {
  /** 此操作所針對的通道 URI */
  channel: URI;
  /** 用戶端序號 */
  clientSeq: number;
  /** 要分派的操作 */
  action: StateAction;
}

// ─── resourceRead ────────────────────────────────────────────────────────

/**
 * 已擷取內容資料的編碼。
 *
 * @category Commands
 */
export const enum ContentEncoding {
  Base64 = 'base64',
  Utf8 = 'utf-8',
}

/**
 * 依 URI 讀取資源的內容。
 *
 * 內容參照以參照而非內嵌的方式儲存大型資料（影像、冗長的工具輸出），藉此讓狀態
 * 樹保持小巧。
 *
 * 二進位內容（影像等）MUST 使用 `base64` 編碼。文字內容 MAY 使用 `utf-8` 編碼。
 *
 * 如同所有 `resource*` method，`resourceRead` 是對稱的，MAY 在任一方向傳送。
 * 主機用它來從用戶端發佈的 URI（例如 `virtual://my-client/...` 外掛）擷取內容；
 * 用戶端用它來讀取主機端的檔案。無論由哪一端發起，接收端都透過相同的
 * 權限／`resourceRequest` 流程來強制執行存取。
 *
 * @category Commands
 * @method resourceRead
 * @direction 用戶端 ↔ 伺服器
 * @messageType Request
 * @version 1
 * @throws `NotFound` (`-32008`) 若該 URI 不存在。
 * @throws `PermissionDenied` (`-32009`) 若用戶端未獲許可讀取該 URI。
 * @example
 * ```jsonc
 * // Client → Server
 * { "jsonrpc": "2.0", "id": 10, "method": "resourceRead",
 *   "params": { "uri": "ahp-session:/<uuid>/content/img-1" } }
 *
 * // Server → Client
 * { "jsonrpc": "2.0", "id": 10, "result": {
 *   "data": "iVBORw0KGgo...",
 *   "encoding": "base64",
 *   "contentType": "image/png"
 * }}
 * ```
 */
export interface ResourceReadParams extends BaseParams {
  channel: 'ahp-root://';
  /** 來自 `ContentRef` 的內容 URI */
  uri: string;
  /** 回傳資料的偏好編碼（預設：由伺服器選擇） */
  encoding?: ContentEncoding;
}

/**
 * `resourceRead` 指令的結果。
 *
 * 伺服器 SHOULD 遵守 params 中請求的 `encoding`。若伺服器無法提供請求的編碼，
 * 它 MUST 退回使用 `base64` 或 `utf-8`。
 */
export interface ResourceReadResult {
  /** 編碼為字串的內容 */
  data: string;
  /** `data` 的編碼方式 */
  encoding: ContentEncoding;
  /** 內容類型（例如 `"image/png"`、`"text/plain"`） */
  contentType?: string;
}

// ─── resourceWrite ───────────────────────────────────────────────────────────

/**
 * {@link ResourceWriteParams.data} 在目標檔案中的放置方式。
 *
 * 每個模式對 {@link ResourceWriteParams.position} 的解讀不同：
 *
 * - `truncate`（預設）：以檔案的**開頭**為基準。檔案會在 `position`（預設為 0）
 *   處截斷，並從該偏移量寫入 `data`，因此產生的檔案為
 *   `existing[0..position] + data`。省略 `position` 時即為完整覆寫。
 * - `append`：以檔案的**結尾**為基準。`position` 從 EOF 往回計算位元組，因此
 *   `position: 0`（預設）會在 EOF 處寫入 — POSIX append — 而 `position: 5` 則在
 *   目前 EOF 前 5 個位元組處插入 `data`，並將那結尾的 5 個位元組移到插入區域之後。
 *   伺服器 MUST 評估有效的 EOF，並相對於其他附加者以原子方式寫入，使並行的
 *   `append` 寫入不會互相覆蓋。
 * - `insert`：以檔案的**開頭**為基準。`position`（預設為 0）是 `data` 拼接進去的
 *   位元組偏移量；位於或超過 `position` 的位元組會向右移動 `data.length`。
 *   `insert` 永遠會使檔案增長 — 請使用 `truncate` 來就地覆寫位元組。
 *
 * @category Commands
 */
export const enum ResourceWriteMode {
  Truncate = 'truncate',
  Append = 'append',
  Insert = 'insert',
}

/**
 * 將內容寫入伺服器檔案系統上的檔案。
 *
 * 二進位內容（影像等）MUST 使用 `base64` 編碼。文字內容 MAY 使用 `utf-8` 編碼。
 *
 * 若檔案不存在，會予以建立。若檔案已存在，對現有位元組的影響取決於
 * {@link ResourceWriteParams.mode}：`truncate`（預設）從所選偏移量開始覆寫、
 * `append` 保留所有現有位元組並在以 EOF 為基準的位置加入 `data`，而 `insert`
 * 保留所有現有位元組並在以檔案開頭為基準的偏移量處拼接 `data`。
 *
 * 如同所有 `resource*` method，`resourceWrite` 是對稱的，MAY 在任一方向傳送。
 *
 * @category Commands
 * @method resourceWrite
 * @direction 用戶端 ↔ 伺服器
 * @messageType Request
 * @version 1
 * @throws `NotFound` (`-32008`) 若父目錄不存在。
 * @throws `PermissionDenied` (`-32009`) 若用戶端未獲許可寫入該路徑。
 * @throws `AlreadyExists` (`-32010`) 若設定了 `createOnly` 但檔案已存在。
 * @throws `Conflict` (`-32011`) 若設定了 `ifMatch` 但目前的 `etag` 不相符。
 * @example
 * ```jsonc
 * // Client → Server
 * { "jsonrpc": "2.0", "id": 11, "method": "resourceWrite",
 *   "params": { "uri": "file:///workspace/hello.txt", "data": "SGVsbG8=",
 *              "encoding": "base64", "contentType": "text/plain" } }
 *
 * // Server → Client
 * { "jsonrpc": "2.0", "id": 11, "result": {} }
 * ```
 */
export interface ResourceWriteParams extends BaseParams {
  channel: 'ahp-root://';
  /** 伺服器檔案系統上的目標檔案 URI */
  uri: URI;
  /** 編碼為字串的內容 */
  data: string;
  /** `data` 的編碼方式 */
  encoding: ContentEncoding;
  /** 內容類型（例如 `"text/plain"`、`"image/png"`） */
  contentType?: string;
  /**
   * 若為 `true`，當檔案已存在時伺服器 MUST 失敗，而非覆寫它。適用於安全地
   * 建立新檔案。
   */
  createOnly?: boolean;
  /**
   * `data` 在目標檔案中的放置方式。省略時預設為 `'truncate'`（完整覆寫）。
   * 關於各模式的意義及其對 {@link position} 的解讀，請參見 {@link ResourceWriteMode}。
   */
  mode?: ResourceWriteMode;
  /**
   * 依 {@link mode} 解讀的位元組偏移量。預設為 `0`。
   * - `truncate`：從檔案開頭起算，要在寫入前截斷的偏移量。
   * - `append`：從 EOF 往回起算，要插入 `data` 的位元組數。
   * - `insert`：從檔案開頭起算，要拼接 `data` 的偏移量。
   */
  position?: number;
  /**
   * 先前由 {@link ResourceResolveResult.etag} 回傳的樂觀並行令牌。設定後，若目前
   * 的 `etag` 不相符，伺服器 MUST 以 `Conflict` 失敗 — 以防止 `resourceResolve`
   * 與後續 `resourceWrite` 之間的更新遺失。
   */
  ifMatch?: string;
}

/**
 * `resourceWrite` 指令的結果。
 *
 * 成功時為一個空物件。
 */
export interface ResourceWriteResult {
}

// ─── resourceList ────────────────────────────────────────────────────────

/**
 * 列出伺服器檔案系統上某個檔案 URI 的目錄項目。
 *
 * 這是為了遠端資料夾挑選器及類似的 UI 而設計，這類 UI 需要讓使用者瀏覽伺服器
 * 的本地檔案系統。
 *
 * 伺服器 MUST 僅在目標存在且為目錄時回傳成功。若目標不存在、不是目錄或無法
 * 存取，伺服器 MUST 回傳 JSON-RPC 錯誤。
 *
 * 如同所有 `resource*` method，`resourceList` 是對稱的，MAY 在任一方向傳送。
 *
 * @category Commands
 * @method resourceList
 * @direction 用戶端 ↔ 伺服器
 * @messageType Request
 * @version 1
 * @throws `NotFound` (`-32008`) 若該目錄不存在。
 * @throws `PermissionDenied` (`-32009`) 若用戶端未獲許可瀏覽該目錄。
 */
export interface ResourceListParams extends BaseParams {
  channel: 'ahp-root://';
  /** 伺服器檔案系統上的目錄 URI */
  uri: URI;
}

/**
 * 由 `resourceList` 回傳的目錄項目。
 */
export interface DirectoryEntry {
  /** 項目的基底名稱 */
  name: string;
  /** 項目是檔案還是目錄 */
  type: 'file' | 'directory';
}

/**
 * `resourceList` 指令的結果。
 */
export interface ResourceListResult {
  /** 直接包含在所請求目錄中的項目 */
  entries: DirectoryEntry[];
}

// ─── resourceCopy ────────────────────────────────────────────────────────────

/**
 * 將資源從某個 URI 複製到另一個 URI（位於伺服器的檔案系統）。
 *
 * 若目的地已存在，除非設定了 `failIfExists`，否則會被覆寫。
 *
 * 如同所有 `resource*` method，`resourceCopy` 是對稱的，MAY 在任一方向傳送。
 *
 * @category Commands
 * @method resourceCopy
 * @direction 用戶端 ↔ 伺服器
 * @messageType Request
 * @version 1
 * @throws `NotFound` (`-32008`) 若來源不存在。
 * @throws `PermissionDenied` (`-32009`) 若用戶端未獲許可讀取來源或寫入目的地。
 * @throws `AlreadyExists` (`-32010`) 若設定了 `failIfExists` 但目的地已存在。
 */
export interface ResourceCopyParams extends BaseParams {
  channel: 'ahp-root://';
  /** 要從中複製的來源 URI */
  source: URI;
  /** 要複製到的目的地 URI */
  destination: URI;
  /**
   * 若為 `true`，當目的地已存在時伺服器 MUST 失敗，而非覆寫它。
   */
  failIfExists?: boolean;
}

/**
 * `resourceCopy` 指令的結果。
 *
 * 成功時為一個空物件。
 */
export interface ResourceCopyResult {
}

// ─── resourceDelete ──────────────────────────────────────────────────────────

/**
 * 刪除伺服器檔案系統上位於某個 URI 的資源。
 *
 * 如同所有 `resource*` method，`resourceDelete` 是對稱的，MAY 在任一方向傳送。
 *
 * @category Commands
 * @method resourceDelete
 * @direction 用戶端 ↔ 伺服器
 * @messageType Request
 * @version 1
 * @throws `NotFound` (`-32008`) 若該資源不存在。
 * @throws `PermissionDenied` (`-32009`) 若用戶端未獲許可刪除該資源。
 */
export interface ResourceDeleteParams extends BaseParams {
  channel: 'ahp-root://';
  /** 要刪除的資源 URI */
  uri: URI;
  /**
   * 若為 `true` 且目標為目錄，則遞迴刪除它及其所有內容。若為 `false`（預設），
   * 刪除非空目錄時 MUST 失敗。
   */
  recursive?: boolean;
}

/**
 * `resourceDelete` 指令的結果。
 *
 * 成功時為一個空物件。
 */
export interface ResourceDeleteResult {
}

// ─── resourceRequest ─────────────────────────────────────────────────────────

/**
 * 請求存取接收端檔案系統上某個資源的權限。
 *
 * `resourceRequest` 是對稱的，MAY 在任一方向傳送：用戶端要求伺服器授予對伺服器端
 * 資源的存取權，或伺服器要求用戶端授予對用戶端端資源的存取權。接收端決定要允許、
 * 拒絕，還是針對所請求的存取提示使用者。
 *
 * 若接收端拒絕存取，它 MUST 以 `PermissionDenied`（-32009） 回應。錯誤資料 MAY
 * 包含一個 `ResourceRequestParams` 值，描述呼叫端需要被授予哪些存取權該操作才會
 * 成功；請參見 `types/errors.ts` 中的 `PermissionDeniedErrorData`。
 *
 * 在 `resourceRequest` 成功後，呼叫端 MAY 使用對應的 `resource*` 指令（例如
 * `resourceRead`、`resourceWrite`）來執行該操作。接收端 MAY 隨時撤銷存取權，只需
 * 在後續操作中回傳 `PermissionDenied`。
 *
 * `read`、`write` 或兩者 SHOULD 至少有一個設為 `true`。兩個旗標皆未設定的請求，
 * 接收端會視為 `read: true`。
 *
 * @category Commands
 * @method resourceRequest
 * @direction 用戶端 ↔ 伺服器
 * @messageType Request
 * @version 1
 * @throws `PermissionDenied` (`-32009`) 若存取被拒絕。
 */
export interface ResourceRequestParams extends BaseParams {
  channel: 'ahp-root://';
  /**
   * 所請求的資源 URI。通常是接收端檔案系統上的 `file:` URI，但任何由接收端仲介
   * 存取的 URI 配置皆可。
   */
  uri: URI;
  /** 呼叫端是否需要對該資源的讀取權。 */
  read?: boolean;
  /** 呼叫端是否需要對該資源的寫入權。 */
  write?: boolean;
}

/**
 * `resourceRequest` 指令的結果。
 *
 * 成功時為一個空物件。
 */
export interface ResourceRequestResult {
}

// ─── resourceMove ────────────────────────────────────────────────────────────

/**
 * 將資源從某個 URI 移動（重新命名）到另一個 URI（位於伺服器的檔案系統）。
 *
 * 若目的地已存在，除非設定了 `failIfExists`，否則會被覆寫。
 *
 * 如同所有 `resource*` method，`resourceMove` 是對稱的，MAY 在任一方向傳送。
 *
 * @category Commands
 * @method resourceMove
 * @direction 用戶端 ↔ 伺服器
 * @messageType Request
 * @version 1
 * @throws `NotFound` (`-32008`) 若來源不存在。
 * @throws `PermissionDenied` (`-32009`) 若用戶端未獲許可移動該資源。
 * @throws `AlreadyExists` (`-32010`) 若設定了 `failIfExists` 但目的地已存在。
 */
export interface ResourceMoveParams extends BaseParams {
  channel: 'ahp-root://';
  /** 要從中移動的來源 URI */
  source: URI;
  /** 要移動到的目的地 URI */
  destination: URI;
  /**
   * 若為 `true`，當目的地已存在時伺服器 MUST 失敗，而非覆寫它。
   */
  failIfExists?: boolean;
}

/**
 * `resourceMove` 指令的結果。
 *
 * 成功時為一個空物件。
 */
export interface ResourceMoveResult {
}

// ─── resourceResolve ─────────────────────────────────────────────────────────

/**
 * {@link ResourceResolveResult.type} 的判別欄位。
 *
 * @category Commands
 */
export const enum ResourceType {
  File = 'file',
  Directory = 'directory',
  Symlink = 'symlink',
}

/**
 * 解析資源 — 結合 POSIX 的 `stat` 與 `realpath`。
 *
 * `resourceResolve` 回傳資源的中繼資料，以及符號連結解析後的標準 URI。請以此
 * 取代任何 `resourceExists` 的權宜措施：缺少的資源 MUST 以 `NotFound` JSON-RPC
 * 錯誤呈現，而非帶有哨兵值的成功回應。真正需要布林檢查的呼叫端應嘗試
 * `resourceResolve`，並將 `NotFound` 視為「不存在」。
 *
 * 如同所有 `resource*` method，`resourceResolve` 是對稱的，MAY 在任一方向傳送。
 *
 * @category Commands
 * @method resourceResolve
 * @direction 用戶端 ↔ 伺服器
 * @messageType Request
 * @version 1
 * @throws `NotFound` (`-32008`) 若該資源不存在。
 * @throws `PermissionDenied` (`-32009`) 若呼叫端未獲許可對該 URI 執行 stat。
 * @example
 * ```jsonc
 * // Client → Server
 * { "jsonrpc": "2.0", "id": 20, "method": "resourceResolve",
 *   "params": { "channel": "ahp-root://", "uri": "file:///workspace/hello.txt" } }
 *
 * // Server → Client
 * { "jsonrpc": "2.0", "id": 20, "result": {
 *   "uri": "file:///workspace/hello.txt",
 *   "type": "file",
 *   "size": 5,
 *   "mtime": "2026-01-15T12:34:56.789Z",
 *   "etag": "W/\"5-abc123\""
 * }}
 * ```
 */
export interface ResourceResolveParams extends BaseParams {
  channel: 'ahp-root://';
  /** 要解析的 URI */
  uri: URI;
  /**
   * 當為 `true`（預設）時，跟隨符號連結並回報連結目標的中繼資料 — 並將結果中的
   * `uri` 設為標準（realpath）URI。當為 `false` 時，對連結本身執行 stat
   *（lstat 語意）並回報 `type: 'symlink'`。
   */
  followSymlinks?: boolean;
}

/**
 * `resourceResolve` 指令的結果。
 */
export interface ResourceResolveResult {
  /**
   * 符號連結解析後的標準 URI。當 `followSymlinks` 為 `false` 或該 URI 未穿越
   * 符號連結時，等於所請求的 URI。
   */
  uri: URI;
  /** 資源種類。 */
  type: ResourceType;
  /**
   * 以位元組為單位的大小。當提供者無法廉價地計算時，對目錄省略。
   */
  size?: number;
  /** 上次修改時間，採 ISO 8601 格式（已知時）。 */
  mtime?: string;
  /** 建立時間，採 ISO 8601 格式（已知時）。 */
  ctime?: string;
  /** 嗅探得到的 MIME 類型（已知時，例如 `"text/plain"`、`"image/png"`）。 */
  contentType?: string;
  /**
   * 不透明的各提供者版本令牌。出現時，請將其作為 {@link ResourceWriteParams.ifMatch}
   * 傳入後續的 `resourceWrite`，以偵測並行的修改。
   */
  etag?: string;
}

// ─── resourceMkdir ───────────────────────────────────────────────────────────

/**
 * 以 `mkdir -p` 語意在伺服器的檔案系統上建立目錄。
 *
 * 伺服器 MUST 建立任何缺少的父目錄。建立已存在的目錄為無操作的成功。若 `uri`
 * 已存在但**不是**目錄，伺服器 MUST 以 `AlreadyExists` 失敗。
 *
 * 如同所有 `resource*` method，`resourceMkdir` 是對稱的，MAY 在任一方向傳送。
 *
 * @category Commands
 * @method resourceMkdir
 * @direction 用戶端 ↔ 伺服器
 * @messageType Request
 * @version 1
 * @throws `PermissionDenied` (`-32009`) 若呼叫端未獲許可建立該目錄。
 * @throws `AlreadyExists` (`-32010`) 若 `uri` 已存在但為非目錄。
 */
export interface ResourceMkdirParams extends BaseParams {
  channel: 'ahp-root://';
  /** 要建立的目錄 URI（視需要建立父目錄）。 */
  uri: URI;
}

/**
 * `resourceMkdir` 指令的結果。
 *
 * 成功時為一個空物件。
 */
export interface ResourceMkdirResult {
}

// ─── authenticate ────────────────────────────────────────────────────────────

/**
 * 為受保護資源推送 ******。`resource` 欄位 MUST 符合用戶端從伺服器發現的受保護
 * 資源識別碼 — 無論是靜態宣告於 `AgentInfo.protectedResources`，或是從即時的
 * `McpServerAuthRequiredState.resource` 或 `ToolCallAuthRequiredState.auth.resource`
 * 動態發現（後兩者僅在對應的 MCP 伺服器或工具呼叫實際挑戰驗證時才會浮現）。
 * 伺服器 MUST 接受其透過這三種機制之一所自行宣佈的任何 `resource` 值。
 *
 * 令牌使用 [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750)
 *（****** 使用）語意傳遞。用戶端從資源中繼資料所列的授權伺服器取得令牌，
 * 並透過此指令將其推送給伺服器。
 *
 * @category Commands
 * @method authenticate
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 * @see {@link /specification/authentication | 驗證}
 * @example
 * ```jsonc
 * // Client → Server
 * { "jsonrpc": "2.0", "id": 3, "method": "authenticate",
 *   "params": { "channel": "ahp-root://", "resource": "https://api.github.com", "token": "gho_xxxx" } }
 *
 * // Server → Client (success)
 * { "jsonrpc": "2.0", "id": 3, "result": {} }
 *
 * // Server → Client (failure — invalid token)
 * { "jsonrpc": "2.0", "id": 3, "error": { "code": -32007, "message": "Invalid token" } }
 * ```
 */
export interface AuthenticateParams extends BaseParams {
  channel: 'ahp-root://';
  /**
   * 受保護資源識別碼。MUST 符合伺服器已宣佈的 `resource` 值 — 透過
   * `AgentInfo.protectedResources` 中的 `ProtectedResourceMetadata`，或是透過
   * 即時的 `McpServerAuthRequiredState.resource`／`ToolCallAuthRequiredState.auth.resource`。
   */
  resource: string;
  /** 從資源的授權伺服器取得的 ****** */
  token: string;
  /**
   * 令牌所授予的 OAuth 範圍（已知時）。讓伺服器能判斷某個特定挑戰 — 例如即時
   * `McpServerAuthRequiredState` 或 `ToolCallAuthRequiredState.auth` 上的
   * `requiredScopes` — 是否已滿足，而無需解碼（不透明、伺服器專屬的）令牌本身。
   * 當用戶端未將已授予的範圍與令牌分開追蹤時省略。
   */
  scopes?: string[];
}

/**
 * `authenticate` 指令的結果。
 *
 * 成功時為一個空物件。若令牌無效或資源無法識別，伺服器 MUST 回傳 JSON-RPC
 * 錯誤（例如 `AuthRequired` `-32007` 或 `InvalidParams` `-32602`）。
 */
export interface AuthenticateResult {
}
