/**
 * 聊天狀態類型 — 個別聊天的回合、訊息、回應部分、工具呼叫，
 * 以及在 `ahp-chat:` 通道上公開的引出／輸入請求。
 *
 * @module channels-chat/state
 */

import type { ModelSelection } from '../channels-root/state.js';
import type { AgentSelection, McpAuthRequirement, SessionStatus } from '../channels-session/state.js';
import type {
  ContentRef,
  ErrorInfo,
  FileEdit,
  StringOrMarkdown,
  TextRange,
  TextSelection,
  URI,
  UsageInfo,
} from '../common/state.js';

// ─── Chat State ──────────────────────────────────────────────────────────────

/**
 * 單一聊天的完整狀態，於用戶端訂閱該聊天的 URI 時載入。
 *
 * 聊天的輕量目錄表示為 {@link ChatSummary}，承載於
 * {@link SessionState.chats | `SessionState.chats`}。`ChatState` 將每個
 * {@link ChatSummary} 欄位直接 **反正規化** 到自身，讓訂閱者收到單一
 * 扁平物件，而不需合併巢狀的 `summary` 子物件。產生者 MUST 保持兩個
 * 表示一致：下方內嵌欄位的任何變更，也 SHOULD 透過相符的
 * {@link SessionChatUpdatedAction | `session/chatUpdated`} 操作在父工作階段上發布。
 *
 * @category Chat State
 */
export interface ChatState {
  // ── Summary fields (denormalized from ChatSummary) ─────────────────
  /** 聊天 URI */
  resource: URI;
  /** 聊天標題 */
  title: string;
  /** 目前的聊天狀態（沿用 SessionStatus 形狀） */
  status: SessionStatus;
  /** 此聊天目前正在做什麼的人類可讀描述 */
  activity?: string;
  /** 上次修改時間戳記（ISO 8601，例如 `"2025-03-10T18:42:03.123Z"`） */
  modifiedAt: string;
  /** 此聊天如何產生 */
  origin?: ChatOrigin;
  /**
   * 使用者可如何與此聊天互動。參見 {@link ChatInteractivity}。
   *
   * 支援代理程式團隊模式，其中工作者聊天為唯讀或隱藏。當此欄位缺省時，
   * 為向後相容預設為 {@link ChatInteractivity.Full}。
   */
  interactivity?: ChatInteractivity;
  /**
   * 此聊天的代理程式具有工具存取權的工作階段
   * {@link SessionState.workingDirectories | `workingDirectories`} 子集。每個
   * 項目 MUST 存在於所屬工作階段的 `workingDirectories` 中；伺服器 MUST 拒絕
   * 違反此限制的 `chat/workingDirectorySet` 操作。
   *
   * 當缺省時，聊天會繼承完整的工作階段集合。當存在但為空（不建議）時，
   * 聊天完全沒有工作目錄工具存取權。
   *
   * 分派 `chat/workingDirectorySet` / `chat/workingDirectoryRemoved` 以
   * 更新執行中聊天上的子集。
   */
  workingDirectories?: URI[];
  /**
   * 聊天的主要工作目錄 — 此聊天所居中的特殊根目錄（例如此聊天的代理程式
   * 行程根目錄、相對路徑的預設位置）。MUST 為此聊天的有效工作目錄之一
   * （{@link workingDirectories}，或當缺省時為工作階段的集合）。當代理程式
   * 廣告 {@link MultipleWorkingDirectoriesCapability.requiresPrimary} 時存在。
   *
   * **建立時即為唯讀且固定。** 其值取自
   * {@link CreateChatParams.primaryWorkingDirectory}（或對於工作階段的預設
   * 聊天，取自 {@link CreateSessionParams.primaryWorkingDirectory}），且在
   * 聊天生命週期內不會改變 — 沒有操作可變動它，且它不參與
   * `session/chatUpdated`。
   */
  primaryWorkingDirectory?: URI;

  // ── Conversation contents ──────────────────────────────────────────
  /** 已完成的回合 */
  turns: Turn[];
  /**
   * 用於將較舊的已完成回合載入此聊天狀態的游標。
   *
   * 存在時表示 `turns` 為尾端視窗，且有更多歷史回合可用。將此不透明
   * 游標傳遞給 `fetchTurns`；主機 MUST 在回應前將載入的回合插入狀態，
   * 並更新或清除此游標。缺省時表示狀態包含所有保留的回合。
   */
  turnsNextCursor?: string;
  /** 目前進行中的回合 */
  activeTurn?: ActiveTurn;
  /** 在適當時機注入目前回合的訊息 */
  steeringMessage?: PendingMessage;
  /** 在目前回合結束後自動作為新回合傳送的訊息 */
  queuedMessages?: PendingMessage[];
  /**
   * 使用者對此聊天進行中的草稿輸入 — 他們正在撰寫但尚未傳送的訊息，
   * 包含其 {@link Message.model | model} / {@link Message.agent | agent}
   * 選擇與附件。
   *
   * 用戶端 MAY 定期將其本地輸入狀態同步到此欄位，讓草稿在重新載入後存活，
   * 且對檢視相同聊天的其他用戶端可見。並 **不** 需要積極同步 — 用戶端
   * SHOULD 去抖動，且 MAY 僅在適當時機同步。在為既有聊天呈現輸入 UI 時，
   * 用戶端 SHOULD 使用任何 `draft` 來初始化其輸入狀態。一旦訊息傳送即清除
   * （設為 `undefined`）。
   */
  draft?: Message;
  /**
   * 此聊天的額外提供者特定中介資料。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 聊天的輕量目錄項目，承載於 {@link SessionState.chats | `SessionState.chats`}。
 * 完整對話存在於 {@link ChatState}，其內嵌（反正規化）了下方所有欄位。
 *
 * @category Chat State
 */
export interface ChatSummary {
  /** 聊天 URI */
  resource: URI;
  /** 聊天標題 */
  title: string;
  /** 目前的聊天狀態（沿用 SessionStatus 形狀） */
  status: SessionStatus;
  /** 此聊天目前正在做什麼的人類可讀描述 */
  activity?: string;
  /** 上次修改時間戳記（ISO 8601，例如 `"2025-03-10T18:42:03.123Z"`） */
  modifiedAt: string;
  /** 此聊天如何產生 */
  origin?: ChatOrigin;
  /**
   * 使用者可如何與此聊天互動。參見 {@link ChatInteractivity}。
   *
   * 支援代理程式團隊模式，其中工作者聊天為唯讀或隱藏。當此欄位缺省時，
   * 為向後相容預設為 {@link ChatInteractivity.Full}。
   */
  interactivity?: ChatInteractivity;
  /**
   * 此聊天使用的工作階段工作目錄子集。
   * 完整語意請參見 {@link ChatState.workingDirectories}。
   */
  workingDirectories?: URI[];
  /**
   * 聊天的主要工作目錄。
   * 完整語意請參見 {@link ChatState.primaryWorkingDirectory}。
   */
  primaryWorkingDirectory?: URI;
}

/**
 * {@link ChatOrigin} 的判別欄位 — 聊天如何產生。
 *
 * @category Chat State
 */
export const enum ChatOriginKind {
  /** 使用者明確建立此聊天（例如透過主機 UI）。 */
  User = 'user',
  /** 在特定回合從既有聊天分岔。 */
  Fork = 'fork',
  /** 從特定回合建立為獨立的側邊對話。 */
  SideChat = 'sideChat',
  /** 由執行於另一個聊天的工具呼叫產生（例如子代理程式委派）。 */
  Tool = 'tool',
}

/**
 * 建立側邊聊天時擷取的不可變選取文字快照。
 *
 * 主機在接受 `createChat` 時記錄此確切文字；之後對來源聊天的變更不會
 * 改變它。
 *
 * @category Chat State
 */
export interface SideChatSelection {
  /**
   * 在接受 `createChat` 時擷取的確切選取文字快照。
   *
   * MUST 非空。
   */
  text: string;
  /**
   * 主機拍攝快照時，包含 {@link text} 的回應部分的選用出處資訊。
   *
   * 僅供參考：這不是即時範圍或位移，且 MUST NOT 用於重新計算 `text`。
   */
  responsePartId?: string;
}

/**
 * 聊天如何產生。用戶端 MAY 使用它來呈現情境 UI（父項指標、分岔標記、
 * 「由工具產生」徽章）。
 *
 * 分岔與側邊聊天起源兩者都帶有穩定的頂層 `turnId`，伴隨其判別
 * `kind` 值，而非快照建立時該回合為作用中或歷史的狀態。消費者視需要將
 * 識別碼解析為來源聊天目前的 `activeTurn` 或保留的 `turns`。
 *
 * 當主機接受從來源聊天目前作用中回合建立側邊聊天時，它會快照保留的
 * 歷史，加上該回合目前的使用者訊息與任何已可用的部分代理程式回應。
 * 之後來源回合的差異不會回溯變更所建立側邊聊天的起始情境，且一旦
 * 來源回合完成，它仍由相同的 `turnId` 參照。側邊聊天起源 MAY 也保留
 * 在接受時擷取的不可變 {@link SideChatSelection | 選取文字快照}；其中
 * 的任何 `responsePartId` 僅為出處，不是範圍。
 *
 * `tool` 變體從工作者側記錄工具產生的工作者：其 `chat`/`toolCallId`
 * 識別父聊天中產生的工具呼叫。這是產生關係的標準記錄。相同的邊從父側
 * 由 {@link ToolResultSubagentContent} 呈現，其 `resource` 為此聊天的
 * URI；主機 MUST 保持兩者一致。
 *
 * @category Chat State
 */
export type ChatOrigin =
  | { kind: ChatOriginKind.User }
  | { kind: ChatOriginKind.Fork; chat: URI; turnId: string }
  | { kind: ChatOriginKind.SideChat; chat: URI; turnId: string; selection?: SideChatSelection }
  | { kind: ChatOriginKind.Tool; chat: URI; toolCallId: string };

/**
 * 使用者可如何與聊天互動。
 *
 * - `Full` — 使用者可傳送訊息並觀看（缺省時為預設）
 * - `ReadOnly` — 使用者可觀看但無法傳送訊息（例如代理程式團隊工作者）
 * - `Hidden` — 完全不顯示在 UI 中的內部工作者
 *
 * 支援代理程式團隊模式，其中主導聊天為完全互動，而工作者聊天為唯讀
 * （可見以供可觀測性）或隱藏（內部實作細節）。框架根據聊天的角色
 * 設定此值；UI 使用它來顯示適當的控制項。
 *
 * @category Chat State
 */
export const enum ChatInteractivity {
  /** 使用者可傳送訊息並觀看（缺省時為預設） */
  Full = 'full',
  /** 使用者可觀看但無法傳送訊息 */
  ReadOnly = 'read-only',
  /** 完全不顯示在 UI 中的內部工作者 */
  Hidden = 'hidden',
}

// ─── Pending Message Types ───────────────────────────────────────────────────

/**
 * 待處理訊息種類的判別欄位。
 *
 * @category Pending Message Types
 */
export const enum PendingMessageKind {
  /** 在適當時機注入目前回合 */
  Steering = 'steering',
  /** 在目前回合結束後自動作為新回合傳送 */
  Queued = 'queued',
}

/**
 * 已排入佇列、待未來傳遞給代理程式的訊息。
 *
 * 引導訊息會在進行中注入目前回合。佇列訊息會在目前回合自然結束後
 * 自動作為新回合啟動。
 *
 * @category Pending Message Types
 */
export interface PendingMessage {
  /** 此待處理訊息的唯一識別碼 */
  id: string;
  /** 將啟動下一回合的訊息 */
  message: Message;
}


// ─── Chat Input Types ────────────────────────────────────────────────────

/**
 * 用戶端如何完成輸入請求。
 *
 * @category Chat Input Types
 */
export const enum ChatInputResponseKind {
  Accept = 'accept',
  Decline = 'decline',
  Cancel = 'cancel',
}

/**
 * 問題／輸入控制項種類。
 *
 * @category Chat Input Types
 */
export const enum ChatInputQuestionKind {
  Text = 'text',
  Number = 'number',
  Integer = 'integer',
  Boolean = 'boolean',
  SingleSelect = 'single-select',
  MultiSelect = 'multi-select',
}

/**
 * 選擇式問題中的一個選項。
 *
 * @category Chat Input Types
 */
export interface ChatInputOption {
  /** 穩定的選項識別碼；對 MCP 列舉值而言此為列舉字串 */
  id: string;
  /** 顯示標籤 */
  label: string;
  /** 選用的次要文字 */
  description?: string;
  /** 此選項是否為建議／預設選擇 */
  recommended?: boolean;
}

interface ChatInputQuestionBase {
  /** 穩定的問題識別碼，作為 `answers` 中的索引鍵 */
  id: string;
  /** 簡短顯示標題 */
  title?: string;
  /** 顯示給使用者的提示 */
  message: string;
  /** 使用者是否必須回答此問題才能接受請求 */
  required?: boolean;
}

/** 聊天輸入請求中的文字問題。 */
export interface ChatInputTextQuestion extends ChatInputQuestionBase {
  kind: ChatInputQuestionKind.Text;
  /** 文字問題的格式提示，例如 `email`、`uri`、`date` 或 `date-time` */
  format?: string;
  /** 最小字串長度 */
  min?: number;
  /** 最大字串長度 */
  max?: number;
  /** 預設文字 */
  defaultValue?: string;
}

/** 聊天輸入請求中的數值問題。 */
export interface ChatInputNumberQuestion extends ChatInputQuestionBase {
  kind: ChatInputQuestionKind.Number | ChatInputQuestionKind.Integer;
  /**
   * 最小值
   * @format float
   */
  min?: number;
  /**
   * 最大值
   * @format float
   */
  max?: number;
  /**
   * 預設數值
   * @format float
   */
  defaultValue?: number;
}

/** 聊天輸入請求中的布林值問題。 */
export interface ChatInputBooleanQuestion extends ChatInputQuestionBase {
  kind: ChatInputQuestionKind.Boolean;
  /** 預設布林值 */
  defaultValue?: boolean;
}

/** 聊天輸入請求中的單選問題。 */
export interface ChatInputSingleSelectQuestion extends ChatInputQuestionBase {
  kind: ChatInputQuestionKind.SingleSelect;
  /** 使用者可從中選取的選項 */
  options: ChatInputOption[];
  /** 使用者是否可改為輸入文字而不選取選項 */
  allowFreeformInput?: boolean;
}

/** 聊天輸入請求中的多選問題。 */
export interface ChatInputMultiSelectQuestion extends ChatInputQuestionBase {
  kind: ChatInputQuestionKind.MultiSelect;
  /** 使用者可從中選取的選項 */
  options: ChatInputOption[];
  /** 使用者是否可在選取選項之外另輸入文字 */
  allowFreeformInput?: boolean;
  /** 最小選取項目數 */
  min?: number;
  /** 最大選取項目數 */
  max?: number;
}

/**
 * 聊天輸入請求中的單一問題。
 *
 * @category Chat Input Types
 */
export type ChatInputQuestion = ChatInputTextQuestion
  | ChatInputNumberQuestion
  | ChatInputBooleanQuestion
  | ChatInputSingleSelectQuestion
  | ChatInputMultiSelectQuestion;

/**
 * 由 {@link InputRequestResponsePart} 承載的請求有效負載。
 *
 * 伺服器會以 `chat/inputRequested` 建立或取代包含的回應部分。用戶端以
 * `chat/inputAnswerChanged` 同步草稿，並以 `chat/inputCompleted` 提交回應。
 *
 * @category Chat Input Types
 */
export interface ChatInputRequest {
  /** 穩定的請求識別碼 */
  id: string;
  /** 整個請求的顯示訊息 */
  message?: string;
  /** 使用者應檢閱或開啟的 URL，用於 URL 式引出 */
  url?: URI;
  /** 要詢問使用者的有序問題 */
  questions?: ChatInputQuestion[];
  /** 目前的草稿或已提交答案，以問題 ID 為索引鍵 */
  answers?: Record<string, ChatInputAnswer>;
}

/**
 * 答案值種類。
 *
 * @category Chat Input Types
 */
export const enum ChatInputAnswerValueKind {
  Text = 'text',
  Number = 'number',
  Boolean = 'boolean',
  Selected = 'selected',
  SelectedMany = 'selected-many',
}

/**
 * 為單一答案擷取的值。
 *
 * @category Chat Input Types
 */
export interface ChatInputTextAnswerValue {
  kind: ChatInputAnswerValueKind.Text;
  value: string;
}

export interface ChatInputNumberAnswerValue {
  kind: ChatInputAnswerValueKind.Number;
  /** @format float */
  value: number;
}

export interface ChatInputBooleanAnswerValue {
  kind: ChatInputAnswerValueKind.Boolean;
  value: boolean;
}

export interface ChatInputSelectedAnswerValue {
  kind: ChatInputAnswerValueKind.Selected;
  value: string;
  /** 改為輸入而非選取選項的自由格式文字 */
  freeformValues?: string[];
}

export interface ChatInputSelectedManyAnswerValue {
  kind: ChatInputAnswerValueKind.SelectedMany;
  value: string[];
  /** 除了選取選項之外另輸入的自由格式文字 */
  freeformValues?: string[];
}

export type ChatInputAnswerValue = ChatInputTextAnswerValue
  | ChatInputNumberAnswerValue
  | ChatInputBooleanAnswerValue
  | ChatInputSelectedAnswerValue
  | ChatInputSelectedManyAnswerValue;

export interface ChatInputAnswered {
  /** 答案狀態 */
  state: ChatInputAnswerState.Draft | ChatInputAnswerState.Submitted;
  /** 答案值 */
  value: ChatInputAnswerValue;
}

export interface ChatInputSkipped {
  /** 答案狀態 */
  state: ChatInputAnswerState.Skipped;
  /** 跳過時擷取的自由格式原因或值（若有） */
  freeformValues?: string[];
}

/**
 * 答案生命週期狀態。
 *
 * @category Chat Input Types
 */
export const enum ChatInputAnswerState {
  Draft = 'draft',
  Submitted = 'submitted',
  Skipped = 'skipped',
}

/**
 * 單一問題的草稿、已提交或已跳過答案。
 *
 * @category Chat Input Types
 */
export type ChatInputAnswer = ChatInputAnswered | ChatInputSkipped;


// ─── Turn Types ──────────────────────────────────────────────────────────────

/**
 * 回合如何結束。
 *
 * @category Turn Types
 */
export const enum TurnState {
  Complete = 'complete',
  Cancelled = 'cancelled',
  Error = 'error',
}

/**
 * {@link MessageAttachment} 變體的判別欄位。
 *
 * @category Turn Types
 */
export const enum MessageAttachmentKind {
  /** 簡單、不透明的附件，其表示由產生者描述。 */
  Simple = 'simple',
  /** 資料以 base64 字串內嵌的附件。 */
  EmbeddedResource = 'embeddedResource',
  /** 依 URI 參照資源的附件。 */
  Resource = 'resource',
  /** 參照註解通道上之註解的附件。 */
  Annotations = 'annotations',
  /** 參照另一個聊天之有界轉錄的附件。 */
  Chat = 'chat',
}

/**
 * 已完成的請求／回應循環。
 *
 * @category Turn Types
 */
export interface Turn {
  /** 回合識別碼 */
  id: string;
  /** 此回合開始時的 ISO 8601 時間戳記。 */
  startedAt?: string;
  /** 回合持續時間，以毫秒為單位。 */
  duration?: number;
  /** 啟動此回合的訊息 */
  message: Message;
  /**
   * 所有回應內容依串流順序排列：文字、工具呼叫、推理與內容參照。
   *
   * 消費者應透過串接 markdown 部分來衍生顯示文字，並透過篩選
   * `ToolCall` 部分來尋找工具呼叫。
   */
  responseParts: ResponsePart[];
  /** 權杖使用資訊 */
  usage: UsageInfo | undefined;
  /** 回合如何結束 */
  state: TurnState;
  /** 當狀態為 `'error'` 時的錯誤細節 */
  error?: ErrorInfo;
}

/**
 * 進行中的回合 — 助理正在主動串流。
 *
 * @category Turn Types
 */
export interface ActiveTurn {
  /** 回合識別碼 */
  id: string;
  /** 此回合開始時的 ISO 8601 時間戳記。 */
  startedAt: string;
  /** 啟動此回合的訊息 */
  message: Message;
  /**
   * 所有回應內容依串流順序排列：文字、工具呼叫、推理與內容參照。
   *
   * 當權限等待使用者核准時，工具呼叫部分會包含 `pendingPermissions`。
   */
  responseParts: ResponsePart[];
  /** 權杖使用資訊 */
  usage: UsageInfo | undefined;
}

/**
 * {@link MessageOrigin} 的判別欄位 — 識別訊息的產生者。
 *
 * @category Turn Types
 */
export enum MessageKind {
  /** 由使用者直接傳送。 */
  User = 'user',
  /**
   * 由代理程式本身而非使用者產生 — 例如，代理程式為其產生的聊天
   * 植入第一則訊息。
   */
  Agent = 'agent',
  /**
   * 由工具而非使用者產生 — 例如，工具產生一個工作者聊天，其第一則
   * 訊息帶有種子提示。
   */
  Tool = 'tool',
  /** 系統產生的通知，而非直接的使用者訊息。 */
  SystemNotification = 'systemNotification',
}

/**
 * 識別 {@link Message} 的起源 — 由誰產生。對於啟動回合的訊息
 * （{@link Turn.message}），這也是回合的起源；對於引導或佇列訊息，
 * 則僅為該訊息的起源。
 *
 * @category Turn Types
 */
export interface MessageOrigin {
  /** 產生此訊息的行為者種類。 */
  kind: MessageKind;
}

/**
 * 啟動或引導回合的訊息。訊息可來自使用者、代理程式、工具，或由系統
 * 產生（參見 {@link MessageOrigin}）。
 *
 * 附件 MAY 透過其 {@link MessageAttachmentBase.range} 欄位在
 * {@link Message.text} 中被參照。沒有範圍的附件仍與訊息關聯，但不
 * 對應文字中的特定跨度。
 *
 * @category Turn Types
 */
export interface Message {
  /** 訊息文字 */
  text: string;
  /** 訊息的起源 */
  origin: MessageOrigin;
  /** 檔案／選取範圍附件 */
  attachments?: MessageAttachment[];
  /**
   * 此訊息已（或將）用來傳送的模型。
   *
   * 對於歷史使用者／代理程式訊息，此記錄實際使用的模型，讓編輯或重送
   * 訊息的用戶端可保留該選擇。對於 {@link ChatState.draft | draft}，
   * 它承載使用者為其正在撰寫的訊息所挑選的模型。缺省表示套用代理主機
   * 的預設模型。
   */
  model?: ModelSelection;
  /**
   * 此訊息已（或將）用來傳送的自訂代理程式。
   *
   * 對於歷史訊息，此記錄實際使用的代理程式；對於
   * {@link ChatState.draft | draft}，它承載使用者挑選的代理程式。缺省
   * 表示無自訂代理程式 — 套用提供者的預設行為。
   */
  agent?: AgentSelection;
  /**
   * 此訊息的額外提供者特定中介資料。
   *
   * 用戶端 MAY 在此尋找已知的索引鍵以提供增強 UI，代理主機 MAY 用它
   * 承載不符合任何其他欄位的情境。鏡像 MCP 的 `_meta` 慣例。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 所有 {@link MessageAttachment} 變體共用的欄位。
 *
 * @category Turn Types
 */
export interface MessageAttachmentBase {
  /**
   * 附件的人類可讀標籤（例如檔案附件的檔名）。用於 UI 中的顯示。
   */
  label: string;

  /**
   * 若已定義，為 {@link Message.text} 中參照此附件的範圍。這是文字
   * 範圍，不是位元組範圍。
   */
  range?: TextRange;

  /**
   * 轉譯此附件的用戶端的建議顯示提示。可辨識的值包含：
   *
   * - `'image'`：附件為影像
   * - `'document'`：附件為文字文件
   * - `'symbol'`：附件為程式碼符號（例如函式或類別）
   * - `'directory'`：附件為資料夾
   * - `'selection'`：附件為文件內的選取範圍
   *
   * 實作 MAY 提供額外的值；用戶端 SHOULD 在遇到未知值時退回合理的
   * 預設值。
   */
  displayKind?: string;

  /**
   * 附件的額外實作定義中介資料。
   *
   * 若附件由 `completions` 指令產生，用戶端在傳送包含已接受補全的
   * 使用者訊息時，MUST 保留代理主機原先傳回的 `_meta` 的每個屬性。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 簡單、不透明的附件，其模型表示由產生者描述。
 *
 * @category Turn Types
 */
export interface SimpleMessageAttachment extends MessageAttachmentBase {
  /** 判別欄位 */
  type: MessageAttachmentKind.Simple;

  /**
   * 附件應顯示給模型的表示。
   *
   * 若附件由用戶端產生，此屬性 MUST 已定義，讓代理主機可正確解讀附件。
   * 當附件源自 `completions` 回應時，MAY 省略此屬性。
   */
  modelRepresentation?: string;
}

/**
 * 資料以 base64 字串內嵌的附件。
 *
 * 將此用於應隨使用者訊息本身傳遞而非另行擷取的小型二進位有效負載
 * （例如貼上的影像）。
 *
 * @category Turn Types
 */
export interface MessageEmbeddedResourceAttachment extends MessageAttachmentBase {
  /** 判別欄位 */
  type: MessageAttachmentKind.EmbeddedResource;
  /** Base64 編碼的二進位資料 */
  data: string;
  /** 內容 MIME 類型（例如 `"image/png"`、`"application/pdf"`） */
  contentType: string;
  /**
   * 附加文字資源內的選用選取範圍。
   *
   * 僅對文字資源有意義。
   */
  selection?: TextSelection;
}

/**
 * 依 URI 參照資源的附件。內容不會內嵌傳遞；消費者可在需要時透過
 * `resourceRead` 擷取它。
 *
 * @category Turn Types
 */
export interface MessageResourceAttachment extends MessageAttachmentBase, ContentRef {
  /** 判別欄位 */
  type: MessageAttachmentKind.Resource;
  /**
   * 被參照文字資源內的選用選取範圍。
   *
   * 僅對文字資源有意義。
   */
  selection?: TextSelection;
}

/**
 * 參照工作階段之註解通道上之註解的附件（參見 {@link AnnotationsState}）。
 *
 * 當 {@link annotationIds} 缺省時，附件參照通道上的每個註解；當存在時，
 * 僅參照列出的 {@link Annotation.id | 註解識別碼}。
 *
 * @category Turn Types
 */
export interface MessageAnnotationsAttachment extends MessageAttachmentBase {
  /** 判別欄位 */
  type: MessageAttachmentKind.Annotations;
  /**
   * 註解通道的 URI（通常為 `ahp-session:/<uuid>/annotations`）。
   * 符合 {@link AnnotationsSummary.resource}。
   */
  resource: URI;
  /**
   * 要參照的特定 {@link Annotation.id | 註解識別碼}。當缺省時，附件
   * 參照通道上的所有註解。
   */
  annotationIds?: string[];
}

/**
 * 透過固定已完成回合參照聊天轉錄的附件。
 *
 * 被參照的聊天 MUST 與訊息的聊天屬於同一工作階段。主機在接受訊息時，
 * 從其第一個保留回合到 `endTurn`（含）解析轉錄。之後的回合不會變更
 * 已傳送附件所代表的情境。
 *
 * 主機 MUST NOT 遞迴展開在參照轉錄內找到的聊天附件。用戶端 SHOULD 在
 * 被參照聊天之後被修剪時持續轉譯 `label`，並將開啟 `resource` 視為
 * 盡力而為。
 *
 * @category Turn Types
 */
export interface MessageChatAttachment extends MessageAttachmentBase {
  /** 判別欄位 */
  type: MessageAttachmentKind.Chat;
  /** 被參照聊天的 URI。 */
  resource: URI;
  /** 被參照轉錄中包含的最後一個已完成回合。 */
  endTurn: string;
}

/**
 * 與 {@link Message} 關聯的附件。
 *
 * @category Turn Types
 */
export type MessageAttachment =
  | SimpleMessageAttachment
  | MessageEmbeddedResourceAttachment
  | MessageResourceAttachment
  | MessageAnnotationsAttachment
  | MessageChatAttachment;

// ─── Response Parts ──────────────────────────────────────────────────────────

/**
 * 回應部分類型的判別欄位。
 *
 * @category Response Parts
 */
export const enum ResponsePartKind {
  Markdown = 'markdown',
  ContentRef = 'contentRef',
  ToolCall = 'toolCall',
  Reasoning = 'reasoning',
  SystemNotification = 'systemNotification',
  InputRequest = 'inputRequest',
}

/**
 * @category Response Parts
 */
export interface MarkdownResponsePart {
  /** 判別欄位 */
  kind: ResponsePartKind.Markdown;
  /** 部分識別碼，由 `chat/delta` 用來指定此部分進行內容附加 */
  id: string;
  /** Markdown 內容 */
  content: string;
}

/**
 * 作為對儲存於狀態樹外之大型內容參照的內容部分。
 *
 * @category Response Parts
 */
export interface ResourceReponsePart extends ContentRef {
  /** 判別欄位 */
  kind: ResponsePartKind.ContentRef;
}

/**
 * 表示為回應部分的工具呼叫。
 *
 * 工具呼叫為回應串流的一部分，與文字與推理交錯。`toolCall.toolCallId`
 * 作為指定此部分之操作的識別碼。
 *
 * @category Response Parts
 */
export interface ToolCallResponsePart {
  /** 判別欄位 */
  kind: ResponsePartKind.ToolCall;
  /** 完整工具呼叫生命週期狀態 */
  toolCall: ToolCallState;
}

/**
 * 來自模型的推理／思考內容。
 *
 * @category Response Parts
 */
export interface ReasoningResponsePart {
  /** 判別欄位 */
  kind: ResponsePartKind.Reasoning;
  /** 部分識別碼，由 `chat/reasoning` 用來指定此部分進行內容附加 */
  id: string;
  /** 累積的推理文字 */
  content: string;
}

/**
 * @category Response Parts
 */
export type ResponsePart =
  | MarkdownResponsePart
  | ResourceReponsePart
  | ToolCallResponsePart
  | ReasoningResponsePart
  | SystemNotificationResponsePart
  | InputRequestResponsePart;

/**
 * 回合回應串流中的作用中或已解決輸入請求（引出）。
 *
 * 伺服器以 `chat/inputRequested` 插入此部分。當 {@link response} 缺省時，
 * 用戶端可以 `chat/inputAnswerChanged` 更新答案草稿，並以
 * `chat/inputCompleted` 提交回應。完成時會就地更新此部分，使其串流
 * 位置穩定，且完整互動保持持久並可透過 `fetchTurns` 回填。
 *
 * 若回合在未提交回應的情況下結束，未解決的部分會留在已完成的回合
 * 轉錄中，且 {@link response} 缺省。
 *
 * @category Response Parts
 */
export interface InputRequestResponsePart {
  /** 判別欄位 */
  kind: ResponsePartKind.InputRequest;
  /**
   * 請求，承載其 `id`、`message`、`url`、`questions` 與目前的草稿或
   * 已提交 `answers`。
   */
  request: ChatInputRequest;
  /**
   * 請求如何被解決。在用戶端以 `chat/inputCompleted` 提交 `accept`、
   * `decline` 或 `cancel` 之前為缺省。
   */
  response?: ChatInputResponseKind;
}

/**
 * 作為回應串流一部分呈現的系統通知。
 *
 * 系統通知是由代理程式框架撰寫的訊息，需要對代理程式（供情境感知）
 * 與使用者（供轉錄連續性）皆可見。例如「背景子代理程式 X 已完成」
 * 或「任務 Y 已取消」。
 *
 * @category Response Parts
 */
export interface SystemNotificationResponsePart {
  /** 判別欄位 */
  kind: ResponsePartKind.SystemNotification;
  /** 系統通知的文字 */
  content: StringOrMarkdown;
  /**
   * 此通知的額外提供者特定中介資料。
   *
   * 主機 MAY 附加觸發通知之項目的機器可讀描述子，讓用戶端可在不解析
   * `content` 的情況下對其分類、加圖示、分組、篩選或在地化。用戶端
   * MAY 在此尋找已知的索引鍵以提供增強 UI，且當 `_meta` 缺省或無法
   * 辨識時，MUST 單獨從 `content` 一致地轉譯。
   */
  _meta?: Record<string, unknown>;
}


// ─── Tool Call Types ─────────────────────────────────────────────────────────

/**
 * 工具呼叫在生命週期狀態機中的狀態。
 *
 * @category Tool Call Types
 */
export const enum ToolCallStatus {
  Streaming = 'streaming',
  PendingConfirmation = 'pending-confirmation',
  Running = 'running',
  /**
   * 執行暫停，因為支援此呼叫的 MCP 伺服器需要驗證（通常是範圍不足的
   * 步進式驗證，於執行中浮現）。參見 {@link ToolCallAuthRequiredState}。
   */
  AuthRequired = 'auth-required',
  PendingResultConfirmation = 'pending-result-confirmation',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

/**
 * 工具呼叫如何被確認執行。
 *
 * - `NotNeeded` — 無需確認（自動核准）
 * - `UserAction` — 使用者明確核准
 * - `Setting` — 由持續性使用者設定核准
 *
 * @category Tool Call Types
 */
export const enum ToolCallConfirmationReason {
  NotNeeded = 'not-needed',
  UserAction = 'user-action',
  Setting = 'setting',
}

/**
 * 將模型評審器識別為確認需求的來源。
 *
 * @category Tool Call Types
 */
export const enum ToolCallRiskAssessmentKind {
  Judge = 'judge',
}

/**
 * 非同步模型評審器確認決定的生命週期狀態。
 *
 * @category Tool Call Types
 */
export const enum ToolCallRiskAssessmentStatus {
  Loading = 'loading',
  Complete = 'complete',
}

interface ToolCallRiskAssessmentBase {
  kind: ToolCallRiskAssessmentKind;
}

/**
 * 模型評審器仍在評估工具呼叫。
 *
 * @category Tool Call Types
 */
export interface ToolCallRiskAssessmentLoadingState extends ToolCallRiskAssessmentBase {
  status: ToolCallRiskAssessmentStatus.Loading;
}

/**
 * 模型評審器已完成其評估。
 *
 * @category Tool Call Types
 */
export interface ToolCallRiskAssessmentCompleteState extends ToolCallRiskAssessmentBase {
  status: ToolCallRiskAssessmentStatus.Complete;
  reason: StringOrMarkdown;
  /**
   * 評審器的正規化安全分數，其中 `0` 為不安全，`1` 為安全。
   * @format float
   */
  safety: number;
}

export type ToolCallRiskAssessment =
  | ToolCallRiskAssessmentLoadingState
  | ToolCallRiskAssessmentCompleteState;

/**
 * 工具呼叫為何被取消。
 *
 * @category Tool Call Types
 */
export const enum ToolCallCancellationReason {
  Denied = 'denied',
  Skipped = 'skipped',
  ResultDenied = 'result-denied',
}

/**
 * 確認選項是否代表核准或拒絕動作。
 *
 * @category Tool Call Types
 */
export const enum ConfirmationOptionKind {
  Approve = 'approve',
  Deny = 'deny',
}

/**
 * 伺服器為等待核准的工具呼叫所提供的確認選項。允許超出簡單
 * 核准／拒絕的更豐富選擇 — 例如「在此工作階段中核准」或
 * 「附帶原因拒絕」。
 *
 * @category Tool Call Types
 */
export interface ConfirmationOption {
  /** 選項的唯一識別碼，於確認操作中傳回 */
  id: string;
  /** 顯示給使用者的人類可讀標籤 */
  label: string;
  /** 此選項是否代表核准或拒絕 */
  kind: ConfirmationOptionKind;
  /**
   * 用於視覺分類的邏輯群組編號。
   *
   * 用戶端 SHOULD 依選項定義的順序顯示選項，且 MAY 使用不同的群組
   * 編號在選項的邏輯叢集之間插入分隔線。
   */
  group?: number;
}

export const enum ToolCallContributorKind {
  Client = 'client',
  MCP = 'mcp',
}

export interface ToolCallClientContributor {
  kind: ToolCallContributorKind.Client;
  /**
   * 若此工具由用戶端提供，為所屬用戶端的 `clientId`。伺服器端工具
   * 為缺省。
   *
   * 設定時，所識別的用戶端負責執行工具並以結果分派
   * `chat/toolCallComplete`。
   */
  clientId: string;
}

export interface ToolCallMcpContributor {
  kind: ToolCallContributorKind.MCP;
  /**
   * 在 {@link SessionState.customizations} 中對應 MCP 伺服器的自訂 ID。
   */
  customizationId: string;
}

export type ToolCallContributor = ToolCallClientContributor | ToolCallMcpContributor;

/**
 * 所有工具呼叫狀態共用的中介資料。
 *
 * @category Tool Call Types
 * @remarks
 * 如 `toolName` 等欄位在線上承載代理程式特定的識別碼，儘管有代理程式
 * 無關的設計原則。這些是為了除錯與記錄目的而存在。未來版本可能會將這些
 * 移至獨立的診斷通道，或更清楚地為其命名空間。
 */
interface ToolCallBase {
  /** 唯一的工具呼叫識別碼 */
  toolCallId: string;
  /** 內部工具名稱（用於除錯／記錄） */
  toolName: string;
  /** 人類可讀的工具名稱 */
  displayName: string;
  /** 工具呼叫意圖執行之事的人類可讀描述 */
  intention?: string;
  /**
   * 對被呼叫工具之貢獻者的參照。
   */
  contributor?: ToolCallContributor;
  /**
   * 此工具呼叫的額外提供者特定中介資料。
   *
   * 這 MAY 包含對應至 MCP 工具呼叫中 MCP Apps (SEP-1865)
   * `McpUiToolMeta` 的 `ui` 欄位，可與 {@link contributor} 結合使用以
   * 服務 MCP Apps。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 工具呼叫參數完全接收後可用的屬性。
 *
 * @category Tool Call Types
 */
interface ToolCallParameterFields {
  /** 描述工具將執行什麼的訊息 */
  invocationMessage: StringOrMarkdown;
  /** 原始工具輸入 */
  toolInput?: string;
}

/**
 * 工具執行結果細節，於執行完成後可用。
 *
 * @category Tool Call Types
 */
export interface ToolCallResult {
  /** 工具是否成功 */
  success: boolean;
  /** 工具已執行之事的過去式描述 */
  pastTenseMessage: StringOrMarkdown;
  /**
   * 非結構化結果內容區塊。
   *
   * 這鏡像 MCP `CallToolResult` 的 `content` 欄位。
   */
  content?: ToolResultContent[];
  /**
   * 選用的結構化結果物件。
   *
   * 這鏡像 MCP `CallToolResult` 的 `structuredContent` 欄位。
   */
  structuredContent?: Record<string, unknown>;
  /** 當工具失敗時的錯誤細節 */
  error?: { message: string; code?: string };
}

/**
 * LM 正在串流工具呼叫參數。
 *
 * @category Tool Call Types
 */
export interface ToolCallStreamingState extends ToolCallBase {
  status: ToolCallStatus.Streaming;
  /** 目前為止累積的部分參數 */
  partialInput?: string;
  /** 參數串流時顯示的進度訊息 */
  invocationMessage?: StringOrMarkdown;
}

/**
 * 參數已完整，或執行中的工具需要重新確認（例如執行中的權限檢查）。
 *
 * @category Tool Call Types
 */
export interface ToolCallPendingConfirmationState extends ToolCallBase, ToolCallParameterFields {
  status: ToolCallStatus.PendingConfirmation;
  /** 確認提示的簡短標題（例如 `"Run in terminal"`、`"Write file"`） */
  confirmationTitle?: StringOrMarkdown;
  /** 促成此確認需求的風險評估。 */
  riskAssessment?: ToolCallRiskAssessment;
  /** 此工具呼叫將執行的檔案編輯，供確認前預覽 */
  edits?: { items: FileEdit[] };
  /** 代理主機是否允許用戶端在確認前編輯工具的輸入參數 */
  editable?: boolean;
  /**
   * 伺服器為此確認提供的選項。當存在時，用戶端 SHOULD 改為轉譯這些
   * 選項，而非單純的核准／拒絕 UI。每個選項屬於一個
   * {@link ConfirmationOptionGroup}，讓用戶端仍可分類這些選擇。
   */
  options?: ConfirmationOption[];
}

/**
 * 存在於確認已解決 **之後** 之每個工具呼叫狀態上的欄位：
 * {@link ToolCallRunningState}、{@link ToolCallAuthRequiredState}、
 * {@link ToolCallPendingResultConfirmationState} 與
 * {@link ToolCallCompletedState}。`ToolCallPendingConfirmationState`
 * （尚未確認）與 `ToolCallCancelledState`（拒絕路徑 — 從未執行）不
 * 滿足此不變式，因此它們獨立保留自己的 `selectedOption` 欄位，而非
 * 擴充此欄位。
 *
 * @category Tool Call Types
 */
interface ToolCallPostConfirmationFields {
  /** 工具如何被確認執行 */
  confirmed: ToolCallConfirmationReason;
  /** 使用者所選的確認選項（若有提供確認選項） */
  selectedOption?: ConfirmationOption;
}

/**
 * 工具正在主動執行。
 *
 * @category Tool Call Types
 */
export interface ToolCallRunningState extends ToolCallBase, ToolCallParameterFields, ToolCallPostConfirmationFields {
  status: ToolCallStatus.Running;
  /**
   * 工具仍在執行時產生的部分內容。
   *
   * 例如，終端機內容區塊讓用戶端可在工具完成前訂閱即時輸出。
   */
  content?: ToolResultContent[];
}

/**
 * 執行中的工具呼叫暫停，因為支援它的 MCP 伺服器需要驗證 — 最常見為
 * 由 `tools/call` 請求本身觸發的 {@link McpAuthRequirement.reason |
 * `insufficientScope`} 步進式驗證。只能從 {@link ToolCallRunningState}
 * 到達，且通常在驗證後返回該處：`running` → `auth-required` →
 * `running` → …。用戶端也可改為不分派驗證，透過分派帶有 **失敗**
 * 結果的 `chat/toolCallComplete` 來取消呼叫，且一律直接移至
 * {@link ToolCallCompletedState} — 此路徑上 `requiresResultConfirmation`
 * 會被忽略，因此永遠不會進入 {@link ToolCallPendingResultConfirmationState}。
 * 從此狀態分派的 **成功** 結果為無效，且 MUST 被化簡器作為 no-op
 * 拒絕／忽略，因為挑戰後執行從未恢復。
 *
 * 這是 {@link McpServerAuthRequiredState} 的工具呼叫層級對應 — 該狀態
 * 表示 MCP *伺服器* 無法服務任何請求；此狀態表示 *此特定呼叫* 正在
 * 等待相同種類的挑戰。兩者獨立分派，且 MAY 同時為真或不同時：例如，
 * 由單一工具呼叫觸發的 `insufficientScope` 挑戰不必封鎖整個伺服器。
 *
 * 由於挑戰一律透過現有的 `authenticate` 指令推送權杖來解決，此狀態
 * 只能源自 {@link ToolCallContributorKind.MCP | 由 MCP 伺服器貢獻} 的
 * 工具呼叫 — `contributor` 因此被窄化（與其他工具呼叫狀態上選用、
 * 多種類的 `contributor` 不同）。
 *
 * @category Tool Call Types
 */
export interface ToolCallAuthRequiredState extends ToolCallBase, ToolCallParameterFields, ToolCallPostConfirmationFields {
  status: ToolCallStatus.AuthRequired;
  /** 貢獻此工具呼叫的 MCP 伺服器 — 一律為 MCP，絕非用戶端工具。 */
  contributor: ToolCallMcpContributor;
  /** 封鎖此呼叫的驗證挑戰。 */
  auth: McpAuthRequirement;
  /** 呼叫為驗證暫停前產生的部分內容。 */
  content?: ToolResultContent[];
}

/**
 * 工具已完成執行，等待用戶端核准結果。
 *
 * @category Tool Call Types
 */
export interface ToolCallPendingResultConfirmationState extends ToolCallBase, ToolCallParameterFields, ToolCallResult, ToolCallPostConfirmationFields {
  status: ToolCallStatus.PendingResultConfirmation;
}

/**
 * 工具已成功完成或發生錯誤。
 *
 * @category Tool Call Types
 */
export interface ToolCallCompletedState extends ToolCallBase, ToolCallParameterFields, ToolCallResult, ToolCallPostConfirmationFields {
  status: ToolCallStatus.Completed;
}

/**
 * 工具呼叫在執行前被取消。
 *
 * @category Tool Call Types
 */
export interface ToolCallCancelledState extends ToolCallBase, ToolCallParameterFields {
  status: ToolCallStatus.Cancelled;
  /** 工具為何被取消 */
  reason: ToolCallCancellationReason;
  /** 解釋取消的選用訊息 */
  reasonMessage?: StringOrMarkdown;
  /** 使用者建議改為執行的動作 */
  userSuggestion?: Message;
  /** 使用者所選的確認選項（若有提供確認選項） */
  selectedOption?: ConfirmationOption;
}

/**
 * 所有工具呼叫生命週期狀態的判別聯集。
 *
 * 完整狀態機圖請參見
 * [狀態模型指南](/guide/state-model.html#tool-call-lifecycle)。
 *
 * @category Tool Call Types
 */
export type ToolCallState =
  | ToolCallStreamingState
  | ToolCallPendingConfirmationState
  | ToolCallRunningState
  | ToolCallAuthRequiredState
  | ToolCallPendingResultConfirmationState
  | ToolCallCompletedState
  | ToolCallCancelledState;

/**
 * 會因用戶端確認而封鎖的兩個工具呼叫狀態：執行前的參數確認
 * （{@link ToolCallPendingConfirmationState}）與執行後的結果確認
 * （{@link ToolCallPendingResultConfirmationState}）。
 *
 * {@link ToolCallAuthRequiredState} 刻意 **不** 屬於此聯集：它不因
 * `chat/toolCallConfirmed` 式的用戶端決定而封鎖，而是因用戶端完成
 * OAuth 流程並呼叫 `authenticate` 而封鎖。其工作階段層級呈現請參見
 * {@link SessionToolAuthenticationRequest}。
 *
 * 在工作階段層級由 {@link SessionToolConfirmationRequest} 呈現。
 *
 * @category Tool Call Types
 */
export type ToolCallConfirmationState =
  | ToolCallPendingConfirmationState
  | ToolCallPendingResultConfirmationState;


// ─── Tool Result Content ─────────────────────────────────────────────────────

/**
 * 工具結果內容類型的判別欄位。
 *
 * @category Tool Result Content
 */
export const enum ToolResultContentType {
  Text = 'text',
  EmbeddedResource = 'embeddedResource',
  Resource = 'resource',
  FileEdit = 'fileEdit',
  Terminal = 'terminal',
  Subagent = 'subagent',
}

/**
 * 工具結果中的文字內容。
 *
 * 鏡像 MCP `TextContent`。
 *
 * @category Tool Result Content
 */
export interface ToolResultTextContent {
  type: ToolResultContentType.Text;
  /** 文字內容 */
  text: string;
}

/**
 * 內嵌於工具結果的 Base64 編碼二進位內容。
 *
 * 鏡像 MCP `EmbeddedResource`（用於內嵌二進位資料）。
 *
 * @category Tool Result Content
 */
export interface ToolResultEmbeddedResourceContent {
  type: ToolResultContentType.EmbeddedResource;
  /** Base64 編碼的資料 */
  data: string;
  /** 內容類型（例如 `"image/png"`、`"application/pdf"`） */
  contentType: string;
}

/**
 * 對儲存於工具結果外之資源的參照。
 *
 * 包裝 {@link ContentRef} 以延遲載入大型結果。
 *
 * @category Tool Result Content
 */
export interface ToolResultResourceContent extends ContentRef {
  type: ToolResultContentType.Resource;
}

/**
 * 描述工具執行的檔案修改。
 *
 * @category Tool Result Content
 */
export interface ToolResultFileEditContent extends FileEdit {
  type: ToolResultContentType.FileEdit;
}

/**
 * 對輸出與此工具結果相關之終端機的參照。
 *
 * 用戶端可訂閱終端機的 URI 以即時串流其輸出，在工具執行時提供即時
 * 回饋。
 *
 * 當指令結束時，{@link result} 會填入完成的結果中，為未訂閱的用戶端
 * 保留結果。這記錄的是指令的結束，而非終端機的結束 — 終端機之後
 * 可能會繼續執行。
 *
 * @category Tool Result Content
 */
export interface ToolResultTerminalContent {
  type: ToolResultContentType.Terminal;
  /** 終端機 URI（可訂閱以取得完整終端機狀態） */
  resource: URI;
  /** 終端機內容的顯示標題 */
  title: string;
  /**
   * 此終端機式資源是否由偽終端機支援。當 `false` 時，輸出為純文字，
   * 且用戶端不需解析 VT 序列。
   */
  isPty?: boolean;
  /** 指令的結果，於其結束後存在。 */
  result?: TerminalCommandResult;
}

/**
 * 在終端機式工具中執行之指令的結果，於指令結束時填入
 * {@link ToolResultTerminalContent.result}。
 *
 * @category Tool Result Content
 */
export interface TerminalCommandResult {
  /** 已完成指令的結束代碼（若執行階段有回報） */
  exitCode?: number;
  /**
   * 指令輸出的預覽，供未訂閱終端機或在其處置後才抵達的用戶端使用。
   * 當 `isPty` 為 `true` 時，預覽可能包含 VT 序列；當 `false` 時為
   * 純文字。
   */
  preview?: string;
  /** `preview` 是否已知為不完整或已截斷 */
  truncated?: boolean;
}

/**
 * 內嵌於工具結果中的參照，指向由工具呼叫產生的工作者聊天（子代理程式
 * 委派），由聊天 URI（`ahp-chat:/...`）參照。
 *
 * 這是產生工具呼叫對工作者的正向檢視。工作者聊天透過其
 * {@link ChatOrigin}（`kind: 'tool'`）反向記錄相同的邊，其 `toolCallId`
 * 識別發出此內容的工具呼叫。
 *
 * @category Tool Result Content
 */
export interface ToolResultSubagentContent {
  type: ToolResultContentType.Subagent;
  /** 工作者聊天 URI（可訂閱以取得完整聊天狀態） */
  resource: URI;
  /** 子代理程式的顯示標題 */
  title: string;
  /** 內部代理程式名稱 */
  agentName?: string;
  /** 子代理程式任務的人類可讀描述 */
  description?: string;
}

/**
 * 工具結果中的內容區塊。
 *
 * 鏡像 MCP `CallToolResult.content` 中的內容區塊，加上用於延遲載入大型
 * 結果的 `ToolResultResourceContent`、用於檔案編輯差異的
 * `ToolResultFileEditContent`、用於即時終端機輸出與指令完成中介資料的
 * `ToolResultTerminalContent`，以及用於工具產生工作者聊天的
 * `ToolResultSubagentContent`（AHP 擴充）。
 *
 * @category Tool Result Content
 */
export type ToolResultContent =
  | ToolResultTextContent
  | ToolResultEmbeddedResourceContent
  | ToolResultResourceContent
  | ToolResultFileEditContent
  | ToolResultTerminalContent
  | ToolResultSubagentContent;
