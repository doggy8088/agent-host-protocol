# 變更日誌 — `com.microsoft.agenthostprotocol:agent-host-protocol` (Kotlin)

對 Kotlin/JVM 用戶端庫的所有顯著變更都記錄在此。參見
[`../../CHANGELOG.md`](../../CHANGELOG.md) 用於協定規格變更日誌和
[`release-metadata.json`](release-metadata.json) 為機器可讀
目前原始碼樹和協定版本之間的對應。

格式基於[保留變更日誌](https://keepachangelog.com/en/1.1.0/)
包遵循 [SemVer](https://semver.org)。

`clients/kotlin/pipeline.yml` ADO 發布管道拒絕發布 `kotlin/vX.Y.Z` 標記
此文件中缺少其符合的 `## [X.Y.Z]` 標題。快照
版本 (`*-SNAPSHOT`) 被發布管道明確拒絕；凹凸
在標記之前將 `gradle.properties` 中的 `VERSION_NAME` 轉換為非 SNAPSHOT 值。

## [未發布]

## [0.6.0] — 2026-07-20

實作 AHP 0.6.0。

### 新增

- `Changeset.capabilities` 帶有 `review` 存在標誌 (`ChangesetCapabilities`)，以便變更集可以在工作階段的變更集清單中預先宣傳對每個文件審核工作流程的支援。（#328）
- `SystemNotificationResponsePart` 上的可選 `_meta` 插槽，遵循 MCP `_meta` 約定。主機可以附加觸發通知的機器可讀描述符，以便用戶端可以對其進行分類、圖示、分組、過濾或本地化，而無需解析 `content`。 (#308)
- `chat/turnStarted` 帶有 `startedAt` 時間戳，`chat/turnComplete`/`chat/turnCancelled`/`chat/error` 帶有經過的 `duration`（毫秒，生產者自己的時鐘），並且完成的回合公開其開始時間和持續時間。
- 非同步工具呼叫風險評估，具有模型提供的解釋和標準化安全評分。
- `ToolCallStatus.AuthRequired` 工具呼叫狀態和 `chat/toolCallAuthRequired` / `chat/toolCallAuthResolved` 操作，以便正在執行的 MCP 貢獻的工具呼叫可以暫停 OAuth 質詢 (`McpAuthRequirement`) 的執行過程，並在用戶端進行驗證後恢復；透過新的 `toolAuthentication` `SessionInputRequest` 變體出現在工作階段級別，`AuthenticateParams` 獲得了可選的 `scopes` 欄位，現在除了 `AgentInfo.protectedResources` 之外還接受從實時 `McpServerAuthRequiredState` 或 `ToolCallAuthRequiredState` 發現的資源。現在，當工具呼叫為 `auth-required` 時，`chat/toolCallComplete` 也接受失敗的結果，從而讓用戶端在不完成驗證質詢的情況下取消該呼叫。
- `AhpCommands.ping(id)` 協定級連線活躍度請求工廠，鏡像 TypeScript 用戶端的 `AhpClient.ping()`。
- 預先註冊的公共和機密 OAuth 用戶端的 `McpAuthRequirement.oauthClient` 元資料。

### 已更改

- 將變更集審核操作 `changeset/filesReviewedChanged` 重新命名為 `changeset/filesReviewChanged`（欄位 `fileIds` → `files`）並使其可用戶端分派，以便審核者可以直接透過預寫 reducer 切換檔案的 `reviewed` 標誌。（#328）
- 輸入請求現在依序存在 `responseParts`，並帶有可選的 `response`，直到 `chat/inputCompleted` 提交結果。（#327）

## [0.5.2] — 2026-07-09

實作 AHP 0.5.2。

### 新增

- `ToolResultTerminalCompleteContent` 用於工具中的終端機樣式完成元資料
  結果。
- 子自訂類型上的可選 `enabled` 欄位
  (`AgentCustomization`、`SkillCustomization`、`PromptCustomization`、
  `RuleCustomization`，`HookCustomization`）。
- `disableUserInvocation` 在 `SkillCustomization` 上，加上 `disableModelInvocation`
  以及 `AgentCustomization` 上的 `disableUserInvocation`。
- `ChangesetFile` 上的可選 `reviewed` 欄位。省略它（或將其設為
  `null`) 表示伺服器不支援檔案“審核”
  功能。
- 伺服器的 `changeset/filesReviewedChanged` 操作以更新 `reviewed`
  一個或多個變更集檔案的標誌。
- 每個自訂項目上的可選 `meta`（連線 `_meta`）提供者元資料欄位
  型別，從 `AgentCustomization` 移至共用自訂基礎，因此
  `PluginCustomization`，`ClientPluginCustomization`，`DirectoryCustomization`，
  `SkillCustomization`，`PromptCustomization`，`RuleCustomization`，
  `HookCustomization` 和 `McpServerCustomization` 都帶有它。
- `InitializeResult` 上的可選 `serverInfo` 和 `clientInfo` 上
  `InitializeParams`，每 `Implementation` （`name`，可選 `version`，
  可選 `title`)，識別雙方背後的實作和構建
  的握手。僅供參考 - 不得用於特徵檢測。
- 對於支援的主機，`InitializeResult` 上可選的 `terminalCommandPrefix`
  將帶有 `!` 前綴的使用者訊息解釋為終端機命令。
- `PluginCustomization` 上的可選 `version` 欄位（繼承自
  `ClientPluginCustomization`)，攜帶來自於的插件的 semver
  開啟插件清單。僅出處/展示。
- `session/mcpServerStartRequested` 和 `session/mcpServerStopRequested`
  用戶端要求主機啟動或停止 MCP 伺服器的操作；停止
  將 `authRequired` 伺服器移到 `stopped`，因此它不再等待
  認證。
- `InputRequestResponsePart` 和 `ResponsePartInputRequest` 變體。的
  reducer 現在在活動回合中記錄已解決的輸入請求
  `responseParts` on `StateActionChatInputCompleted` - 嵌入已解析的
  `ChatInputRequest`（最終的 `answers`）和 `response`（`accept`、`decline`、
  或 `cancel`) — 因此在即時請求被刪除後結果仍然存在。
  放棄的請求仍然沒有記錄任何內容（#324）。

### 已更改

- `session/customizationToggled` reducer 現在可以切換任何頂級
  自訂（`plugin`、`directory` 或頂層 `mcpServer`）或
  透過 `id` 單一子項，設定該條目的 `enabled`。

## [0.5.1] — 2026-07-02

實作 AHP 0.5.1。

### 新增

- `ContentRef` 上的可選 `nonce` 欄位。
- `SubscribeParams.delivery.maxLatencyMs` 為用戶端請求最大值
  訂閱傳送延遲，包括無故意合併的 `0`。
- `AgentInfo` 上的可選 `capabilities` 欄位（`AgentCapabilities` 帶有
  巢狀的 `multipleChats` 功能攜帶 `fork`)，因此用戶端門多聊天
  並透過廣告功能而不是提供者 ID 交換器進行分叉。
- 透過新的共享 `PaginatedParams` 對 `listSessions` 進行基於遊標的分頁
  (`limit` + `cursor`) 和 `PaginatedResult` (`nextCursor`) 類型：
  `ListSessionsParams` 和 `ListSessionsResult` 現在攜帶這些欄位，讓
  用戶端瀏覽大型工作階段目錄。完全相加－省略
  欄位保留先前的行為。
- `SubscribeParams.view.turns`、`ChatState.turnsNextCursor` 和
  `chat/turnsLoaded` 操作，以便用戶端可以訂閱有限的聊天尾部
  歷史記錄和較舊的頁面會根據需要變成減少的聊天狀態。
- `SessionState.inputNeeded` — 工作階段等級未完成輸入的聚合
  跨所有聊天的請求（`SessionInputRequest` 密封接口`SessionChatInputRequest`、`SessionToolConfirmationRequest` 和
  `SessionToolClientExecutionRequest`)，加上 `SessionInputNeededSetAction` /
  `SessionInputNeededRemovedAction` 操作和 `ToolCallConfirmationState`
  聯盟。工作階段 reducer 維護 `SessionStatus.INPUT_NEEDED` 活動
  位元從佇列中清除，當最後一個
  條目被刪除。
- `ChatToolCallStartAction` 和每個工具呼叫上的可選 `intention` 欄位
  生命週期狀態。
- `AgentCustomization` 上的可選 `model` 和 `tools` 欄位用於自訂
  代理的固定模型和工具白名單。

### 已更改

- `fetchTurns` 現在接受來自 `ChatState.turnsNextCursor` 的 `cursor` 並傳回
  主機載入舊版後的空結果會變成聊天狀態，而不是
  傳回一個分離的 `{ turns, hasMore }` 頁面。
- 產生的用戶端現在僅通告協定 `0.5.1`，因為 `fetchTurns`
  合約與 `0.5.0` 不相容。

### 已刪除

- 來自 `ListSessionsParams` 的 `filter` 欄位。這是一個無類型的佔位符
  沒有定義的語意；一旦工作階段它就會以具體形狀傳回
  指定過濾/排序。

### 固定的

- `SnapshotState` 現在解碼 `Chat` 變體。它的序列化器以前從未
  匹配 `ChatState`，因此聊天快照被解碼為 `Root` 包羅萬象。變體
  消歧也不再依賴刪除的 `summary` 欄位（剩餘的
  從 `SessionState` 被展平之前開始）；工作階段現在已匹配
  `lifecycle`。

## [0.5.0] — 2026-06-26

實作 AHP 0.5.0。

### 新增

- `ChatDraftChangedAction`（`StateActionChatDraftChanged`，線路
  `chat/draftChanged`) 和 `ChatState.draft` (`Message?`) 來同步聊天
  正在進行的輸入草稿； `chatReducer` 設定或清除 `draft`，無需標記
  `modifiedAt`。
- `Message.model` 和 `Message.agent` 可選欄位記錄模型/
  撰寫訊息所用的代理選擇。
- `ChatActivityChangedAction`（`StateActionChatActivityChanged`，線路
  `chat/activityChanged`) 用於更新聊天的當前活動描述
  獨立於工作階段摘要。
- `ProgressParams` 資料類別 (wire `root/progress`) — 通用進度
  由 `progressToken` 關聯的通知（在 `CreateSessionParams` 上新增）。
  今天用於代理本機 SDK 的延遲首次使用下載。
- `SessionModelInfo.maxOutputTokens` 和 `SessionModelInfo.maxPromptTokens`
  用於傳達模型令牌限制的可選欄位。
- `SessionSummary.meta`（`_meta`線上）可選的提供者元資料欄位
  用於輕量級工作階段-列表演示提示。
- `SessionActiveClientRemovedAction` (`StateActionSessionActiveClientRemoved`,
  連線 `session/activeClientRemoved`) 來釋放單一活動的用戶端
  `clientId`。

### 已更改

- `SessionState` 不再嵌入 `summary` 子物件；它的元資料欄位
  (`provider`、`title`、`status`、`activity`、`project`、`workingDirectory`、
  `annotations`) 直接內嵌在 `SessionState` 上，不再帶有
  `model`、`agent`、`createdAt` 或 `modifiedAt`。 `sessionReducer` 讀取並
  寫入這些平坦欄位並且不再標記工作階段 `modifiedAt`。
- `SessionSummary` 現在是僅根目錄型別（透過共享引入
  `SessionMetadata` 基礎）；它的 `createdAt` / `modifiedAt` 是 ISO-8601 字串
  （以前是數字）並且不再帶有 `model` / `agent`。
- `ChatState` 和 `ChatSummary` 不再攜帶 `model` / `agent`。
- `SessionState.activeClients`（`List<SessionActiveClient>`，必需）替換
  單一可為空的 `SessionState.activeClient`; `sessionReducer` 更新插入和
  刪除由 `clientId` 鍵控的條目。
- `StateActionSessionActiveClientChanged` 重新命名為
  `StateActionSessionActiveClientSet`（連線`session/activeClientSet`）與
  upsert-by-`clientId` 語意學；它不再取消設定活動的用戶端
  （改為調度 `session/activeClientRemoved`）。
- `ConfigPropertySchema.enum` 欄位現在是 `List<JsonElement>?` 而不是`List<String>?`，允許數字、布林值和空列舉值。
- `ModelSelection.config` 值現在是 `JsonElement` 而非 `String`，
  允許數字、布林值和空配置值。

### 已刪除

- `StateActionSessionModelChanged` (`session/modelChanged`) 和
  `StateActionSessionAgentChanged`（`session/agentChanged`）。不再有
  工作階段層級模型/代理人選擇 — 選擇存在於每個 `Message` 上（且
  聊天的`draft`）。 `model` / `agent` 參數也已從
  `createSession` 和 `createChat` 指令；將它們傳遞給（初始）訊息
  相反。
- `SessionActiveClientToolsChangedAction`。活動的用戶端現在更新其
  透過重新調度 `StateActionSessionActiveClientSet` 及其
  完整的、更新的條目。

## [0.4.0] — 2026-06-19

實作 AHP 0.4.0。

### 新增

- `MessageOrigin` 資料類別現在類型為 `Message.origin`（以前是非類型化的）
  `JsonElement`），而 `MessageKind` 得到回合的 `AGENT` 和 `TOOL` 值
  由代理或工具而非使用者發起（例如，播種的工具）
  它產生的工作者聊天的第一條訊息）。
- `ConfigPropertySchema.additionalProperties` — 所描述的選用欄位
  超出 `properties` 中的物件類型配置屬性的架構。
- `ChangesetContentChangedAction` 用於完全替換變更集文件
  帶有可選操作和錯誤詳細資訊的快照。
- `ChangesetOperationStatus.Disabled` — 變更集的新列舉值
  目前不可用且無法呼叫的操作。
- `ChangesetOperation.group` — 分組相關的可選標識符
  UI 中一起進行變更集操作。
- 每回合聊天操作的 `_meta` (`meta`) 欄位 (`chat/turnStarted`,
  `chat/delta`、`chat/responsePart`、`chat/reasoning`、`chat/usage`、
  `chat/turnComplete`、`chat/turnCancelled`、`chat/error`) — 可選
  提供者特定的元資料，以便主機可以攜帶可移植的每個事件上下文，例如將事件歸因於特定代理（例如，代理行為的子代理）
  回合內）。

### 已更改

- `ToolResultSubagentContent.resource` 現在被指定為產生的工作人員
  **聊天** URI (`ahp-chat:/<cid>`)，而不是工作階段 URI — 工具產生的
  子代理是聊天。它的文件現在描述了與工作者的通信
  聊天的 `ChatOrigin.Tool` 記錄（匹配 `toolCallId`），該記錄仍然是
  產生關係的規範表示。
- **中斷：** `SessionStatus.rawValue` 現在是 `UInt`（以前是 `Int`），並且
  命名標誌常數是 `UInt` 文字。 `SessionStatus` 是無符號的
  線路上的 32 位元位元集；帶符號的 `Int` 無法儲存前向相容位
  等於或高於 `2^31`（`UInt` 儲存完整的 32 位元範圍）。
- **破壞：** `ChangesetOperationTarget` 的範圍目標現在帶有巢狀
  `TextRange` (`{start: {line, character}, end: {line, character}}`) 而非
  平面 `{start, end}` 整數對。

### 固定的

- `SessionStatus` 解碼保真度：未知的前向相容位元等於或高於
  `2^31`（例如 `2147483720`）現在作為普通 JSON 整數而不是
  拋出 `JsonDecodingException` 並丟棄該位。
- `sessionReducer` 現在應用來自每個的 `_meta` (`meta`) 更新
  工具呼叫範圍內的操作，而不僅僅是 `session/toolCallStart`。

### 新增

- 新註解通道（`ahp-session:/<uuid>/annotations`）：`AnnotationsState`，
  `Annotation`，`AnnotationEntry`，
  `AnnotationsSummary`; `annotationsReducer` 頂層函式和
  `AnnotationsReducer` 物件；和用戶端-可調度的 `annotations/set`，
  `annotations/removed`、`annotations/entrySet` 和 `annotations/entryRemoved`
  動作變體 - 用戶端透過調度驅動每個註釋突變
  這些直接（分配 `Annotation.id` / `AnnotationEntry.id`
  他們自己）；和`SnapshotState.Annotations`。
  `SessionSummary.annotations` 顯示 per-工作階段 `AnnotationsSummary`。
- `MessageAnnotationsAttachment`（`annotations` `MessageAttachment` 變體）
  透過 `resource` 引用工作階段的註釋通道上的註釋
  URI，可以選擇縮小為 `annotationIds` 陣列。
- `AnnotationsUpdatedAction` (`annotations/updated`) — 部分更新
  現有註解的 `turnId` / `resource` / `range` / `resolved` 不帶
  重新發送其條目。由註解 reducer 處理（未知時無操作
  身份證）。

- `ahp-chat:` 每個聊天對話的通道狀態; `SessionState.chats[]` 目錄； `SessionState.defaultChat?` 輸入路由提示； `ChatOrigin` 出處聯集； `createChat` / `disposeChat` 指令。
- `ChatSummary.workingDirectory` — 可選的每個聊天工作目錄。當不存在時，回退到工作階段的 `workingDirectory`。
- `ChatInteractivity` 列舉 (`Full` / `ReadOnly` / `Hidden`) 和可選的 `ChatSummary.interactivity` / `ChatState.interactivity` 屬性描述使用者如何與聊天互動。缺席預設為 `Full`。
- 工作階段通道上的三個離散聊天目錄操作 — `SessionChatAddedAction`（由 `summary.resource` 更新插入）、`SessionChatRemovedAction` 和 `SessionChatUpdatedAction`（部分更新負載）。
- `SessionDefaultChatChangedAction` (`session/defaultChatChanged`) — 更新 `SessionState.defaultChat` 以將新輸入引導至指定聊天；缺少值會清除提示。
- `ErrorInfo.meta: Map<String, JsonElement>?` — 錯誤負載上可選的特定於提供者的元資料包（序列化為 `_meta`），鏡像 `UsageInfo` 和其他協定類型上的現有 `meta` 欄位。用戶端可以在此處檢查眾所周知的鍵，以獲得更豐富的本地化錯誤 UI。- `RootState` 現在公開一個可選的 `_meta` 屬性包（`meta: Map<String,
  JsonElement>?`），用於實作定義的代理主機元資料，例如
  眾所周知的 `hostBuild` 鍵，包含主機的建置版本/提交/日期。

### 已更改

- `ChatState` 現在是扁平的 — 之前嵌入的 `summary` 已替換為內聯 `resource` / `title` / `status` / `activity` / `modifiedAt` / `model` / `agent` / `origin` /屬性 `McpServerAuthRequiredState` / { 屬性。 `ChatSummary` 仍作為 `SessionState.chats` 上的獨立目錄條目。
- `ChatSummary.modifiedAt` 和 `ChatState.modifiedAt` 現在是 ISO 8601 `String` 值，而不是 `Long` 毫秒。

### 已刪除

- `SessionChatsChangedAction`（由上面的三個離散聊天目錄操作取代）。

## [0.3.0] — 2026-06-05

實作 AHP 0.3.0。

### 新增

- `McpServerCustomization` 現在公開完整的 MCP 生命週期：`enabled`，
  可區分的 `McpServerState` 密封接口
  (`Starting`/`Ready`/`AuthRequired`/`Error`/`Stopped`)，可選
  `channel` `mcp://` 側通道的 URI，以及可選的 `mcpApp`
  阻止為 MCP 應用程式攜帶 `AhpMcpUiHostCapabilities`。
- `McpServerAuthRequiredState` 變體攜帶 `ProtectedResourceMetadata`
  加上 `reason` / `requiredScopes` / `description` 現有
  `authenticate` 指令可以驅動 per-伺服器驗證。
- `Customization.McpServer` 頂級變體 - 主機可能表面裸露
  直接 MCP 伺服器而不僅僅是在插件或目錄中。
- `SessionMcpServerStateChangedAction` — 縮小插入
  現有 MCP 伺服器自訂上的 `state` + `channel`
  透過 ID。
- `InitializeParams.capabilities` 上的 `ClientCapabilities` 資料類
  第一筆 `mcpApps`。
- `Changeset` 上的 `changeKind` 欄位（眾所周知的值：`'session'`，
  `'branch'`、`'uncommitted'`、`'turn'`、`'compare-turns'`）。
- `ChangesetOperation` 上的 `status` 和 `error` 欄位以及
  `changeset/operationStatusChanged` 操作，追蹤
  `idle → running → error` 變更集操作的生命週期。
- `AgentCustomization._meta` 提供者元資料欄位。- `SessionSummary` 上的可選 `changes` 欄位（`ChangesSummary` 以及可選的 `additions`、`deletions` 和 `files` 計數）總結了工作階段的檔案變更足跡。

### 已更改

- `fetchTurns` 和 `completions` 現在定位 `ahp-chat:` 通道； `PROTOCOL_VERSION` 撞到了 `0.4.0`。
- 將 `ChangesetSummary` 型別重新命名為 `Changeset`。線上形狀沒有改變。
- 將 `changesets` 目錄從 `SessionSummary` 移至 `SessionState`。 `session/changesetsChanged` 操作現在直接更新 `state.changesets` 而不是 `state.summary.changesets`。

### 已刪除

- `SessionState.turns`、`SessionState.activeTurn`、`SessionState.steeringMessage`、`SessionState.queuedMessages`、`SessionState.inputRequests`（移至 `ChatState`）。
- 從 `ChangesetSummary` 中刪除了 `additions`、`deletions` 和 `files` 欄位。總計計數現在位於 `SessionSummary.changes` 上；每個變更集視圖從 `ChangesetState.files` 中取得自己的總數。

### 已更改

- `ToolCallBase.toolClientId: String?` 替換為
  `ToolCallBase.contributor: ToolCallContributor?`（密封接口
  與 `Client(clientId)` 和 `Mcp(customizationId)` 變體）。
  `SessionToolCallStartAction` 攜帶新的 `contributor` 欄位為
  好吧。

## [0.2.0] — 2026-05-28

實作 AHP `0.2.0`。

Kotlin/JVM 用戶端 (`com.microsoft.agenthostprotocol:agent-host-protocol`) 的第一個 Maven Central 版本。
包括：

- 從規範的 TypeScript 協定定義產生的線路類型
  `types/`，包含擴充的 `resource*` 系列（`resourceResolve`、
  `resourceMkdir`、`createResourceWatch`、新的 `ahp-resource-watch:/`
  具有 `resourceWatch/changed` 操作的通道）、`ResourceWriteParams` 的
  `mode` / `position` / `ifMatch` 欄位，以及新的 `Conflict` (`-32011`)
  錯誤代碼。整個內容承載 `resource*` 系列是雙向的
  （它出現在 `CommandMap` 和 `ServerCommandMap` 中）。
- `com.microsoft.agenthostprotocol.Ahp.json` — 預先配置
  `kotlinx.serialization.json.Json`實例適合AHP編碼/
  解碼。
- 每通道操作類型和判別聯集密封介面。
- 每個產生的判別聯集上的前向相容 `Unknown` 變體
  密封介面（包括`StateActionUnknown`，它捕捉完整的
  原始 JSON 信封），因此針對此版本往返建置的用戶端
  reducer - 處理使用較新語言的伺服器發出的線路有效負載
  協定版本不拋出。
- `UserMessage.meta` 可選的 `Map<String, JsonElement>?` 欄位（序列化如 `_meta`），向使用者公開新的規格級提供者元資料通道
  訊息。
- 產生 `PROTOCOL_VERSION` 和 `SUPPORTED_PROTOCOL_VERSIONS` 常數
  `com.microsoft.agenthostprotocol.generated`。