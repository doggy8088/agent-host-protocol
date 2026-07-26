/**
 * 聊天通道操作 — `ahp-chat:` 通道狀態的變動。
 *
 * @module channels-chat/actions
 */

import { ActionType } from '../common/actions.js';
import type { StringOrMarkdown, ErrorInfo, FileEdit, UsageInfo, URI } from '../common/state.js';
import type { McpAuthRequirement } from '../channels-session/state.js';
import type {
  Message,
  ResponsePart,
  ToolCallResult,
  ToolResultContent,
  ChatInputAnswer,
  ChatInputRequest,
  ChatInputResponseKind,
  ConfirmationOption,
  ToolCallContributor,
  ToolCallRiskAssessment,
  Turn,
} from './state.js';
import {
  ToolCallConfirmationReason,
  ToolCallCancellationReason,
  PendingMessageKind,
} from './state.js';

// ─── Tool Call Action Base ───────────────────────────────────────────────────

/**
 * 所有工具呼叫範圍操作的基礎介面，帶有共同的回合與工具呼叫識別碼。擁有者聊天 URI 由封閉的 {@link ActionEnvelope} 的 `channel` 欄位識別。
 *
 * @category Chat Actions
 */
interface ToolCallActionBase {
  /** 回合識別碼 */
  turnId: string;
  /** 工具呼叫識別碼 */
  toolCallId: string;
  /**
   * 此工具呼叫的額外提供者特定中繼資料。
   *
   * 用戶端 MAY 在此尋找已知鍵以提供增強的 UI。
   * 例如，帶有 `{ input: string; output: string }` 的 `ptyTerminal` 鍵
   * 表示該工具在終端機上操作（`input` 與 `output` 都可能包含跳脫序列）。
   */
  _meta?: Record<string, unknown>;
}


// ─── Chat Actions ───────────────────────────────────────────────────────────

/**
 * 新訊息已傳送給代理程式，且新回合開始。
 *
 * 用戶端僅被允許傳送 {@link MessageKind.User} 訊息。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatTurnStartedAction {
  type: ActionType.ChatTurnStarted;
  /** 回合識別碼 */
  turnId: string;
  /** 此回合開始時的 ISO 8601 時間戳記。 */
  startedAt: string;
  /** 新訊息 */
  message: Message;
  /** 若此回合是從佇列訊息自動啟動，該訊息的 ID */
  queuedMessageId?: string;
  /**
   * 此操作的額外提供者特定中繼資料。
   *
   * 用戶端 MAY 在此尋找已知鍵以提供增強的 UI，且代理主機 MAY 用它來承載不適合任何其他欄位的個別事件上下文 — 例如，將事件歸因於特定代理程式（例如在回合內運作的子代理程式）。沿用 MCP `_meta` 慣例。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 來自助理的串流文字區塊，附加到特定回應部分。
 *
 * 伺服器 MUST 先發出 `chat/responsePart` 以建立目標部分（markdown 或推理），再使用此操作將文字附加到它。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatDeltaAction {
  type: ActionType.ChatDelta;
  /** 回合識別碼 */
  turnId: string;
  /** 要附加到的回應部分識別碼 */
  partId: string;
  /** 文字區塊 */
  content: string;
  /**
   * 此操作的額外提供者特定中繼資料。
   *
   * 用戶端 MAY 在此尋找已知鍵以提供增強的 UI，且代理主機 MAY 用它來承載不適合任何其他欄位的個別事件上下文 — 例如，將事件歸因於特定代理程式（例如在回合內運作的子代理程式）。沿用 MCP `_meta` 慣例。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 附加到回應的結構化內容。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatResponsePartAction {
  type: ActionType.ChatResponsePart;
  /** 回合識別碼 */
  turnId: string;
  /** 回應部分（markdown 或內容參照） */
  part: ResponsePart;
  /**
   * 此操作的額外提供者特定中繼資料。
   *
   * 用戶端 MAY 在此尋找已知鍵以提供增強的 UI，且代理主機 MAY 用它來承載不適合任何其他欄位的個別事件上下文 — 例如，將事件歸因於特定代理程式（例如在回合內運作的子代理程式）。沿用 MCP `_meta` 慣例。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 工具呼叫開始 — 參數正從 LM 串流傳入。
 *
 * 伺服器設定 {@link ToolCallContributor | `contributor`} 以識別工具的起源。對於用戶端提供的工具，具名用戶端負責在工具到達 `running` 狀態時執行它，並分派 `chat/toolCallComplete`。對於 MCP 伺服器提供的工具，伺服器會針對具名的 `McpServerCustomization` 執行呼叫。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatToolCallStartAction extends ToolCallActionBase {
  type: ActionType.ChatToolCallStart;
  /** 內部工具名稱（用於除錯/日誌） */
  toolName: string;
  /** 人類可讀的工具名稱 */
  displayName: string;
  /** 工具呼叫意圖執行之動作的人類可讀描述 */
  intention?: string;
  /**
   * 所呼叫工具之貢獻者的參照。對於非由用戶端或 MCP 伺服器貢獻的伺服器端工具則不存在。
   */
  contributor?: ToolCallContributor;
}

/**
 * 工具呼叫的串流部分參數。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatToolCallDeltaAction extends ToolCallActionBase {
  type: ActionType.ChatToolCallDelta;
  /** 要附加的部分參數內容 */
  content: string;
  /** 更新的進度訊息 */
  invocationMessage?: StringOrMarkdown;
}

/**
 * 工具呼叫參數已完成，或執行中的工具需要重新確認。
 *
 * 當針對 `streaming` 工具呼叫分派時，會轉換到 `pending-confirmation`，或若設定了 `confirmed` 則直接轉換到 `running`。
 *
 * 當針對 `running` 工具呼叫分派時（例如執行中途需要權限），會轉換回 `pending-confirmation`。`invocationMessage` 與 `_meta` SHOULD 被更新以描述所需的特定確認。用戶端使用標準 `chat/toolCallConfirmed` 流程來核准或拒絕。
 *
 * 對於用戶端提供的工具，伺服器通常會將 `confirmed` 設為 `'not-needed'`，讓工具直接轉換到 `running`，讓擁有用戶端能立即開始執行。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatToolCallReadyAction extends ToolCallActionBase {
  type: ActionType.ChatToolCallReady;
  /** 描述工具將執行之動作或所需確認的訊息 */
  invocationMessage: StringOrMarkdown;
  /** 原始工具輸入 */
  toolInput?: string;
  /** 確認提示的簡短標題（例如 `"Run in terminal"`、`"Write file"`） */
  confirmationTitle?: StringOrMarkdown;
  /** 促成確認需求的風險評估。 */
  riskAssessment?: ToolCallRiskAssessment;
  /** 此工具呼叫將執行的檔案編輯，用於確認前的預覽 */
  edits?: { items: FileEdit[] };
  /** 代理主機是否允許用戶端在確認前編輯工具的輸入參數 */
  editable?: boolean;
  /** 若設定，工具已自動確認並直接轉換到 `running` */
  confirmed?: ToolCallConfirmationReason;
  /**
   * 伺服器為此確認提供的選項。若存在，用戶端 SHOULD 改為渲染這些選項，而非單純的核准/拒絕 UI。每個選項屬於一個 {@link ConfirmationOptionGroup}，讓用戶端仍能將選擇分類。
   */
  options?: ConfirmationOption[];
}

/**
 * 用戶端核准待處理的工具呼叫。工具轉換到 `running`。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatToolCallApprovedAction extends ToolCallActionBase {
  type: ActionType.ChatToolCallConfirmed;
  /** 工具呼叫已核准 */
  approved: true;
  /** 工具確認的方式 */
  confirmed: ToolCallConfirmationReason;
  /** 已編輯的工具輸入參數，若用戶端在確認前修改了它們 */
  editedToolInput?: string;
  /** 所選確認選項的 ID，若伺服器提供了選項 */
  selectedOptionId?: string;
}

/**
 * 用戶端拒絕待處理的工具呼叫。工具轉換到 `cancelled`。
 *
 * 對於用戶端提供的工具，若擁有用戶端無法識別該工具或無法執行它，MUST 分派此操作。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatToolCallDeniedAction extends ToolCallActionBase {
  type: ActionType.ChatToolCallConfirmed;
  /** 工具呼叫已被拒絕 */
  approved: false;
  /** 工具取消的原因 */
  reason: ToolCallCancellationReason.Denied | ToolCallCancellationReason.Skipped;
  /** 使用者建議改為執行的動作 */
  userSuggestion?: Message;
  /** 拒絕的選用說明 */
  reasonMessage?: StringOrMarkdown;
  /** 所選確認選項的 ID，若伺服器提供了選項 */
  selectedOptionId?: string;
}

/**
 * 用戶端確認或拒絕待處理的工具呼叫。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export type ChatToolCallConfirmedAction =
  | ChatToolCallApprovedAction
  | ChatToolCallDeniedAction;

/**
 * 工具執行完成。若 `requiresResultConfirmation` 為 `true`，轉換到 `completed` 或 `pending-result-confirmation`。
 *
 * 對於用戶端提供的工具（其工具呼叫狀態帶有含 `clientId` 的用戶端
 * `ToolCallContributor`），擁有用戶端會帶著執行結果分派此操作。若分派的用戶端與貢獻者的 `clientId` 不符，伺服器 SHOULD 拒絕此操作。
 *
 * 等待用戶端工具呼叫的伺服器 MAY 在實作用戶端中斷連線或變得無回應後，於合理持續時間後逾時，並帶著 `result.success = false` 與適當錯誤分派此操作。
 *
 * 用戶端 MAY 也針對目前處於 `auth-required`
 * 狀態的工具呼叫，以 **失敗** 的結果（`result.success: false`）分派此操作，以在不完成待處理 MCP
 * 驗證挑戰的情況下取消該呼叫。這永遠會將工具呼叫直接轉換到 `completed`，保留它在暫停以進行驗證前的欄位；
 * `requiresResultConfirmation` 在此轉換會被忽略；取消永遠無法進入
 * `pending-result-confirmation`，因為沒有可檢閱的實際結果。
 *
 * **成功** 的結果（`result.success: true`）對處於 `auth-required` 狀態的工具呼叫是無效的 — 執行在挑戰後從未恢復，因此沒有任何事物能產生它。reducer
 * MUST 將其作為 no-op 拒絕/忽略，讓工具呼叫留在 `auth-required`。用戶端必須在成功完成前先解決驗證挑戰（`chat/toolCallAuthResolved`）。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatToolCallCompleteAction extends ToolCallActionBase {
  type: ActionType.ChatToolCallComplete;
  /** 執行結果 */
  result: ToolCallResult;
  /** 若為 true，結果在完成前需要用戶端核准 */
  requiresResultConfirmation?: boolean;
}

/**
 * 用戶端核准或拒絕工具的結果。
 *
 * 若 `approved` 為 `false`，工具會以原因 `result-denied` 轉換到 `cancelled`。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatToolCallResultConfirmedAction extends ToolCallActionBase {
  type: ActionType.ChatToolCallResultConfirmed;
  /** 結果是否已核准 */
  approved: boolean;
}

/**
 * 工具仍在執行時產生的部分內容。
 *
 * 取代執行中工具呼叫狀態上的 `content` 陣列。用戶端可使用它在工具完成前顯示即時回饋（例如終端機參照）。
 *
 * 對於用戶端提供的工具（其工具呼叫狀態帶有含 `clientId` 的用戶端
 * `ToolCallContributor`），擁有用戶端會在執行時分派此操作以串流傳入中繼內容。若分派的用戶端與貢獻者的
 * `clientId` 不符，伺服器 SHOULD 拒絕此操作。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatToolCallContentChangedAction extends ToolCallActionBase {
  type: ActionType.ChatToolCallContentChanged;
  /** 執行中工具呼叫的目前部分內容 */
  content: ToolResultContent[];
}

/**
 * 執行中的工具呼叫已暫停，等待 MCP 驗證。將工具呼叫從 `running` 轉換到 `auth-required`。
 *
 * 伺服器在支援呼叫的 MCP 伺服器於執行中途以 401/403 挑戰回應時分派此操作（見
 * {@link McpAuthRequirement.reason | `insufficientScope`}）。主機 SHOULD
 * 將此與 `session/inputNeededSet`（kind `toolAuthentication`）配對，讓區塊在工作階段摘要層級可見，鏡像
 * {@link McpServerAuthRequiredState} 自身的 `InputNeeded` 指引。
 *
 * 僅對由 MCP 伺服器貢獻的工具呼叫有效 — 若工具呼叫的 `contributor` 不是
 * {@link ToolCallContributorKind.MCP | MCP-kind}，reducer 為 no-op。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatToolCallAuthRequiredAction extends ToolCallActionBase {
  type: ActionType.ChatToolCallAuthRequired;
  /** 阻擋此呼叫的驗證挑戰。 */
  auth: McpAuthRequirement;
}

/**
 * 阻擋工具呼叫的驗證挑戰已解決（用戶端透過 `authenticate` 推送權杖且主機已驗證它）。將工具呼叫從 `auth-required` 轉換回 `running`，保留它在暫停前的欄位。
 *
 * 主機 SHOULD 在此分派後移除對應的 `session/inputNeededSet` 項目（kind `toolAuthentication`）。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatToolCallAuthResolvedAction extends ToolCallActionBase {
  type: ActionType.ChatToolCallAuthResolved;
}

/**
 * 回合完成 — 助理已閒置。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatTurnCompleteAction {
  type: ActionType.ChatTurnComplete;
  /** 回合識別碼 */
  turnId: string;
  /**
   * 以毫秒為單位的回合經過持續時間，由產生者自身的時鐘測量。用戶端 MUST NOT 透過相減時間戳記來推導此值 — 跨用戶端時鐘可能不同 — 且 MUST 將它視為不透明的、產生者提供的資料。
   */
  duration: number;
  /**
   * 此操作的額外提供者特定中繼資料。
   *
   * 用戶端 MAY 在此尋找已知鍵以提供增強的 UI，且代理主機 MAY 用它來承載不適合任何其他欄位的個別事件上下文 — 例如，將事件歸因於特定代理程式（例如在回合內運作的子代理程式）。沿用 MCP `_meta` 慣例。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 回合已中止；伺服器停止處理。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatTurnCancelledAction {
  type: ActionType.ChatTurnCancelled;
  /** 回合識別碼 */
  turnId: string;
  /**
   * 以毫秒為單位的回合經過持續時間，由產生者自身的時鐘測量。用戶端 MUST NOT 透過相減時間戳記來推導此值 — 跨用戶端時鐘可能不同 — 且 MUST 將它視為不透明的、產生者提供的資料。
   */
  duration: number;
  /**
   * 此操作的額外提供者特定中繼資料。
   *
   * 用戶端 MAY 在此尋找已知鍵以提供增強的 UI，且代理主機 MAY 用它來承載不適合任何其他欄位的個別事件上下文 — 例如，將事件歸因於特定代理程式（例如在回合內運作的子代理程式）。沿用 MCP `_meta` 慣例。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 回合處理期間發生錯誤。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatErrorAction {
  type: ActionType.ChatError;
  /** 回合識別碼 */
  turnId: string;
  /**
   * 以毫秒為單位的回合經過持續時間，由產生者自身的時鐘測量。用戶端 MUST NOT 透過相減時間戳記來推導此值 — 跨用戶端時鐘可能不同 — 且 MUST 將它視為不透明的、產生者提供的資料。
   */
  duration: number;
  /** 錯誤詳細資料 */
  error: ErrorInfo;
  /**
   * 此操作的額外提供者特定中繼資料。
   *
   * 用戶端 MAY 在此尋找已知鍵以提供增強的 UI，且代理主機 MAY 用它來承載不適合任何其他欄位的個別事件上下文 — 例如，將事件歸因於特定代理程式（例如在回合內運作的子代理程式）。沿用 MCP `_meta` 慣例。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 此聊天的活動描述已變更。
 *
 * 由伺服器分派以指出聊天目前正在做什麼（例如執行工具、思考）。透過省略它或將它設為 `undefined` 來清除活動。產生者 SHOULD 也以 `session/chatUpdated` 更新父工作階段的聊天目錄，讓 `ChatSummary.activity` 保持同步。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatActivityChangedAction {
  type: ActionType.ChatActivityChanged;
  /** 目前活動的人類可讀描述；省略或設為 `undefined` 以清除 */
  activity?: string;
}

/**
 * 工作目錄已新增到此聊天的 {@link ChatState.workingDirectories} 子集。
 *
 * 以目錄 URI 為鍵的成員資格語意：當聊天的子集尚未包含 `directory` 時，reducer 會附加它（若不存在則建立子集），且當它已存在時為 no-op。`directory` MUST 是所屬工作階段 {@link SessionState.workingDirectories} 之一；主機 MUST 拒絕非如此的目錄。僅在代理程式公告 {@link AgentCapabilities.multipleWorkingDirectories} 時有效。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatWorkingDirectorySetAction {
  type: ActionType.ChatWorkingDirectorySet;
  /** 要新增到此聊天子集的工作目錄。 */
  directory: URI;
}

/**
 * 工作目錄已從此聊天的 {@link ChatState.workingDirectories} 子集中移除。
 *
 * 從聊天的子集中移除 `directory`；當它不存在時為 no-op。具冪等性，鏡像 `session/workingDirectoryRemoved`。僅影響聊天的子集 — 目錄仍保留在工作階段的集合中。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatWorkingDirectoryRemovedAction {
  type: ActionType.ChatWorkingDirectoryRemoved;
  /** 要從此聊天子集中移除的工作目錄。 */
  directory: URI;
}

/**
 * 回合的權杖使用量報告。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatUsageAction {
  type: ActionType.ChatUsage;
  /** 回合識別碼 */
  turnId: string;
  /** 權杖使用量資料 */
  usage: UsageInfo;
  /**
   * 此操作的額外提供者特定中繼資料。
   *
   * 用戶端 MAY 在此尋找已知鍵以提供增強的 UI，且代理主機 MAY 用它來承載不適合任何其他欄位的個別事件上下文 — 例如，將事件歸因於特定代理程式（例如在回合內運作的子代理程式）。沿用 MCP `_meta` 慣例。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 來自模型的推理/思考文字，附加到特定推理回應部分。
 *
 * 伺服器 MUST 先發出 `chat/responsePart` 以建立目標推理部分，再使用此操作將文字附加到它。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatReasoningAction {
  type: ActionType.ChatReasoning;
  /** 回合識別碼 */
  turnId: string;
  /** 要附加到的推理回應部分識別碼 */
  partId: string;
  /** 推理文字區塊 */
  content: string;
  /**
   * 此操作的額外提供者特定中繼資料。
   *
   * 用戶端 MAY 在此尋找已知鍵以提供增強的 UI，且代理主機 MAY 用它來承載不適合任何其他欄位的個別事件上下文 — 例如，將事件歸因於特定代理程式（例如在回合內運作的子代理程式）。沿用 MCP `_meta` 慣例。
   */
  _meta?: Record<string, unknown>;
}


// ─── Truncation ──────────────────────────────────────────────────────────────

/**
 * 截斷工作階段的歷史。若提供 `turnId`，該回合之後的所有回合都會被移除，且保留指定的回合。若省略 `turnId`，所有回合都會被移除。
 *
 * 若有活動回合，它會被靜默捨棄，且聊天狀態回到 `idle`。
 *
 * 常見使用案例：截斷舊資料，然後以編輯過的訊息分派新的
 * `chat/turnStarted`。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatTruncatedAction {
  type: ActionType.ChatTruncated;
  /** 保留到並包含此回合為止的回合。省略以清除所有回合。 */
  turnId?: string;
}

/**
 * 將較舊的已完成回合載入此聊天的狀態。
 *
 * 主機在回應 `fetchTurns` 之前，以及在套用任何參照比目前載入視窗更舊之回合的操作之前，分派此操作。`turns` 依最舊優先排序，並前置到目前的 `turns` 視窗。`turnsNextCursor` 取代狀態的游標；當所有保留回合現在都已載入時，省略它。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatTurnsLoadedAction {
  type: ActionType.ChatTurnsLoaded;
  /** 載入狀態的較舊已完成回合，依最舊優先排序。 */
  turns: Turn[];
  /** 用於載入下一個較舊頁面的不透明游標，若還有剩餘。 */
  turnsNextCursor?: string;
}

// ─── Pending Message Actions ─────────────────────────────────────────────────

/**
 * 待處理訊息已設定（upsert 語意：建立或取代）。
 *
 * 對於引導訊息，這永遠會取代單一引導訊息。對於佇列訊息，若具有給定 `id` 的訊息已存在，它會就地更新；否則會附加到佇列。若設定佇列訊息時聊天處於閒置狀態，伺服器 SHOULD 立即取用它並開始新回合。
 *
 * 用戶端僅被允許傳送 {@link MessageKind.User} 訊息。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatPendingMessageSetAction {
  type: ActionType.ChatPendingMessageSet;
  /** 這是引導訊息還是佇列訊息 */
  kind: PendingMessageKind;
  /** 此待處理訊息的唯一識別碼 */
  id: string;
  /** 訊息內容 */
  message: Message;
}

/**
 * 待處理訊息已移除（引導或佇列）。
 *
 * 由用戶端分派以取消待處理訊息，或由伺服器在它取用訊息時分派（例如從佇列訊息開始回合，或將引導訊息注入目前回合）。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatPendingMessageRemovedAction {
  type: ActionType.ChatPendingMessageRemoved;
  /** 這是引導訊息還是佇列訊息 */
  kind: PendingMessageKind;
  /** 要移除的待處理訊息識別碼 */
  id: string;
}

/**
 * 重新排序佇列訊息。
 *
 * `order` 陣列包含佇列訊息的 ID，依其新的所需順序排列。不存在於目前佇列中的 ID 會被忽略。ID 不在 `order` 中的佇列訊息會以原始相對順序附加到結尾（讓具有過時佇列檢視的用戶端永遠不會靜默捨棄訊息）。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatQueuedMessagesReorderedAction {
  type: ActionType.ChatQueuedMessagesReordered;
  /** 依所需順序排列的佇列訊息 ID */
  order: string[];
}

// ─── Draft Actions ───────────────────────────────────────────────────────────

/**
 * 聊天的草稿輸入已變更。
 *
 * 用戶端 MAY 定期將其本地輸入狀態 — 使用者正在撰寫的訊息，包括其 {@link Message.model | 模型} /
 * {@link Message.agent | 代理程式} 選擇與附件 — 同步到聊天的
 * {@link ChatState.draft | `draft`}，讓它在重新載入後仍留存，且對檢視相同聊天的其他用戶端可見。積極同步 **not** 必要；
 * 用戶端 SHOULD 去抖動，且 MAY 僅在方便的時刻同步。將 `draft`
 * 設為 `undefined` 以清除它（例如訊息傳送後）。
 *
 * 用戶端僅被允許草擬 {@link MessageKind.User} 訊息。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatDraftChangedAction {
  type: ActionType.ChatDraftChanged;
  /** 新的草稿訊息，或 `undefined` 以清除它 */
  draft?: Message;
}

// ─── Session Input Actions ──────────────────────────────────────────────────

/**
 * 工作階段向使用者請求輸入。
 *
 * 在活動回合中建立未解決的 {@link InputRequestResponsePart}，或以具有相同請求 `id` 的未解決部分取代它。除非提供 `request.answers`，否則答案草稿會被保留。
 *
 * @category Chat Actions
 * @version 1
 */
export interface ChatInputRequestedAction {
  type: ActionType.ChatInputRequested;
  /** 要建立或取代的輸入請求 */
  request: ChatInputRequest;
}

/**
 * 用戶端已更新、提交、跳過或移除單一進行中的答案。
 *
 * 以 `answer: undefined` 分派會移除該問題的答案草稿。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatInputAnswerChangedAction {
  type: ActionType.ChatInputAnswerChanged;
  /** 輸入請求識別碼 */
  requestId: string;
  /** 輸入請求中的問題識別碼 */
  questionId: string;
  /** 已更新的答案，或 `undefined` 以清除答案草稿 */
  answer?: ChatInputAnswer;
}

/**
 * 用戶端已提交對輸入請求的接受、拒絕或取消回應。
 *
 * 若接受，伺服器會使用 `answers`（若提供）加上請求的同步答案狀態來恢復受阻的操作。reducer 會在現有的 {@link InputRequestResponsePart} 上記錄回應與最終答案。
 *
 * @category Chat Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChatInputCompletedAction {
  type: ActionType.ChatInputCompleted;
  /** 輸入請求識別碼 */
  requestId: string;
  /** 完成結果 */
  response: ChatInputResponseKind;
  /** 選用的最終答案取代，以問題 ID 為鍵 */
  answers?: Record<string, ChatInputAnswer>;
}


export type ChatAction =
  | ChatTurnStartedAction
  | ChatDeltaAction
  | ChatResponsePartAction
  | ChatToolCallStartAction
  | ChatToolCallDeltaAction
  | ChatToolCallReadyAction
  | ChatToolCallConfirmedAction
  | ChatToolCallCompleteAction
  | ChatToolCallResultConfirmedAction
  | ChatToolCallContentChangedAction
  | ChatToolCallAuthRequiredAction
  | ChatToolCallAuthResolvedAction
  | ChatTurnCompleteAction
  | ChatTurnCancelledAction
  | ChatErrorAction
  | ChatActivityChangedAction
  | ChatWorkingDirectorySetAction
  | ChatWorkingDirectoryRemovedAction
  | ChatUsageAction
  | ChatReasoningAction
  | ChatTruncatedAction
  | ChatTurnsLoadedAction
  | ChatPendingMessageSetAction
  | ChatPendingMessageRemovedAction
  | ChatQueuedMessagesReorderedAction
  | ChatDraftChangedAction
  | ChatInputRequestedAction
  | ChatInputAnswerChangedAction
  | ChatInputCompletedAction
;
