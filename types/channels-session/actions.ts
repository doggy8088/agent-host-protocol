/**
 * 工作階段通道操作 — 對 `ahp-session:` 通道狀態的變動。
 *
 * @module channels-session/actions
 */

import { ActionType } from '../common/actions.js';
import type { ErrorInfo } from '../common/state.js';
import type {
  ToolDefinition,
  SessionActiveClient,
  SessionInputRequest,
  Customization,
  McpServerState,
} from './state.js';
import type { URI } from '../common/state.js';
import type { Changeset } from '../channels-changeset/state.js';
import type { ChatSummary } from '../channels-chat/state.js';

// ─── Session Actions ─────────────────────────────────────────────────────────

/**
 * 工作階段後端初始化成功。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionReadyAction {
  type: ActionType.SessionReady;
}

/**
 * 工作階段後端初始化失敗。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionCreationFailedAction {
  type: ActionType.SessionCreationFailed;
  /** 錯誤詳細資訊 */
  error: ErrorInfo;
}

/**
 * 聊天已加入此工作階段的目錄。Upsert 語意：若已存在具有相同
 * `summary.resource` 的聊天，則取代現有項目。
 *
 * 鏡射根通道的 `root/sessionAdded` 通知。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionChatAddedAction {
  type: ActionType.SessionChatAdded;
  /** 新增（或 upsert）之聊天的完整摘要。 */
  summary: ChatSummary;
}

/**
 * 聊天已從此工作階段的目錄中移除。無相符項目時為 no-op。
 *
 * 鏡射根通道的 `root/sessionRemoved` 通知。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionChatRemovedAction {
  type: ActionType.SessionChatRemoved;
  /** 要移除的聊天 URI。 */
  chat: URI;
}

/**
 * 一個現有聊天的摘要欄位已變更。
 *
 * 部分更新語意：僅寫入 `changes` 中出現的欄位；省略的欄位會被保留。
 * 識別欄位（`resource`）MUST NOT 隨附於 `changes`。無相符 `chat` 項目時
 * 為 no-op — 用戶端 SHOULD 接著等待 {@link SessionChatAddedAction | `session/chatAdded`}。
 *
 * 鏡射根通道的 `root/sessionSummaryChanged` 通知。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionChatUpdatedAction {
  type: ActionType.SessionChatUpdated;
  /** 摘要已變更的聊天 URI。 */
  chat: URI;
  /**
   * 已變動的可變摘要欄位；省略的欄位保持不變。
   *
   * 識別欄位（`resource`）永不變更，且傳送端 MUST 省略；接收端若收到
   * 則 SHOULD 忽略。
   */
  changes: Partial<ChatSummary>;
}

/**
 * 此工作階段的預設聊天輸入路由提示已變更。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionDefaultChatChangedAction {
  type: ActionType.SessionDefaultChatChanged;
  /** 新的預設聊天 URI，或 `undefined` 以清除提示。 */
  defaultChat?: URI;
}

/**
 * 工作階段標題已更新。當標題從對話自動產生時由伺服器引發，或由
 * 用戶端分派以重新命名工作階段。
 *
 * @category Session Actions
 * @clientDispatchable
 * @version 1
 */
export interface SessionTitleChangedAction {
  type: ActionType.SessionTitleChanged;
  /** 新標題 */
  title: string;
}

/**
 * 工作階段的已讀狀態已變更。
 *
 * 由用戶端分派以將工作階段標記為已讀（例如檢視後）或未讀（例如自
 * 用戶端上次檢視後有新活動）。
 *
 * @category Session Actions
 * @version 1
 * @clientDispatchable
 */
export interface SessionIsReadChangedAction {
  type: ActionType.SessionIsReadChanged;
  /** 工作階段是否已讀 */
  isRead: boolean;
}

/**
 * 工作階段的封存狀態已變更。
 *
 * 由用戶端分派以封存工作階段（例如工作完成）或解除封存。
 *
 * @category Session Actions
 * @version 1
 * @clientDispatchable
 */
export interface SessionIsArchivedChangedAction {
  type: ActionType.SessionIsArchivedChanged;
  /** 工作階段是否已封存 */
  isArchived: boolean;
}

/**
 * 工作階段的活動描述已變更。
 *
 * 由伺服器分派以指出工作階段目前正在做什麼（例如執行工具、
 * 思考）。設為 `undefined` 以清除活動。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionActivityChangedAction {
  type: ActionType.SessionActivityChanged;
  /** 目前活動的人類可讀描述，或 `undefined` 以清除 */
  activity: string | undefined;
}

/**
 * 代理主機為此工作階段所通告的 {@link Changeset | 變更集目錄}已變更。
 * 完全取代 {@link SessionState.changesets | `state.changesets`}
 * （完全取代語意）— 設為 `undefined` 以清除目錄。
 *
 * 生產者在新增或移除項目時分派此操作。展發透過此操作進行，讓
 * 觀察者能在其已追蹤的檔案層級更新所用的同一個
 * {@link ChangesetAction | 每個變更集} 操作串流中看到目錄變動。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionChangesetsChangedAction {
  type: ActionType.SessionChangesetsChanged;
  /** 新目錄，或 `undefined` 以清除 */
  changesets: Changeset[] | undefined;
}

/**
 * 此工作階段的伺服器工具已變更。
 *
 * 完全取代語意：`tools` 陣列完全取代先前的 `serverTools`。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionServerToolsChangedAction {
  type: ActionType.SessionServerToolsChanged;
  /** 已更新的伺服器工具清單（完全取代） */
  tools: ToolDefinition[];
}

/**
 * 此工作階段的作用中用戶端已新增或更新。
 *
 * 以 {@link SessionActiveClient.clientId | `clientId`} 為鍵的 Upsert
 * 語意：用戶端以自己的 `SessionActiveClient` 分派此操作以加入工作
 * 階段的作用中用戶端或重新整理其項目，取代任何具有相同
 * `clientId` 的現有項目。多個用戶端可同時作用中。這也是用戶端更新
 * 其已發布工具或自訂的方式 — 以完整、已更新的項目重新分派。使用
 * {@link SessionActiveClientRemovedAction | `session/activeClientRemoved`}
 * 來離開。當作用中用戶端斷線時，伺服器 SHOULD 自動分派該移除操作。
 *
 * @category Session Actions
 * @version 1
 * @clientDispatchable
 */
export interface SessionActiveClientSetAction {
  type: ActionType.SessionActiveClientSet;
  /** 要新增或更新的作用中用戶端，以 `clientId` 比對。 */
  activeClient: SessionActiveClient;
}

/**
 * 此工作階段的作用中用戶端已移除。
 *
 * 從 {@link SessionState.activeClients} 移除以 `clientId` 識別的用戶端
 * 項目；無相符項目時為 no-op。
 *
 * 當用戶端停止參與工作階段時，主機 SHOULD 自動分派此操作 — 例如
 * 當其取消訂閱工作階段通道、斷線且未在主機定義的寬限期內重新連線，
 * 或 `reconnect` 指令的 `subscriptions` 省略了用戶端仍在作用中的工作
 * 階段時。移除用戶端時，主機 SHOULD 一併取消該用戶端的進行中工具
 * 呼叫 — 即工具呼叫狀態承載具有相符 `clientId` 之用戶端
 * `ToolCallContributor` 的那些呼叫 — 作法是分派 `chat/toolCallComplete`
 * 並設定 `result.success = false`。（沒有每個工具呼叫的伺服器取消；
 * 失敗的補全即為取消機制，呼叫以失敗結果結束於 `completed` 狀態。）
 *
 * @category Session Actions
 * @version 1
 * @clientDispatchable
 */
export interface SessionActiveClientRemovedAction {
  type: ActionType.SessionActiveClientRemoved;
  /** 要移除的作用中用戶端之 `clientId`。 */
  clientId: string;
}

// ─── Working Directory Actions ───────────────────────────────────────────────

/**
 * 工作目錄已加入工作階段的
 * {@link SessionState.workingDirectories} 集合。
 *
 * 以目錄 URI 為鍵的成員資格語意：當集合尚不包含 `directory` 時
 * reducer 會附加它（若集合不存在則建立），且已存在時為 no-op。
 * 僅在代理程式通告 {@link AgentCapabilities.multipleWorkingDirectories}
 * 時有效。
 *
 * @category Session Actions
 * @version 1
 * @clientDispatchable
 */
export interface SessionWorkingDirectorySetAction {
  type: ActionType.SessionWorkingDirectorySet;
  /** 要授予工作階段代理程式工具存取權的工作目錄。 */
  directory: URI;
}

/**
 * 工作目錄已從工作階段的
 * {@link SessionState.workingDirectories} 集合中移除。
 *
 * 從集合中移除 `directory`；不存在時為 no-op。沒有原子的後端「移除
 * 一個」基本操作 — 主機將其代理程式重新設定為縮減後的集合 — 因此
 * 此操作可安全地建模為冪等。主機 MAY 拒絕套用移除（例如某個目錄
 * 仍被指定為某個聊天的
 * {@link ChatState.primaryWorkingDirectory | 主要目錄}）；此時它會保持
 * 集合不變。
 *
 * @category Session Actions
 * @version 1
 * @clientDispatchable
 */
export interface SessionWorkingDirectoryRemovedAction {
  type: ActionType.SessionWorkingDirectoryRemoved;
  /** 要撤銷工作階段代理程式工具存取權的工作目錄。 */
  directory: URI;
}

// ─── Input Needed Actions ────────────────────────────────────────────────────

/**
 * 工作階段層級的輸入請求已新增或更新。
 *
 * 以 {@link SessionInputRequest.id | `request.id`} 為鍵的 Upsert 語意：
 * 主機以完整的 {@link SessionInputRequest} 分派此操作以將新項目附加至
 * {@link SessionState.inputNeeded} 或取代具有相同 `id` 的現有項目。
 *
 * 伺服器發起：主機將聊天層級的請求（引出、工具確認、用戶端工具
 * 執行）鏡射至工作階段彙總中，讓僅訂閱工作階段通道的用戶端能發現
 * 它們。用戶端透過將普通的 `chat/*` 操作分派至項目的 `chat` 通道來
 * 回應 — 見 {@link SessionInputRequest}。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionInputNeededSetAction {
  type: ActionType.SessionInputNeededSet;
  /** 要新增或更新的輸入請求，以 `id` 比對。 */
  request: SessionInputRequest;
}

/**
 * 工作階段層級的輸入請求已移除。
 *
 * 從 {@link SessionState.inputNeeded} 移除以 `id` 識別的項目；無相符
 * 項目時為 no-op。
 *
 * 伺服器發起：主機在底層請求解決後（使用者回答、工具呼叫確認、或
 * 用戶端回報結果）分派此操作。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionInputNeededRemovedAction {
  type: ActionType.SessionInputNeededRemoved;
  /** 要移除之輸入請求的 `id`。 */
  id: string;
}

// ─── Customization Actions ───────────────────────────────────────────────────

/**
 * 工作階段的自訂已變更。
 *
 * 完全取代語意：`customizations` 陣列完全取代先前的
 * `customizations`。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionCustomizationsChangedAction {
  type: ActionType.SessionCustomizationsChanged;
  /** 已更新的自訂清單（完全取代）。 */
  customizations: Customization[];
}

/**
 * 用戶端將某個自訂啟用或停用。
 *
 * 先以 `id` 比對每個頂層自訂 — 外掛或目錄容器，或單獨的頂層 MCP
 * 伺服器 — 再比對每個容器內的子項（技能、代理程式或其他項目），
 * 並設定相符項目的 `enabled` 旗標。停用容器仍會停用其所有子項 —
 * 子項的有效狀態為 `container.enabled && (child.enabled ?? true)` —
 * 因此切換子項僅在其容器啟用時才有意義。沒有自訂具有給定 `id` 時
 * 為 no-op。
 *
 * @category Session Actions
 * @version 1
 * @clientDispatchable
 */
export interface SessionCustomizationToggledAction {
  type: ActionType.SessionCustomizationToggled;
  /** 要切換的容器或子項之 id。 */
  id: string;
  /** 要啟用或停用目標自訂。 */
  enabled: boolean;
}

/**
 * Upsert 頂層自訂（外掛或目錄）。
 *
 * reducer 以 `customization.id` 定位現有項目：
 *
 * - 若找到，項目會完全以 `customization` 取代，包含其 `children`
 *   陣列。要保留現有子項，主機必須在有效負載中包含它們。
 * - 若未找到，則附加該項目。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionCustomizationUpdatedAction {
  type: ActionType.SessionCustomizationUpdated;
  /** 要 upsert 的自訂（以 `customization.id` 比對）。 */
  customization: Customization;
}

/**
 * 以 id 移除自訂。
 *
 * 在每個容器及其子項中搜尋該項目。若項目是容器，其子項會一併移除。
 * 沒有相符 id 時為 no-op。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionCustomizationRemovedAction {
  type: ActionType.SessionCustomizationRemoved;
  /** 要移除的自訂之 id。 */
  id: string;
}

/**
 * 更新現有 {@link McpServerCustomization} 的執行時期欄位 — 針對高頻率的
 * `starting` ↔ `ready` ↔ `authRequired` 轉換，是
 * {@link SessionCustomizationUpdatedAction} 的窄替代方案。
 *
 * 以 `id` 定位目標項目，搜尋頂層自訂清單與每個容器的 `children`
 * 陣列。取代項目的
 * {@link McpServerCustomization.state | `state`} 與
 * {@link McpServerCustomization.channel | `channel`}
 * （完全取代語意：省略 `channel` 以清除現有通道 URI）。自訂的其他
 * 欄位會被保留。
 *
 * 找不到相符的 `McpServerCustomization` 時為 no-op。要更新任何其他
 * 欄位（名稱、圖示、`mcpApp` 能力等），請改用
 * {@link SessionCustomizationUpdatedAction}。
 *
 * 當轉換至 {@link McpServerStatus.AuthRequired} 是因回合中途發出的
 * 請求所致時，主機 SHOULD 一併在工作階段上引發
 * {@link SessionStatus.InputNeeded} — 見 {@link McpServerAuthRequiredState}
 * 的理由說明。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionMcpServerStateChangedAction {
  type: ActionType.SessionMcpServerStateChanged;
  /** 要更新的 {@link McpServerCustomization} 之 id。 */
  id: string;
  /** 新的生命週期狀態。 */
  state: McpServerState;
  /**
   * 已更新的 `mcp://` 側通道 URI。完全取代：省略以清除現有通道
   * （離開 {@link McpServerStatus.Ready | `Ready`} 時的典型做法）。
   */
  channel?: URI;
}

/**
 * 請求主機啟動或重新啟動現有的
 * {@link McpServerCustomization}。
 *
 * 以 `id` 定位目標項目，搜尋頂層自訂清單與每個容器的 `children`
 * 陣列。reducer 樂觀地將伺服器移至
 * {@link McpServerStatus.Starting | `starting`} 並清除任何先前的
 * {@link McpServerCustomization.channel | `channel`}；主機仍具權威性，
 * SHOULD 在伺服器就緒、需要驗證、失敗或被拒絕後，接著分派
 * {@link SessionMcpServerStateChangedAction | `session/mcpServerStateChanged`}。
 * 找不到相符的 `McpServerCustomization` 時為 no-op。
 *
 * @category Session Actions
 * @version 1
 * @clientDispatchable
 */
export interface SessionMcpServerStartRequestedAction {
  type: ActionType.SessionMcpServerStartRequested;
  /** 要啟動的 {@link McpServerCustomization} 之 id。 */
  id: string;
}

/**
 * 請求主機停止現有的 {@link McpServerCustomization}。
 *
 * 以 `id` 定位目標項目，搜尋頂層自訂清單與每個容器的 `children`
 * 陣列。reducer 樂觀地將伺服器移至
 * {@link McpServerStatus.Stopped | `stopped`} 並清除任何先前的
 * {@link McpServerCustomization.channel | `channel`}。以 `stopped`
 * 取代 {@link McpServerStatus.AuthRequired | `authRequired`} 生命週期
 * 狀態會解除伺服器等待驗證的阻塞。若主機僅為該 MCP 伺服器引發了
 * 工作階段層級的待處理輸入狀態，則在接受停止時 SHOULD 移除該待處理
 * 輸入項目。
 *
 * 主機仍具權威性，且 MAY 拒絕該操作，或在最終生命週期狀態不同時接著
 * 分派 {@link SessionMcpServerStateChangedAction | `session/mcpServerStateChanged`}。
 * 找不到相符的 `McpServerCustomization` 時為 no-op。
 *
 * @category Session Actions
 * @version 1
 * @clientDispatchable
 */
export interface SessionMcpServerStopRequestedAction {
  type: ActionType.SessionMcpServerStopRequested;
  /** 要停止的 {@link McpServerCustomization} 之 id。 */
  id: string;
}

// ─── Config Actions ──────────────────────────────────────────────────────────

/**
 * 用戶端在工作階段中途變更了可變的設定值。
 *
 * 只有設定綱要中具有 `sessionMutable: true` 的屬性可被變更。伺服器驗證
 * 並廣播此操作；reducer 將新值合併至 `state.config.values`。
 *
 * @category Session Actions
 * @version 1
 * @clientDispatchable
 */
export interface SessionConfigChangedAction {
  type: ActionType.SessionConfigChanged;
  /** 已更新的設定值 */
  config: Record<string, unknown>;
  /** 為 `true` 時，取代所有設定值而非合併 */
  replace?: boolean;
}

/**
 * 工作階段的 `_meta` 側通道已變更。完全取代 `state._meta`
 * （完全取代語意）。生產者 SHOULD 在分派前將任何想保留的鍵合併至
 * 新值中。
 *
 * @category Session Actions
 * @version 1
 */
export interface SessionMetaChangedAction {
  type: ActionType.SessionMetaChanged;
  /** 新的 `_meta` 有效負載，或 `undefined` 以清除 */
  _meta: Record<string, unknown> | undefined;
}
