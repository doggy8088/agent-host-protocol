/**
 * 工作階段狀態類型 — 在 `ahp-session:` 通道上公開的每個工作階段協調狀態。
 *
 * @module channels-session/state
 */

import type { Changeset } from '../channels-changeset/state.js';
import type { AnnotationsSummary } from '../channels-annotations/state.js';
import type {
  ChatSummary,
  ChatInputRequest,
  ToolCallConfirmationState,
  ToolCallState,
  ToolCallAuthRequiredState,
} from '../channels-chat/state.js';
import type {
  ConfigPropertySchema,
  ErrorInfo,
  Icon,
  ProtectedResourceMetadata,
  TextRange,
  URI,
} from '../common/state.js';

// ─── Session State ───────────────────────────────────────────────────────────

/**
 * 工作階段初始化狀態。
 *
 * @category Session State
 */
export const enum SessionLifecycle {
  Creating = 'creating',
  Ready = 'ready',
  CreationFailed = 'creationFailed',
}

/**
 * 摘要層級工作階段狀態旗標的位元集。
 *
 * 對非終結活動使用位元檢查而非相等性檢查。例如，
 * `status & SessionStatus.InProgress` 同時比對普通的進行中回合與
 * 暫停等待輸入的回合。
 *
 * @category Session State
 */
export const enum SessionStatus {
  /** 工作階段閒置 — 沒有進行中的回合。 */
  Idle = 1,
  /** 工作階段以錯誤結束。 */
  Error = 1 << 1,
  /** 回合正在串流。 */
  InProgress = 1 << 3,
  /** 回合進行中但因等待使用者輸入或工具確認而阻塞。 */
  InputNeeded = (1 << 3) | (1 << 4),
  /** 用戶端自上次修改後已檢視此工作階段。 */
  IsRead = 1 << 5,
  /** 工作階段已被用戶端封存。 */
  IsArchived = 1 << 6,
}

/**
 * 完整 {@link SessionState}（當用戶端訂閱工作階段 URI 時傳遞）與輕量級
 * {@link SessionSummary}（承載於根通道工作階段目錄中）之間共用的中繼
 * 資料。
 *
 * 這些欄位一覽地描述工作階段，且同時出現於兩處。
 * `SessionState` 擁有已訂閱工作階段的權威值；
 * `SessionSummary` 將其鏡射至目錄中，讓僅呈現工作階段清單的用戶端不必
 * 訂閱每個工作階段 URI。主機透過 `root/sessionSummaryChanged` 保持目錄
 * 同步。
 *
 * @category Session State
 */
export interface SessionMetadata {
  /** 代理程式提供者 ID */
  provider: string;
  /** 工作階段標題 */
  title: string;
  /** 目前工作階段狀態 */
  status: SessionStatus;
  /** 工作階段目前正在做什麼的人類可讀描述 */
  activity?: string;
  /** 此工作階段的伺服器擁有專案 */
  project?: ProjectInfo;
  /**
   * 工作階段代理程式具有工具存取權的工作目錄，由
   * `session/workingDirectorySet` / `session/workingDirectoryRemoved` 操作
   * 維護。目錄為**平等的同儕** — 工作階段沒有主要目錄。個別聊天 MAY
   * 透過 {@link ChatSummary.workingDirectories | 其自身的 `workingDirectories`} 限制為子集，並將其自身的某個目錄指定為主要目錄（見
   * {@link ChatState.primaryWorkingDirectory}）；未設定子集的聊天會對此完整集合運作。
   */
  workingDirectories?: URI[];
  /**
   * 此工作階段內嵌註解通道（`ahp-session:/<uuid>/annotations`）的
   * 輕量級摘要。公開以便徽章 UI 無需訂閱即可呈現註解/項目計數。
   * 當工作階段未公開註解通道時不存在。
   */
  annotations?: AnnotationsSummary;
}

/**
 * 單一工作階段的完整狀態，當用戶端訂閱工作階段 URI 時載入。
 *
 * 將每個 {@link SessionMetadata} 欄位直接內嵌（反正規化）至自身，讓
 * 訂閱者收到一個扁平物件而非巢狀摘要。輕量級目錄表示法為
 * {@link SessionSummary}，公開於根通道；主機透過
 * `root/sessionSummaryChanged` 保持兩者同步。
 *
 * @category Session State
 */
export interface SessionState extends SessionMetadata {
  /** 工作階段初始化狀態 */
  lifecycle: SessionLifecycle;
  /** 建立失敗時的錯誤詳細資訊 */
  creationError?: ErrorInfo;
  /** 伺服器（代理主機）為此工作階段提供的工具 */
  serverTools?: ToolDefinition[];
  /**
   * 目前為此工作階段提供工具與互動能力的用戶端。若同一作用中用戶端
   * 提供多個工具或自訂，代理主機 MAY 在公開給模型時對其去重，並優先
   * 採用起始回合的用戶端。
   *
   * 成員資格由主機管理：用戶端以 `session/activeClientSet` 新增（或重新
   * 整理）自身，且主機在其取消訂閱、未及時重新連線的斷線，或重新連線
   * 但未重新訂閱工作階段時，以 `session/activeClientRemoved` 移除它們。
   */
  activeClients: SessionActiveClient[];
  /** 此工作階段中的聊天目錄。 */
  chats: ChatSummary[];
  /**
   * 當使用者在不選取特定聊天的情況下對工作階段發話時，接收輸入的
   * 聊天。這是 UI 路由提示，而非階層標記 — 在協定層級聊天仍是平等的
   * 同儕。主機 MAY 在工作階段生命週期中變更此值。
   */
  defaultChat?: URI;
  /** 工作階段設定綱要與目前值 */
  config?: SessionConfigState;
  /**
   * 此工作階段中作用中的頂層自訂。
   *
   * 永遠是 {@link Customization} 變體之一：
   *
   * - 容器自訂（{@link PluginCustomization}、
   *   {@link DirectoryCustomization}），其子項 — 代理程式、技能、
   *   提示、規則、掛鉤、MCP 伺服器 — 存在於每個容器的
   *   {@link ContainerCustomizationBase.children | `children`} 陣列中。
   * - 主機直接公開的頂層 {@link McpServerCustomization} 項目（例如
   *   全域設定的 MCP 伺服器，未隨附於外掛或目錄中）。MCP 伺服器也可
   *   作為容器的子項出現。
   *
   * 用戶端發布的外掛透過
   * {@link SessionActiveClient.customizations | `activeClients[].customizations`}
   * 抵達，主機將其傳播至此清單（通常會設定容器的 `clientId` 並填入
   * `children`）。用戶端僅以容器形式發布；頂層的單獨 MCP 伺服器為
   * 伺服器發起。
   */
  customizations?: Customization[];
  /**
   * 伺服器可為此工作階段產生的變更集目錄。每個項目通告一個可訂閱的
   * 檔案變更檢視（未提交、工作階段範圍、每回合等）以及用戶端在訂閱前
   * 展開的 URI 範本。完整形狀見 {@link Changeset}，模型概覽見
   * {@link /guide/changesets | Changesets}。
   */
  changesets?: Changeset[];
  /**
   * 工作階段受阻的待處理輸入，跨每個聊天彙總，讓用戶端能單從工作
   * 階段通道發現並回答，而無需訂閱個別聊天。
   *
   * 每個項目皆自足：它承載擁有聊天的 URI 加上用戶端回應所需的所有
   * 識別碼。用戶端透過將普通的 `chat/*` 操作分派至該聊天的通道來回答
   * — 各變體的回應路徑見 {@link SessionInputRequest}。存在且非空的
   * 清單隱含 {@link SessionSummary.status} 上的
   * {@link SessionStatus.InputNeeded}。
   *
   * 主機管理：主機以 `session/inputNeededSet` 在聊天提出請求時 upsert
   * 項目，並在底層請求解決後以 `session/inputNeededRemoved` 移除它們。
   */
  inputNeeded?: SessionInputRequest[];
  /**
   * 此工作階段的額外提供者特定中繼資料。
   *
   * 用戶端 MAY 在此尋找知名鍵以提供增強的 UI。例如，`git` 鍵可提供
   * 關於工作階段工作目錄的額外 git 中繼資料。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 目前為工作階段提供工具與互動能力的用戶端。
 *
 * 一個工作階段 MAY 同時有多個作用中用戶端；{@link SessionState.activeClients}
 * 中的項目以 `clientId` 為鍵。伺服器 SHOULD 在該用戶端斷線時自動移除
 * 作用中用戶端。
 *
 * @category Session State
 */
export interface SessionActiveClient {
  /** 用戶端識別碼（與 `initialize` 中的 `clientId` 相符） */
  clientId: string;
  /** 人類可讀的用戶端名稱（例如 `"VS Code"`） */
  displayName?: string;
  /** 此用戶端為工作階段提供的工具 */
  tools: ToolDefinition[];
  /**
   * 此用戶端為工作階段貢獻的外掛自訂。
   *
   * 用戶端以 [Open Plugins](https://open-plugins.com/) 格式發布 — 即
   * 永遠為容器形式的外掛。它們 MAY 在記憶體中合成虛擬外掛，並依賴
   * 主機將其展開為 {@link SessionState.customizations} 內的具體子項。
   */
  customizations?: ClientPluginCustomization[];
}

// ─── Session Input Requests ──────────────────────────────────────────────────

/**
 * 工作階段可在 {@link SessionState.inputNeeded} 中公開之待處理輸入種類的
 * 判別欄位。
 *
 * 這是一般/分類型聯集（非生命週期），因此判別欄位為
 * `*Kind`。
 *
 * @category Session Input Types
 */
export const enum SessionInputRequestKind {
  /** 從未解決聊天回應部分鏡射而來的面向使用者引出。 */
  ChatInput = 'chatInput',
  /** 等待參數或結果確認的工具呼叫。 */
  ToolConfirmation = 'toolConfirmation',
  /** 工作階段希望作用中用戶端執行的執行中工具。 */
  ToolClientExecution = 'toolClientExecution',
  /** 執行中途因 MCP 驗證而阻塞的工具呼叫。 */
  ToolAuthentication = 'toolAuthentication',
}

/**
 * 每個 {@link SessionInputRequest} 變體共用的欄位。
 *
 * @category Session Input Types
 */
interface SessionInputRequestBase {
  /**
   * 此項目的穩定鍵，在工作階段的 {@link SessionState.inputNeeded} 清單中
   * 唯一。主機以任何其偏好方式推導（例如從聊天 URI 加上底層請求或
   * 工具呼叫 id）；消費者 MUST 將其視為不透明。它是
   * `session/inputNeededSet` / `session/inputNeededRemoved` upsert 慣例的
   * 鍵。
   */
  id: string;
  /**
   * 底層請求所在的聊天。這是用戶端將其回應分派至的通道 — 它不需要先
   * 訂閱該聊天。
   */
  chat: URI;
}

/**
 * 在工作階段層級公開的使用者輸入引出，鏡射自擁有聊天中未解決的
 * {@link InputRequestResponsePart} 請求。
 *
 * 透過分派 `chat/inputCompleted`（或以 `chat/inputAnswerChanged` 同步草稿）
 * 至 {@link SessionInputRequestBase.chat | `chat`} 來回應，以
 * {@link ChatInputRequest.id | `request.id`} 為鍵。
 *
 * @category Session Input Types
 */
export interface SessionChatInputRequest extends SessionInputRequestBase {
  kind: SessionInputRequestKind.ChatInput;
  /** 鏡射的聊天輸入請求。 */
  request: ChatInputRequest;
}

/**
 * 因確認而阻塞的工具呼叫 — 可能是執行前的參數確認或之後的結果確認 —
 * 在工作階段層級公開。
 *
 * 透過分派 `chat/toolCallConfirmed`（對
 * {@link ToolCallPendingConfirmationState}）或
 * `chat/toolCallResultConfirmed`（對
 * {@link ToolCallPendingResultConfirmationState}）至
 * {@link SessionInputRequestBase.chat | `chat`} 來回應，以 `turnId` 與
 * `toolCall.toolCallId` 為鍵。
 *
 * @category Session Input Types
 */
export interface SessionToolConfirmationRequest extends SessionInputRequestBase {
  kind: SessionInputRequestKind.ToolConfirmation;
  /** 工具呼叫所屬的回合。 */
  turnId: string;
  /** 等待確認的工具呼叫。 */
  toolCall: ToolCallConfirmationState;
}

/**
 * 執行委派給作用中用戶端的執行中工具。公開以便提供該工具的用戶端能
 * 接手工作而無需訂閱擁有聊天。
 *
 * {@link toolCall} 永遠是 {@link ToolCallRunningState}（處於 `running`
 * 狀態的 {@link ToolCallState}），其
 * {@link ToolCallRunningState.contributor | `contributor`} 為用戶端
 * {@link ToolCallClientContributor}，其 `clientId` 與此處反正規化的
 * {@link clientId} 相符。透過分派 `chat/toolCallComplete`（並選擇性地以
 * `chat/toolCallContentChanged` 串流）至 {@link SessionInputRequestBase.chat |
 * `chat`} 來執行並回報結果，以 `turnId` 與 `toolCall.toolCallId` 為鍵。
 *
 * @category Session Input Types
 */
export interface SessionToolClientExecutionRequest extends SessionInputRequestBase {
  kind: SessionInputRequestKind.ToolClientExecution;
  /** 工具呼叫所屬的回合。 */
  turnId: string;
  /**
   * 預期執行該工具的 `clientId`。與工具呼叫之用戶端
   * {@link ToolCallContributor} 的 `clientId` 相符。
   */
  clientId: string;
  /**
   * 工作階段希望擁有用戶端執行的執行中工具呼叫。主機僅會以
   * {@link ToolCallRunningState}（即處於 `running` 狀態的
   * {@link ToolCallState}）填入此欄位。
   */
  toolCall: ToolCallState;
}

/**
 * 執行中途因 MCP 驗證而阻塞的工具呼叫，在工作階段層級公開。
 *
 * {@link toolCall} 永遠是 {@link ToolCallAuthRequiredState}（處於
 * `auth-required` 瀑態的 {@link ToolCallState}）。與
 * {@link SessionToolConfirmationRequest} 不同，這**不是**透過直接分派
 * `chat/*` 操作來回答：用戶端為
 * {@link ToolCallAuthRequiredState.auth | `toolCall.auth`}`.resource` 取得
 * 權杖，並透過現有的 `authenticate` 指令推送（見
 * {@link /specification/authentication | Authentication}）。主機在權杖被
 * 接受後恢復工具呼叫並分派 `chat/toolCallAuthResolved`，此時它也會以
 * `session/inputNeededRemoved` 移除此項目。
 *
 * @category Session Input Types
 */
export interface SessionToolAuthenticationRequest extends SessionInputRequestBase {
  kind: SessionInputRequestKind.ToolAuthentication;
  /** 工具呼叫所屬的回合。 */
  turnId: string;
  /** 等待驗證的工具呼叫。 */
  toolCall: ToolCallAuthRequiredState;
}

/**
 * 工作階段受阻的單一待處理輸入，跨 {@link SessionState.inputNeeded} 中
 * 所有聊天彙總。
 *
 * 每個項目皆自足：它承載擁有的
 * {@link SessionInputRequestBase.chat | `chat`} URI 加上建構回應所需的所有
 * 識別碼，讓用戶端能透過將普通的 `chat/*` 操作（`chat/inputCompleted`、
 * `chat/toolCallConfirmed`、`chat/toolCallComplete`、…）分派至該聊天的
 * 通道來回答，**而無需先訂閱該聊天** — {@link SessionToolAuthenticationRequest}
 * 除外，它改為透過 `authenticate` 指令解決。主機在底層請求解決後以
 * `session/inputNeededRemoved` 移除該項目。
 *
 * @category Session Input Types
 */
export type SessionInputRequest =
  | SessionChatInputRequest
  | SessionToolConfirmationRequest
  | SessionToolClientExecutionRequest
  | SessionToolAuthenticationRequest;

/**
 * 工作階段的伺服器擁有專案中繼資料。
 *
 * @category Session State
 */
export interface ProjectInfo {
  /** 專案 URI */
  uri: URI;
  /** 人類可讀的專案名稱 */
  displayName: string;
}

/**
 * 摘要單一工作階段的輕量級目錄項目。透過
 * {@link RootChannelCommands.listSessions | `root/listSessions`} 與
 * `root/sessionAdded`/`root/sessionSummaryChanged` 通知公開。
 *
 * **跨聊天彙總。** 一旦工作階段包含多個聊天，若干 `SessionSummary` 欄位
 * 衍生自底層的 {@link SessionState.chats | 聊天目錄}。生產者 SHOULD 遵循
 * 這些規則，讓僅消費工作階段摘要的用戶端（例如工作階段清單）仍能看到
 * 有意義的狀態：
 *
 * - `status`：當 {@link SessionState.defaultChat | 預設聊天}存在時取其活動
 *   位元（`Idle` / `InProgress` / `InputNeeded` / `Error` — 位元 0–4），
 *   否則取最近修改的聊天。當工作階段中任何聊天需要輸入時**提升**為
 *   `InputNeeded`，且當任何聊天處於錯誤狀態時**提升**為 `Error` — 兩者皆
 *   覆寫預設聊天位元。正交旗標位元（`IsRead`、`IsArchived`）保持工作
 *   階段範圍。
 * - `activity`：鏡射預設聊天的活動字串，或當非預設聊天勝出時（例如
 *   引發 `InputNeeded` 的聊天）鏡射目前驅動已提升狀態位元之聊天的活動
 *   字串。
 * - `modifiedAt`：所有聊天 `modifiedAt` 的最大值。
 * - `workingDirectories`：工作階段層級集合。個別聊天 MAY 透過
 *   {@link ChatSummary.workingDirectories} 限制為子集；將這些向上彙總毫無
 *   意義，且 SHOULD NOT 嘗試。
 * - `changes`：跨所有聊天的選用彙總。生產者 MAY 對每個聊天的變更集
 *   統計加總，或回報最昂貴聊天的統計 — 視何者對主機計算更便宜而定。
 *
 * 具有單一聊天的工作階段會簡單滿足上述所有條件（聊天的值原樣通過）。
 * 這些規則僅在工作階段帶有多個聊天時才有意義。
 *
 * @category Session State
 */
export interface SessionSummary extends SessionMetadata {
  /** 工作階段 URI */
  resource: URI;
  /** 建立時間戳記（ISO 8601，例如 `"2025-03-10T18:42:03.123Z"`） */
  createdAt: string;
  /** 上次修改時間戳記（ISO 8601，例如 `"2025-03-10T18:42:03.123Z"`） */
  modifiedAt: string;
  /**
  * 與此工作階段關聯之檔案變更的彙總摘要。伺服器 MAY 填入此欄位以
  * 提供用戶端工作階段足跡的快速一覽檢視（例如用於清單呈現），而
  * 無需用戶端訂閱變更集。
  */
  changes?: ChangesSummary;
  /**
  * 伺服器定義的輕量級中繼資料，用戶端可用於工作階段呈現。協定不
  * 解譯這些值；生產者 SHOULD 保持有效負載小巧，因為摘要出現於
  * 工作階段清單與工作階段通知中。
  */
  _meta?: Record<string, unknown>;
}

/**
 * 描述與工作階段關聯之檔案變更的彙總計數。
 *
 * 所有欄位皆為選用，讓伺服器能僅填入其成本低廉可得的指標。
 *
 * @category Session State
 */
export interface ChangesSummary {
  /** 跨所有變更檔案的新增行總數。 */
  additions?: number;
  /** 跨所有變更檔案的刪除行總數。 */
  deletions?: number;
  /** 有變更的檔案數。 */
  files?: number;
}

// ─── Agent Selection ─────────────────────────────────────────────────────────

/**
 * 工作階段的已選自訂代理程式。
 *
 * `uri` 識別特定的自訂代理程式（與透過工作階段有效自訂公開的
 * {@link AgentCustomization.uri | `AgentCustomization.uri`} 相符）。消費者
 * 透過在工作階段的自訂樹中查找 `uri` 來解析代理程式的顯示名稱。
 *
 * 未選取 `agent` 的訊息使用提供者的預設行為。
 *
 * @category Session State
 */
export interface AgentSelection {
  /** 穩定的代理程式 URI（與 {@link AgentCustomization.uri} 相符）。 */
  uri: URI;
}

// ─── Session Config Types ────────────────────────────────────────────────────

/**
 * 工作階段設定屬性描述器。
 *
 * 以工作階段特定的顯示延伸擴充通用的 {@link ConfigPropertySchema}。
 *
 * @category Session Config Types
 */
export interface SessionConfigPropertySchema extends ConfigPropertySchema {
  /**
   * 顯示延伸：為 `true` 時，完整允許值集合過大而無法靜態列舉。用戶端
   * SHOULD 使用 `sessionConfigCompletions` 根據使用者輸入取得相符值。
   * `enum` 中的任何值為初始顯示用的種子/近期值。
   */
  enumDynamic?: boolean;
  /** 為 `true` 時，使用者可在工作階段建立後變更此屬性 */
  sessionMutable?: boolean;
}

/**
 * 描述可用工作階段設定中繼資料的 JSON Schema 物件。
 *
 * @category Session Config Types
 */
export interface SessionConfigSchema {
  /** JSON Schema：永遠為 `'object'` */
  type: 'object';
  /** JSON Schema：以屬性 id 為鍵的屬性描述器 */
  properties: Record<string, SessionConfigPropertySchema>;
  /** JSON Schema：必要屬性 id 的清單 */
  required?: string[];
}

/**
 * 即時工作階段設定中繼資料。
 *
 * 綱要描述可用設定屬性，而 values 包含每個已解析屬性的目前值。
 *
 * @category Session Config Types
 */
export interface SessionConfigState {
  /** 描述可用設定屬性的 JSON Schema */
  schema: SessionConfigSchema;
  /** 目前設定值 */
  values: Record<string, unknown>;
}

// ─── Tool Definition Types ───────────────────────────────────────────────────

/**
 * 描述工作階段中可用的工具，由伺服器或作用中用戶端提供。
 *
 * @category Tool Definition Types
 */
export interface ToolDefinition {
  /** 唯一工具識別碼 */
  name: string;
  /** 人類可讀的顯示名稱 */
  title?: string;
  /** 工具功能描述 */
  description?: string;
  /**
   * 定義預期輸入參數的 JSON Schema。
   *
   * 選用，因為用戶端提供的工具可能沒有正式綱要。鏡射 MCP
   * `Tool.inputSchema`。
   */
  inputSchema?: {
    type: 'object';
    properties?: Record<string, object>;
    required?: string[];
  };
  /**
   * 定義工具輸出結構的 JSON Schema。
   *
   * 鏡射 MCP `Tool.outputSchema`。
   */
  outputSchema?: {
    type: 'object';
    properties?: Record<string, object>;
    required?: string[];
  };
  /** 關於工具的行為提示。所有屬性皆為建議性。 */
  annotations?: ToolAnnotations;
  /**
   * 額外的提供者特定中繼資料。
   *
   * 鏡射 MCP `_meta` 慣例。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 關於工具的行為提示。所有屬性皆為建議性，且不保證能如實描述工具
 * 行為。
 *
 * 鏡射 Model Context Protocol 規範中的 MCP `ToolAnnotations`。
 *
 * @category Tool Definition Types
 */
export interface ToolAnnotations {
  /** 替代的人類可讀標題 */
  title?: string;
  /** 工具不修改其環境（預設：false） */
  readOnlyHint?: boolean;
  /** 工具可能執行破壞性更新（預設：true） */
  destructiveHint?: boolean;
  /** 以相同引數重複呼叫沒有額外效果（預設：false） */
  idempotentHint?: boolean;
  /** 工具可能與外部實體互動（預設：true） */
  openWorldHint?: boolean;
}

// ─── Customization Types ─────────────────────────────────────────────────────

/**
 * 自訂種類的判別欄位。
 *
 * {@link SessionState.customizations} 與 {@link AgentInfo.customizations}
 * 中的頂層項目不是容器自訂（{@link CustomizationType.Plugin | `Plugin`}
 * 或 {@link CustomizationType.Directory | `Directory`}），就是主機直接
 * 公開的 {@link CustomizationType.McpServer | `McpServer`} 項目。其餘
 * 種類僅作為容器的子項出現。
 *
 * @category Customization Types
 */
export const enum CustomizationType {
  Plugin = 'plugin',
  Directory = 'directory',
  Agent = 'agent',
  Skill = 'skill',
  Prompt = 'prompt',
  Rule = 'rule',
  Hook = 'hook',
  McpServer = 'mcpServer',
}

/**
 * 作為 {@link PluginCustomization} 或 {@link DirectoryCustomization} 子項
 * 出現的自訂類型。
 *
 * @category Customization Types
 */
export type ChildCustomizationType =
  | CustomizationType.Agent
  | CustomizationType.Skill
  | CustomizationType.Prompt
  | CustomizationType.Rule
  | CustomizationType.Hook
  | CustomizationType.McpServer;

/**
 * 每個自訂變體共用的欄位。
 *
 * @category Customization Types
 */
interface CustomizationBase {
  /**
   * 工作階段內唯一的不透明識別碼。由每個以特定自訂為目標的操作使用。
   * 由發布該自訂的一方（通常為代理主機）鑄造。
   */
  id: string;
  /**
   * 此自訂的來源 URI。可以是外掛 URL、檔案 URI 或目錄 URI。
   *
   * 對於存在於較大檔案中的宣告 — 例如內嵌於 `plugins.json` 資訊清單的
   * MCP 伺服器 — `uri` 指向包含檔案，而
   * {@link CustomizationBase.range | `range`} 將其縮窄至宣告的跨度。
   */
  uri: URI;
  /** 人類可讀名稱。 */
  name: string;
  /** 用於 UI 顯示的圖示。 */
  icons?: Icon[];
  /**
   * 當此自訂為較大檔案的子集時（例如 `plugins.json` 資訊清單中內嵌
   * `mcpServers` 區塊的一個項目），在
   * {@link CustomizationBase.uri | `uri`} 內的選用跨度。當自訂涵蓋整個
   * 資源時不存在。
   */
  range?: TextRange;
  /**
   * 此自訂的額外提供者特定中繼資料。
   *
   * 鏡射 MCP `_meta` 慣例。對協定為選用且不透明；生產者與消費者
   * 在帶外就其內容達成共識。
   */
  _meta?: Record<string, unknown>;
}

/**
 * {@link CustomizationLoadState} 的判別值。
 *
 * @category Customization Types
 */
export const enum CustomizationLoadStatus {
  Loading = 'loading',
  Loaded = 'loaded',
  Degraded = 'degraded',
  Error = 'error',
}

/**
 * 容器正由主機載入。
 *
 * @category Customization Types
 */
export interface CustomizationLoadingState {
  kind: CustomizationLoadStatus.Loading;
}

/**
 * 容器載入成功。
 *
 * @category Customization Types
 */
export interface CustomizationLoadedState {
  kind: CustomizationLoadStatus.Loaded;
}

/**
 * 容器部分載入但有警告。
 *
 * @category Customization Types
 */
export interface CustomizationDegradedState {
  kind: CustomizationLoadStatus.Degraded;
  /** 警告的人類可讀描述。 */
  message: string;
}

/**
 * 容器載入失敗。
 *
 * @category Customization Types
 */
export interface CustomizationErrorState {
  kind: CustomizationLoadStatus.Error;
  /** 人類可讀的錯誤訊息。 */
  message: string;
}

/**
 * 容器自訂（{@link PluginCustomization} 或
 * {@link DirectoryCustomization}）的判別聯集載入狀態。
 *
 * @category Customization Types
 */
export type CustomizationLoadState =
  | CustomizationLoadingState
  | CustomizationLoadedState
  | CustomizationDegradedState
  | CustomizationErrorState;

/**
 * 容器自訂共用的欄位。
 *
 * @category Customization Types
 */
interface ContainerCustomizationBase extends CustomizationBase {
  /** 此容器目前是否啟用。 */
  enabled: boolean;
  /**
   * 貢獻此容器之用戶端的 `clientId`。伺服器發起的項目不存在。
   */
  clientId?: string;
  /**
   * 主機回報的載入狀態。不存在表示主機尚未回報此容器的載入狀態。
   */
  load?: CustomizationLoadState;
  /**
   * 在此容器內發現的子項。
   *
   * 不存在表示主機尚未解析此容器。空陣列表示主機已解析容器且其未
   * 貢獻任何內容。
   */
  children?: ChildCustomization[];
}

/**
 * 一個 [Open Plugins](https://open-plugins.com/) 外掛。
 *
 * @category Customization Types
 */
export interface PluginCustomization extends ContainerCustomizationBase {
  type: CustomizationType.Plugin;
  /**
   * 外掛版本，取自 [Open Plugins](https://open-plugins.com/) 資訊清單的
   * 選用 `version` 欄位（semver，例如 `"1.2.0"`）。當資訊清單未宣告版本
   * — 該欄位在那裡為選用 — 或來源沒有版本概念時不存在。僅供出處/
   * 顯示之用：主機既不解析也不強制執行它。
   */
  version?: string;
}

/**
 * 由用戶端發布的 {@link PluginCustomization}。以不透明的 `nonce` 擴充
 * 伺服器面向的形狀，讓主機能偵測用戶端的外掛檢視何時變更，並僅在
 * 需要時重新解析。
 *
 * 用戶端 SHOULD 包含 `nonce`。發布時通常省略
 * {@link ContainerCustomizationBase.children | `children`} 與
 * {@link ContainerCustomizationBase.load | `load`} 等伺服器端欄位，
 * 並在解析後的外掛出現於 {@link SessionState.customizations} 時由主機
 * 填入。
 *
 * @category Customization Types
 */
export interface ClientPluginCustomization extends PluginCustomization {
  /** 主機用來偵測變更的不透明版本權杖。 */
  nonce?: string;
}

/**
 * 主機為此工作階段監視的目錄。
 *
 * 其存在於自訂清單中表示主機可從此目錄發現自訂。當 `writable` 為
 * `true` 時，用戶端 MAY 使用
 * [`resourceWrite`](/reference/common#resourcewrite) 將新自訂持久化至
 * 該目錄；主機接著會透過自訂操作公開產生的子項。
 *
 * 該目錄在磁碟上可能尚未存在。
 *
 * @category Customization Types
 */
export interface DirectoryCustomization extends ContainerCustomizationBase {
  type: CustomizationType.Directory;
  /** 此目錄持有的子自訂類型。 */
  contents: ChildCustomizationType;
  /** 用戶端是否可寫入此目錄。 */
  writable: boolean;
}

/**
 * 容器內子項自訂共用的欄位 — {@link AgentCustomization}、
 * {@link SkillCustomization}、{@link PromptCustomization}、
 * {@link RuleCustomization} 與 {@link HookCustomization}。
 *
 * {@link McpServerCustomization} 也是子項但不擴充此基礎：它永遠承載
 * 明確的 {@link McpServerCustomization.enabled}，因為它也可作為頂層
 * 自訂出現。
 *
 * @category Customization Types
 */
interface ChildCustomizationBase extends CustomizationBase {
  /**
   * 此子項是否個別啟用。不存在表示啟用，因此生產者只需設定它即可公開
   * 存在但自身被關閉的子項。
   *
   * 此旗標獨立於父容器：子項的**有效**啟用狀態為
   * `container.enabled && (child.enabled ?? true)`，因此停用的容器會
   * 停用每個子項，無論各子項自身的旗標為何。
   *
   * 子項以 id 透過
   * {@link SessionCustomizationToggledAction | `session/customizationToggled`}
   * 開啟或關閉。
   */
  enabled?: boolean;
}

/**
 * 由外掛或目錄貢獻的自訂代理程式。
 *
 * 鏡射 [Open Plugins agent](https://open-plugins.com/agent-builders/components/agents)
 * 格式：一個帶有 YAML frontmatter 的 markdown 檔案，其中本文為代理
 * 程式的系統提示。
 *
 * @category Customization Types
 */
export interface AgentCustomization extends ChildCustomizationBase {
  type: CustomizationType.Agent;
  /**
   * 代理程式專精於什麼以及何時叫用它的簡短描述。取自代理程式檔案
   * frontmatter 的 `description`。
   */
  description?: string;
  /**
   * 代理程式釘選的模型，取自代理程式檔案 frontmatter 的 `model`。
   * 不存在表示代理程式繼承工作階段的預設模型。
   */
  model?: string;
  /**
   * 代理程式範圍限制的工具名稱允許清單，取自代理程式檔案 frontmatter
   * 的 `tools`。非空清單將代理程式限制為確切那些工具。不存在 — 或
   * 空清單 — 不施加工作階段預設之外的任何限制：代理程式可使用任何
   * 可用工具。生產者透過省略該欄位而非傳送空陣列來表示「無限制」，
   * 因此空清單不承載與不存在不同的意義。
   */
  tools?: string[];
  /**
   * 為 `true` 時，代理程式不會自動委派至此自訂代理程式作為子代理程式；
   * 它只能由使用者選取。不存在或 `false` 表示代理程式 MAY 委派給它。
   */
  disableModelInvocation?: boolean;
  /**
   * 為 `true` 時，使用者無法選取此自訂代理程式（例如在選擇器中）；
   * 它仍可供代理程式自動委派。不存在或 `false` 表示使用者 MAY 選取
   * 它。
   */
  disableUserInvocation?: boolean;
}

/**
 * 由外掛或目錄貢獻的技能。
 *
 * 涵蓋兩種 [Open Plugins skill 格式](https://open-plugins.com/agent-builders/components/skills)
 * — `skills/` 目錄佈局（每個技能一個子目錄，各含一個
 * `SKILL.md`）與較扁平的 `commands/` 斜線指令技能目錄。
 *
 * @category Customization Types
 */
export interface SkillCustomization extends ChildCustomizationBase {
  type: CustomizationType.Skill;
  /**
   * 用於說明文字與自動叫用比對的簡短描述。取自技能 frontmatter 的
   * `description`。
   */
  description?: string;
  /**
   * 為 `true` 時，僅使用者可叫用此技能 — 代理程式不會自動叫用它。
   * 取自指令技能 frontmatter 的 `disable-model-invocation` 旗標。
   */
  disableModelInvocation?: boolean;
  /**
   * 為 `true` 時，使用者無法直接叫用此技能（例如作為斜線指令）；
   * 它仍可供代理程式自動叫用。不存在或 `false` 表示使用者 MAY 叫用
   * 它。
   */
  disableUserInvocation?: boolean;
}

/**
 * 由外掛或目錄貢獻的提示。
 *
 * @category Customization Types
 */
export interface PromptCustomization extends ChildCustomizationBase {
  type: CustomizationType.Prompt;
  /** 提示功能的簡短描述。 */
  description?: string;
}

/**
 * 由外掛或目錄貢獻的規則。
 *
 * 鏡射 [Open Plugins rule](https://open-plugins.com/agent-builders/components/rules)
 * 格式：一個 markdown 檔案（例如 `.mdc`），其本文在規則作用時注入至
 * 上下文。此類型也涵蓋工具特定的「instruction」格式（例如 VS Code
 * Copilot 的 `.github/instructions/*.md`），其僅在命名上不同 — 它們
 * 共用 `description`、選用的常駐啟用與選用的 glob 範圍限制的相同語意。
 *
 * @category Customization Types
 */
export interface RuleCustomization extends ChildCustomizationBase {
  type: CustomizationType.Rule;
  /**
   * 規則所強制執行之內容的描述。
   */
  description?: string;
  /**
   * 為 `true` 時，規則永遠作用（受 `globs` 約束，若有）。為 `false` 或
   * 不存在時，由代理程式或使用者決定是否套用該規則。
   */
  alwaysApply?: boolean;
  /**
   * 規則適用的 glob 模式。存在時，規則僅對相符檔案作用。
   */
  globs?: string[];
}

/**
 * 由外掛或目錄貢獻的掛鉤資訊清單。
 *
 * @category Customization Types
 */
export interface HookCustomization extends ChildCustomizationBase {
  type: CustomizationType.Hook;
}

/**
 * 由外掛或目錄貢獻的 MCP 伺服器。
 *
 * 當伺服器內嵌宣告於包含的外掛資訊清單時，`uri` 指向資訊清單檔案，
 * 而 {@link CustomizationBase.range | `range`} 將其縮窄至宣告的跨度。
 *
 * MCP 伺服器自訂也反映其目前狀態。
 *
 * @category Customization Types
 */
export interface McpServerCustomization extends CustomizationBase {
  type: CustomizationType.McpServer;
  /**
   * 此 MCP 伺服器目前是否啟用。
   */
  enabled: boolean;
  /**
   * MCP 伺服器的目前生命週期狀態。
   */
  state: McpServerState;
  /**
   * 用戶端用來將流量側通道傳入上游 MCP 伺服器本身的 `mcp://` 協定
   * 通道。該通道並非全新的原始 MCP 連線：它搭載於 AHP 傳輸上並跳過
   * MCP `initialize` 序列。
   *
   * 代理主機 MAY 僅在此通道上提供 MCP 的子集；所提供的子集由
   * 領域特定能力描述，例如
   * {@link McpServerCustomizationApps.capabilities} 中的那些。
   *
   * 通道 URI SHOULD 在伺服器生命週期內穩定，但代理主機 MAY 變更它
   * （例如跨重新啟動），且 MAY 僅在伺服器處於
   * {@link McpServerStatus.Ready | `Ready`} 時公開它。不存在表示目前
   * 沒有可用的側通道。
   */
  channel?: URI;
  /**
   * MCP App 支援。對支援 apps 的 MCP 伺服器，SHOULD 公開此屬性。
   */
  mcpApp?: McpServerCustomizationApps;
}

/**
 * 代理主機為呈現由此 MCP 伺服器提供之 MCP Apps 所需的資訊。
 *
 * @category MCP Server State
 */
export interface McpServerCustomizationApps {
  /**
   * AHP 主機能為由此伺服器支援的 Views 滿足的 MCP App
   * [`HostCapabilities`](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx)
   * 子集。用戶端將其直接送入傳遞給 View 的 `ui/initialize` 回應的
   * `hostCapabilities` 中。
   */
  capabilities: AhpMcpUiHostCapabilities;
}

/**
 * AHP 主機可從上游 MCP 伺服器（及 AHP 自身的轉送管線）推導出的 MCP
 * App
 * [`HostCapabilities`](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx)
 * 子集。公開於 {@link McpServerCustomizationApps.capabilities}，讓用戶端
 * 能將其直接送入傳遞給 MCP App View 的 `ui/initialize` 回應的
 * `hostCapabilities` 中。
 *
 * 欄位名稱與 MCP Apps 規範完全一致，讓 AHP 端生產者能將其直接送入
 * 傳遞給 View 的 `ui/initialize` 回應的 `hostCapabilities` 中。
 *
 * 此集合之外的能力（`openLinks`、`downloadFile`、`sandbox`、
 * `experimental`）由呈現 View 的 AHP 用戶端在本機決定，且不屬於此
 * AHP 層級通告的一部分 — 僅有伺服器推導的子集屬於。
 *
 * 代理主機 MUST 僅在其確實於 `mcp://` 通道上接受對應方法/通知時通告
 * 某項能力：
 *
 * - {@link serverTools}：主機代理 `tools/list` 與 `tools/call` 至 MCP
 *   伺服器。當 `listChanged` 為 `true` 時，主機也轉送
 *   `notifications/tools/list_changed`。
 * - {@link serverResources}：主機代理 `resources/read`、
 *   `resources/list` 與 `resources/templates/list` 至 MCP 伺服器。當
 *   `listChanged` 為 `true` 時，主機也轉送
 *   `notifications/resources/list_changed`。
 * - {@link logging}：主機接受來自 App 的 `notifications/message` 日誌
 *   項目並透過 `mcpNotification` 轉送（並將 `logging/setLevel` 呼叫
 *   轉送至伺服器）。
 * - {@link sampling}：主機透過 `mcpMethodCall` 提供
 *   `sampling/createMessage`。當 `sampling.tools` 存在時，主機也接受
 *   `CreateMessageRequest` 內的 SEP-1577 `tools` / `toolChoice` /
 *   `tool_use` 內容區塊。
 *
 * @category MCP Server State
 * @see {@link https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx | MCP Apps 規範 (SEP-1865)}
 */
export interface AhpMcpUiHostCapabilities {
  /** 生產者將 MCP `tools/*` 方法代理至上游伺服器。 */
  serverTools?: {
    /** 生產者轉送來自伺服器的 `notifications/tools/list_changed`。 */
    listChanged?: boolean;
  };
  /** 生產者將 MCP `resources/*` 方法代理至上游伺服器。 */
  serverResources?: {
    /** 生產者轉送來自伺服器的 `notifications/resources/list_changed`。 */
    listChanged?: boolean;
  };
  /** 生產者透過 `mcpNotification` 接受來自 App 的 `notifications/message` 日誌項目。 */
  logging?: Record<string, never>;
  /** 生產者透過 `mcpMethodCall` 提供 `sampling/createMessage`。 */
  sampling?: {
    /**
     * 生產者接受 `CreateMessageRequest` 內的 SEP-1577 `tools` /
     * `toolChoice` / `tool_use` 內容區塊。
     */
    tools?: Record<string, never>;
  };
}

/**
 * 存在於 {@link PluginCustomization} 或
 * {@link DirectoryCustomization} 內的子自訂。
 *
 * @category Customization Types
 */
export type ChildCustomization =
  | AgentCustomization
  | SkillCustomization
  | PromptCustomization
  | RuleCustomization
  | HookCustomization
  | McpServerCustomization;

/**
 * 工作階段中作用中的頂層自訂。可以是容器（{@link PluginCustomization}
 * 或 {@link DirectoryCustomization}），其葉自訂存在於其
 * {@link ContainerCustomizationBase.children | `children`} 陣列中，或是
 * 主機直接公開的單獨 {@link McpServerCustomization}。
 *
 * @category Customization Types
 */
export type Customization =
  | PluginCustomization
  | DirectoryCustomization
  | McpServerCustomization;


// ─── MCP Server State ────────────────────────────────────────────────────────

/**
 * {@link McpServerState} 聯集的判別欄位。
 *
 * @category MCP Server State
 */
export const enum McpServerStatus {
  /** 伺服器已註冊但尚未執行。 */
  Starting = 'starting',
  /** 伺服器執行中並提供請求服務。 */
  Ready = 'ready',
  /**
   * 伺服器可連線，但在啟動前或服務特定請求前需要額外驗證。承載用戶端
   * 取得權杖所需的 RFC 9728 Protected Resource Metadata；用戶端接著
   * 透過現有的 `authenticate` 指令推送權杖。
   */
  AuthRequired = 'authRequired',
  /** 伺服器啟動失敗、崩潰或以其他方式轉換至致命錯誤。 */
  Error = 'error',
  /** 伺服器已關閉。 */
  Stopped = 'stopped',
}

/**
 * MCP 伺服器目前為何處於 {@link McpServerStatus.AuthRequired} 狀態。
 * 鏡射 [MCP authorization 規範](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization.md)
 * 定義的三種失敗模式。
 *
 * @category MCP Server State
 */
export const enum McpAuthRequiredReason {
  /** 尚未提供權杖（HTTP 401，無先前權杖）。 */
  Required = 'required',
  /** 先前有效的權杖已過期或被撤銷（HTTP 401）。 */
  Expired = 'expired',
  /**
   * 提升授權：權杖存在但其範圍對所請求的操作不足（HTTP 403，含
   * `WWW-Authenticate: Bearer error="insufficient_scope"`）。
   *
   * 與 {@link Required} 和 {@link Expired} — 兩者通常在任何工具工作進行前
   * 出現 — 不同，`InsufficientScope` 幾乎總是由回合中途發出的 MCP 請求
   * （`tools/call`、`resources/read` 等）觸發。主機 SHOULD 將
   * {@link McpServerAuthRequiredState} 轉換與
   * {@link SessionSummary.status | 工作階段}上的
   * {@link SessionStatus.InputNeeded} 配對，讓活動在工作階段摘要層級
   * 可見，且用戶端 SHOULD 監看任何支援執行中工具呼叫的
   * {@link McpServerCustomization | MCP 伺服器}上的此種類，以便能呈現
   * 與受阻工具呼叫繫結的明確「授予更多存取權」介面。
   */
  InsufficientScope = 'insufficientScope',
}

/**
 * 伺服器已向主機註冊但尚未啟動。
 *
 * @category MCP Server State
 */
export interface McpServerStartingState {
  kind: McpServerStatus.Starting;
}

/**
 * 伺服器執行中並提供請求服務。
 *
 * @category MCP Server State
 */
export interface McpServerReadyState {
  kind: McpServerStatus.Ready;
}

/**
 * 預先註冊的 OAuth 用戶端，用戶端在解決 MCP 驗證挑戰時使用它，而非
 * 動態用戶端註冊。
 *
 * @category MCP Server State
 */
export interface McpOAuthClient {
  /** 向授權伺服器註冊的 OAuth 用戶端識別碼。 */
  clientId: string;
  /**
   * 機密用戶端的 OAuth 用戶端密碼。不存在表示用戶端為公開用戶端，並
   * 使用如授權碼搭配 PKCE 的無密碼流程。
   */
  clientSecret?: string;
}

/**
 * 可重複使用的 MCP 驗證挑戰 — 用戶端取得權杖並透過 `authenticate` 指令
 * 推送所需的 RFC 9728 探索資訊。刻意**不承載權杖**：此處描述的是所
 * 請求的內容，從不包含 ****** 本身。
 *
 * 由兩個描述同一 OAuth 挑戰不同觀點的獨立狀態機共用：
 *
 * - {@link McpServerAuthRequiredState} — MCP 伺服器本身在用戶端驗證前
 *   無法服務*任何*請求。
 * - {@link ToolCallAuthRequiredState} — 特定的進行中工具呼叫因等待
 *   驗證而暫停（通常為
 *   {@link McpAuthRequiredReason.InsufficientScope} 執行中途的提升
 *   授權）。伺服器狀態與工具呼叫狀態刻意保持分離：伺服器說「我需要
 *   驗證」與工具呼叫說「我正在等待該驗證」是可獨立為真的不同事實。
 *
 * @category MCP Server State
 */
export interface McpAuthRequirement {
  /** 為何需要驗證。 */
  reason: McpAuthRequiredReason;
  /**
   * 用於授權的預先註冊 OAuth 用戶端。存在時，用戶端 MUST 使用這些
   * 憑證而非動態用戶端註冊。
   */
  oauthClient?: McpOAuthClient;
  /**
   * RFC 9728 Protected Resource Metadata。`resource` 欄位為依 RFC 8707
   * 的標準 MCP 伺服器 URI，用作 OAuth `resource` 指示器。
   * `authorization_servers` 為 MCP authorization 規範所 REQUIRED。
   */
  resource: ProtectedResourceMetadata;
  /**
   * 目前挑戰所需的範圍，解析自
   * `WWW-Authenticate: ******"…"` 標頭（或 `scopes_supported`
   * 回退值）。對下次授權請求具權威性 — 用戶端 MUST NOT 假設與
   * `resource.scopes_supported` 有任何子集/超集關係。
   */
  requiredScopes?: string[];
  /** 人類可讀的提示，通常來自 OAuth `error_description`。 */
  description?: string;
}

/**
 * 伺服器可連線但在用戶端驗證前無法服務請求。鏡射
 * [RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728)
 * （Protected Resource Metadata）定義的探索流程，以及 MCP authorization
 * 規範所需的 OAuth 2.1 / RFC 6750 挑戰語意。
 *
 * 用戶端透過以現有的 `authenticate` 指令呼叫，並帶上此處承載的
 * {@link ProtectedResourceMetadata.resource | resource} 來回應此狀態。
 * MCP 伺服器**沒有** `notify/authRequired` 通知 — 操作串流是唯一
 * 真相來源。
 *
 * 當轉換是由回合期間發出的請求觸發 — 最常見為
 * {@link McpAuthRequiredReason.InsufficientScope | `InsufficientScope`}
 * 在工具呼叫中途出現 — 主機 SHOULD 一併在工作階段上引發
 * {@link SessionStatus.InputNeeded}，讓阻塞在摘要層級可見。用戶端
 * SHOULD 監看任何支援執行中工具呼叫之 MCP 伺服器上的此狀態，並呈現
 * 與該工具呼叫繫結的明確介面（例如「授予額外存取權」提示），而非
 * 仰賴使用者注意到自訂的狀態徽章。
 *
 * @category MCP Server State
 */
export interface McpServerAuthRequiredState extends McpAuthRequirement {
  kind: McpServerStatus.AuthRequired;
}

/**
 * 伺服器啟動失敗、崩潰或以其他方式轉換至無法恢復的錯誤。驗證失敗
 * 請使用 {@link McpServerStatus.AuthRequired}。
 *
 * @category MCP Server State
 */
export interface McpServerErrorState {
  kind: McpServerStatus.Error;
  /** 錯誤詳細資訊。 */
  error: ErrorInfo;
}

/**
 * 伺服器已關閉。主機 MAY 在此狀態後不久將伺服器從工作階段中完全
 * 移除。
 *
 * @category MCP Server State
 */
export interface McpServerStoppedState {
  kind: McpServerStatus.Stopped;
}

/**
 * 所有 MCP 伺服器生命週期狀態的判別聯集。
 * 以 `kind`（一個 {@link McpServerStatus} 值）作為判別。
 *
 * @category MCP Server State
 */
export type McpServerState =
  | McpServerStartingState
  | McpServerReadyState
  | McpServerAuthRequiredState
  | McpServerErrorState
  | McpServerStoppedState;
