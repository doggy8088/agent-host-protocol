# 變更日誌 — `clients/go` (Go)

對 Go 用戶端模組的所有顯著變更都記錄在此處。參見
[`../../CHANGELOG.md`](../../CHANGELOG.md) 對於協定規格
變更日誌和 [`release-metadata.json`](release-metadata.json)
目前原始碼樹和協定之間的機器可讀映射
版本。

格式基於[保留變更日誌](https://keepachangelog.com/en/1.1.0/)
此模組遵循 [SemVer](https://semver.org)。

`publish-go.yml` 工作流程拒絕發布 `clients/go/vX.Y.Z`
此文件中缺少匹配的 `## [X.Y.Z]` 標題的標記。

## [未發布]

## [0.6.0] — 2026-07-20

實作 AHP 0.6.0。

### 新增

- `Changeset.capabilities` 具有 `review` 存在標誌 (`ChangesetCapabilities`)，以便變更集可以在工作階段的變更集清單中預先宣傳對每個文件審核工作流程的支援。（#328）
- `SystemNotificationResponsePart` 上的可選 `_meta` 插槽，遵循 MCP `_meta` 約定。主機可以附加觸發通知的機器可讀描述符，以便用戶端可以對其進行分類、圖示、分組、過濾或本地化，而無需解析 `content`。 (#308)
- `chat/turnStarted` 帶有 `startedAt` 時間戳，`chat/turnComplete`/`chat/turnCancelled`/`chat/error` 帶有經過的 `duration`（毫秒，生產者自己的時鐘），並且完成的回合公開其開始時間和持續時間。
- 非同步工具呼叫風險評估，具有模型提供的解釋和標準化安全評分。
- `ToolCallStatus.AuthRequired` 工具呼叫狀態和 `chat/toolCallAuthRequired` / `chat/toolCallAuthResolved` 操作，以便正在執行的 MCP 貢獻的工具呼叫可以暫停 OAuth 質詢 (`McpAuthRequirement`) 的執行過程，並在用戶端進行驗證後恢復；透過新的 `toolAuthentication` `SessionInputRequest` 變體出現在工作階段級別，`AuthenticateParams` 獲得了可選的 `scopes` 欄位，現在除了 `AgentInfo.protectedResources` 之外還接受從實時 `McpServerAuthRequiredState` 或 `ToolCallAuthRequiredState` 發現的資源。現在，當工具呼叫為 `auth-required` 時，`chat/toolCallComplete` 也接受失敗的結果，從而讓用戶端在不完成驗證質詢的情況下取消該呼叫。
- `Client.Ping()` 用於協定級連線活躍度，鏡像 TypeScript 用戶端的 `AhpClient.ping()`。
- 用於預先註冊公共和機密 OAuth 用戶端的 `McpAuthRequirement.oauthClient` 元資料。

### 已更改

- 將變更集審核操作 `changeset/filesReviewedChanged` 重新命名為 `changeset/filesReviewChanged`（欄位 `fileIds` → `files`）並使其可用戶端分派，以便審核者可以直接透過預寫 reducer 切換檔案的 `reviewed` 標誌。（#328）
- 輸入請求現在依序存在 `responseParts`，並帶有可選的 `response`，直到 `chat/inputCompleted` 提交結果。（#327）

## [0.5.2] — 2026-07-09

實作 AHP 0.5.2。

### 新增

- 在 `ahp.Client` 上鍵入 `resource*` 便捷方法：發送包裝器（`ResourceRead`、`ResourceWrite`、`ResourceList`、`ResourceCopy`、`ResourceDelete`、`ResourceMove`、`ResourceResolve`、`ResourceMkdir`、`ResourceRequest`、`CreateResourceWatch`)和透過 `ResourceResolve`、`ResourceMkdir`、`ResourceRequest`、`CreateResourceWatch`)和透過 {c601} 處理的 601}（新站） `ServerRequestHandler` 和`ResourceRequestHandlers` 類型）。現在，透過已安裝的處理器或未設定處理器的 `MethodNotFound` 應答（之前已丟棄）入站伺服器發起的請求。
- `ToolResultTerminalCompleteContent` 用於工具中的終端機樣式完成元資料
  結果。
- 子自訂類型上的可選 `Enabled` 欄位
  （`AgentCustomization`、`SkillCustomization`、`PromptCustomization`、
  `RuleCustomization`，`HookCustomization`）。
- `SkillCustomization` 上的 `DisableUserInvocation`，加上 `DisableModelInvocation`
  和 `AgentCustomization` 上的 `DisableUserInvocation`。
- `ChangesetFile` 上的可選 `Reviewed` 欄位。省略它（或將其設為
  `nil`) 表示伺服器不支援檔案“審核”
  功能。
- 伺服器的 `changeset/filesReviewedChanged` 操作以更新 `Reviewed`
  一個或多個變更集檔案的標誌。
- 每個自訂項目上的可選 `Meta`（連線 `_meta`）提供者元資料欄位型別，從 `AgentCustomization` 移至共用自訂基礎，因此
  `PluginCustomization`，`ClientPluginCustomization`，`DirectoryCustomization`，
  `SkillCustomization`，`PromptCustomization`，`RuleCustomization`，
  `HookCustomization`和`McpServerCustomization`都帶有它。
- `InitializeResult` 上的可選 `ServerInfo` 和 `ClientInfo` 上
  `InitializeParams`，每個都是一個 `Implementation` 結構（`Name`，可選
  `Version`，可選 `Title`），識別背後的實作與構建
  握手的兩側。僅供參考 — 不得用於
  特徵檢測。
- 對於支援的主機，`InitializeResult` 上可選的 `TerminalCommandPrefix`
  將帶有 `!` 前綴的使用者訊息解釋為終端機命令。
- `PluginCustomization` 上的可選 `Version` 欄位（繼承自
  `ClientPluginCustomization`)，攜帶來自於的插件的 semver
  開啟插件清單。僅出處/展示。
- `session/mcpServerStartRequested` 和 `session/mcpServerStopRequested`
  用戶端要求主機啟動或停止 MCP 伺服器的操作；停止
  將 `authRequired` 伺服器移到 `stopped`，使其不再等待
  認證。
- `InputRequestResponsePart` 和 `ResponsePartKindInputRequest` 判別式。reducer 現在記錄活動回合中已解決的輸入請求
  `ResponseParts` on `ChatInputCompletedAction` - 嵌入已解析的
  `ChatInputRequest`（最後的`Answers`）和`Response`（`accept`，`decline`，
  或 `cancel`) — 因此在即時請求被刪除後結果仍然存在。
  放棄的請求仍然沒有記錄任何內容（#324）。

### 已更改

- `session/customizationToggled` reducer 現在可以切換任何頂級
  自訂（`plugin`、`directory` 或頂層 `mcpServer`）或
  透過 `id` 單一子項，設定該條目的 `Enabled`。

## [0.5.1] — 2026-07-02

實作 AHP 0.5.1。

### 新增

- `ContentRef` 上的可選 `Nonce` 欄位。
- `SubscribeParams.Delivery.MaxLatencyMs` 和 `Client.SubscribeWithDelivery`
  用戶端請求最大訂閱傳送延遲，包括
  `0` 表示沒有故意合併。
- `AgentInfo` 上的可選 `capabilities` 欄位（`AgentCapabilities` 帶有
  巢狀的 `multipleChats` 功能攜帶 `fork`)，因此用戶端門多聊天
  並透過廣告功能而不是提供者 ID 交換器進行分叉。
- 透過新的共享 `PaginatedParams` 對 `listSessions` 進行基於遊標的分頁
  (`Limit` + `Cursor`) 和 `PaginatedResult` (`NextCursor`) 型：
  `ListSessionsParams` 和 `ListSessionsResult` 現在攜帶這些欄位，讓
  用戶端瀏覽大型工作階段目錄。完全相加－省略
  欄位保留先前的行為。
- `SubscribeParams.View.Turns`、`ChatState.TurnsNextCursor` 和
  `chat/turnsLoaded` 操作，以便用戶端可以訂閱有限的聊天尾部
  歷史記錄和較舊的頁面會根據需要變成減少的聊天狀態。
- `SessionState.InputNeeded` — 工作階段等級未完成輸入的聚合所有聊天中的請求（`SessionInputRequest` 與
  `SessionChatInputRequest`、`SessionToolConfirmationRequest` 和
  `SessionToolClientExecutionRequest`），加上 `SessionInputNeededSetAction`
  （線路`session/inputNeededSet`）和`SessionInputNeededRemovedAction`（線路
  `session/inputNeededRemoved`) 操作和 `ToolCallConfirmationState`
  聯盟。工作階段 reducer 維護 `SessionStatusInputNeeded` 活動
  從佇列中清除位元（回退到 `SessionStatusInProgress`）
  當最後一個條目被刪除時。
- `ChatToolCallStartAction` 和每個工具呼叫上的可選 `Intention` 欄位
  生命週期狀態。
- `AgentCustomization` 上的可選 `Model` 和 `Tools` 欄位用於自訂
  代理的固定模型和工具白名單。

### 已更改

- `fetchTurns` 現在接受來自 `ChatState.TurnsNextCursor` 的 `Cursor` 並傳回
  主機載入舊版後的空結果會變成聊天狀態，而不是
  傳回一個分離的 `{ turns, hasMore }` 頁面。
- 產生的用戶端現在僅通告協定 `0.5.1`，因為 `fetchTurns`
  合約與 `0.5.0` 不相容。

### 已刪除

- `ListSessionsParams` 中的 `Filter` 欄位。這是一個無類型的佔位符
  沒有定義的語意；一旦工作階段它就會以具體形狀傳回
  指定過濾/排序。

### 固定的

- `SnapshotState.UnmarshalJSON` 現在解碼 `Chat` 變體。變體
  先前探測已刪除的 `summary` 欄位（剩餘的
  從 `SessionState` 被展平之前開始），所以聊天和工作階段快照都是
  落到了`Root`包羅萬象的位置。工作階段現在在 `lifecycle` 上匹配
  並在 `turns` 上聊天。

## [0.5.0] — 2026-06-26

實作 AHP 0.5.0。

### 新增

- `ChatDraftChangedAction`（線路 `chat/draftChanged`）和 `ChatState.Draft`
  (`*Message`) 用於同步聊天正在進行的輸入草稿； `ApplyActionToChat`
  設定或清除 `state.Draft`，而不標記 `ModifiedAt`。
- `Message.Model` 和 `Message.Agent` 可選欄位記錄模型/
  撰寫訊息所用的代理選擇。
- `ChatActivityChangedAction`（連線 `chat/activityChanged`）用於更新聊天
  目前活動描述獨立於工作階段摘要。
- `ProgressParams` struct (wire `root/progress`) — 通用進度通知
  由 `ProgressToken` 相關（在 `CreateSessionParams` 上新增）。
  今天用於代理本機 SDK 的延遲首次使用下載。
- `SessionModelInfo.MaxOutputTokens` 和 `SessionModelInfo.MaxPromptTokens`
  用於傳達模型令牌限制的可選欄位。
- `SessionSummary.Meta`（連線`_meta`）可選的提供者元資料欄位
  輕量級工作階段-列表演示提示。
- `SessionActiveClientRemovedAction`（連線`session/activeClientRemoved`）至
  由 `ClientId` 釋放單一活動的用戶端。

### 已更改

- `SessionState` 不再嵌入 `Summary` 子結構；它的元資料欄位
  (`Provider`、`Title`、`Status`、`Activity`、`Project`、`WorkingDirectory`、
  `Annotations`) 現在直接內聯在 `SessionState` 上，不再
  攜帶 `Model`、`Agent`、`CreatedAt` 或 `ModifiedAt`。 `ApplyActionToSession`
  讀取和寫入這些平面欄位並且不再標記工作階段
  `ModifiedAt`。
- `SessionSummary` 現在是僅根目錄結構；它的`CreatedAt` /
  `ModifiedAt` 是 ISO-8601 字串（以前是數字），不再是
  攜帶 `Model` / `Agent`。
- `ChatState` 和 `ChatSummary` 不再攜帶 `Model` / `Agent`。
- `SessionState.ActiveClients`（`[]SessionActiveClient`，必需）替換
  單指標`SessionState.ActiveClient`； `ApplyActionToSession` 更新插入和
  刪除由 `ClientId` 鍵控的條目。
- `SessionActiveClientChangedAction` 重新命名為 `SessionActiveClientSetAction`
  (wire `session/activeClientSet`) 具有 upsert-by-`ClientId` 語意學；它不
  不再設定活動的用戶端（調度 `session/activeClientRemoved`
  相反）。
- `ConfigPropertySchema.Enum` 欄位現在是 `[]json.RawMessage` 而不是 `[]string`，
  允許數字、布林值和空列舉值。- `ModelSelection.Config` 值現在是 `json.RawMessage` 而非 `string`，
  允許數字、布林值和空配置值。

### 已刪除

- `SessionModelChangedAction`（線路`session/modelChanged`）和
  `SessionAgentChangedAction`（線路`session/agentChanged`）；工作階段型號/
  代理不再是協定表面的一部分。
- `SessionActiveClientToolsChangedAction`。活動的用戶端現在更新其
  透過重新調度 `SessionActiveClientSetAction` 及其
  完整的、更新的條目。

## [0.4.0] — 2026-06-19

實作 AHP 0.4.0。

### 新增

- `MessageOrigin` 結構與 `MessageKind` 型別現在模型 `Message.Origin`
  （以前是無類型的 `json.RawMessage`）； `MessageKind` 涵蓋 `user`，
  `agent`、`tool` 和 `systemNotification`，新增忠誠的代理人 - 和
  工具引發的起源。
- `ConfigPropertySchema.AdditionalProperties` — 所描述的可選欄位
  超出 `Properties` 中的物件類型配置屬性的架構。
- `ChangesetContentChangedAction` 用於完全替換變更集文件
  帶有可選操作和錯誤詳細資訊的快照。
- `ChangesetOperationStatusDisabled` — 新的 `ChangesetOperationStatus` 值
  目前不可用且無法呼叫的操作。
- `ChangesetOperation.Group` — 分組相關的可選標識符
  UI 中一起進行變更集操作。
- 每回合聊天操作的 `Meta`（連線 `_meta`）欄位（`chat/turnStarted`，
  `chat/delta`、`chat/responsePart`、`chat/reasoning`、`chat/usage`、
  `chat/turnComplete`、`chat/turnCancelled`、`chat/error`) — 可選
  提供者特定的元資料，以便主機可以攜帶可移植的每個事件上下文，
  例如將事件歸因於特定代理（例如，代理行為的子代理）回合內）。

### 已更改

- `ToolResultSubagentContent.Resource` 現在被指定為產生的工作人員
  **聊天** URI (`ahp-chat:/<cid>`)，而不是工作階段 URI — 工具產生的
  子代理是聊天。它的文件現在描述了與工作者的通信
  聊天的 `ChatToolOrigin` 記錄（匹配 `ToolCallId`），該記錄仍然是
  產生關係的規範表示。
- **破壞：** `ChangesetOperationTargetRange` 現在是巢狀的 `TextRange`
  (`{start: {line, character}, end: {line, character}}`) 而非平面
  `{start, end}` `int64` 欄位。

### 固定的

- 現在，當不存在時，JSON 輸出中會省略 `ActionEnvelope.Origin`
  (`json:"origin,omitempty"`) 而非序列化為 `null`。

### 新增

- `ApplyActionToChangeset`、`ApplyActionToAnnotations` 和 `ApplyActionToResourceWatch` — 完整的 reducer 實作取代了先前的存根；這三個系列的 `types/test-cases/reducers/` 中的所有共享一致性裝置現已通過。
- `SnapshotState.ResourceWatch` 指標欄位 — `Snapshot.state` 聯集
  現在接受 `ResourceWatchState`，透過探測所需的內容進行解碼
  `root` + `recursive` 鍵（在現有變更集和
  註釋探針）。

### 固定的

- reducer 奇偶校驗裝置現在需要來自每個的 `_meta` 更新
  工具呼叫範圍內的操作，而不僅僅是 `session/toolCallStart`。

### 新增

- 新註解通道線路類型 (`ahp-session:/<uuid>/annotations`)：
  `AnnotationsState`，`Annotation`，`AnnotationEntry`，
  `AnnotationsSummary`; 用戶端-可調度的 `AnnotationsSetAction`，
  `AnnotationsRemovedAction`，`AnnotationsEntrySetAction`，
  `AnnotationsEntryRemovedAction` 變體 — 用戶端驅動每個註釋
  透過直接分派這些突變，分配 `Annotation.Id` /
  `AnnotationEntry.Id` 他們自己；
  `ApplyActionToAnnotations`（存根鏡像 `ApplyActionToChangeset`）；和
  `SnapshotState.Annotations`。
- `MessageAnnotationsAttachment`（`annotations` `MessageAttachment` 變體）
  透過 `Resource` 引用工作階段註釋通道上的註釋
  URI，可以選擇縮小為 `AnnotationIds` 陣列。
- `AnnotationsUpdatedAction` (`annotations/updated`) — 部分更新
  現有註解的 `TurnID` / `Resource` / `Range` / `Resolved` 不帶
  重新發送其條目。由註解 reducer 處理（未知時無操作
  身份證）。

- `ahp-chat:` 每個聊天對話的通道狀態； `SessionState.chats[]` 目錄； `SessionState.defaultChat?` 輸入路由提示； `ChatOrigin` 出處聯集； `createChat` / `disposeChat` 指令。
- `ChatSummary.WorkingDirectory` — 可選的每個聊天工作目錄。當不存在時，回退到工作階段的 `WorkingDirectory`。
- `ChatInteractivity` 字串列舉 (`ChatInteractivityFull` / `ChatInteractivityReadOnly` / `ChatInteractivityHidden`) 和可選的 `ChatSummary.Interactivity` / `ChatState.Interactivity` 欄位描述使用者如何與聊天互動。缺席預設為 `"full"`。
- 工作階段通道上的三個離散聊天目錄操作 — `SessionChatAddedAction`（由 `Summary.Resource` 更新插入）、`SessionChatRemovedAction` 和 `SessionChatUpdatedAction`（部分更新負載）。
- `SessionDefaultChatChangedAction` (`session/defaultChatChanged`) — 更新 `SessionState.DefaultChat` 引導新輸入到指定聊天；缺少值會清除提示。
- `ErrorInfo.Meta map[string]json.RawMessage` — 錯誤負載上可選的特定於提供者的元資料包（線路上的 `_meta`），鏡像 `UsageInfo` 和其他協定類型上的現有 `Meta` 欄位。
- `RootState` 現在公開一個可選的 `_meta` 屬性包（`Metamap[string]json.RawMessage`) 用於實作定義的代理主機元資料，
  例如攜帶主機建置的眾所周知的 `hostBuild` 金鑰
  版本/提交/日期。

### 已更改

- `ChatState` 現在是扁平的 — 之前嵌入的 `Summary` 已替換為內聯 `Resource` / `Title` / `Status` / `Activity` / `ModifiedAt` / `Model` / `Agent` / `Origin` / {c362 欄位。 `ChatSummary` 仍作為 `SessionState.Chats` 上的獨立目錄條目。
- `ChatSummary.ModifiedAt` 和 `ChatState.ModifiedAt` 現在是 ISO 8601 `string` 值，而不是整數毫秒。

### 已刪除

- `SessionChatsChangedAction`（由上面的三個離散聊天目錄操作取代）。

## [0.3.0] — 2026-06-05

實作 AHP 0.3.0。

### 新增

- `McpServerCustomization` 現在公開完整的 MCP 生命週期：`Enabled`，
  判別`McpServerState`聯集
  (`Starting`/`Ready`/`AuthRequired`/`Error`/`Stopped`)，可選
  `Channel` `mcp://` 側通道的 URI，以及可選的 `McpApp`
  阻止為 MCP 應用程式攜帶 `AhpMcpUiHostCapabilities`。
- `McpServerAuthRequiredState` 變體攜帶 `ProtectedResourceMetadata`
  加上 `Reason` / `RequiredScopes` / `Description` 所以現有
  `authenticate` 指令可以驅動 per-伺服器驗證。
- `Customization` 頂級聯集現在包括 `McpServer` — 主機可以
  直接表面裸露MCP 伺服器，而不是僅在插件內或
  目錄。
- `SessionMcpServerStateChangedAction` 和符合的 reducer 大小寫 —
  在現有的 MCP 上縮小 `State` + `Channel` 的更新插入
  伺服器按 ID 自訂。
- `InitializeParams.Capabilities` 上的 `ClientCapabilities` 結構
  第一筆`McpApps`。
- `Changeset` 上的 `changeKind` 欄位（眾所周知的值：`'session'`，
  `'branch'`、`'uncommitted'`、`'turn'`、`'compare-turns'`）。
- `ChangesetOperation` 上的 `status` 和 `error` 欄位以及
  `changeset/operationStatusChanged` 操作，追蹤
  `idle → running → error` 變更集操作的生命週期。- `AgentCustomization._meta` 提供者元資料欄位。
- `SessionSummary` 上的可選 `changes` 欄位（`ChangesSummary` 以及可選的 `additions`、`deletions` 和 `files` 計數）總結了工作階段的檔案變更足跡。

### 已更改

-Reducer 分為每個聊天處理器和工作階段聚合處理器，以符合多聊天協定形狀。
- `fetchTurns` 和 `completions` 現在以 `ahp-chat:` 通道為目標； `PROTOCOL_VERSION` 撞到了 `0.4.0`。
- 將 `ChangesetSummary` 型別重新命名為 `Changeset`。線上形狀沒有改變。
- 將 `changesets` 目錄從 `SessionSummary` 移至 `SessionState`。 `session/changesetsChanged` 操作現在直接更新 `state.changesets`，而不是 `state.summary.changesets`。

### 已刪除

- `SessionState.turns`、`SessionState.activeTurn`、`SessionState.steeringMessage`、`SessionState.queuedMessages`、`SessionState.inputRequests`（移至 `ChatState`）。
- 從 `ChangesetSummary` 中刪除了 `additions`、`deletions` 和 `files` 欄位。總計計數現在位於 `SessionSummary.changes` 上；每個變更集視圖從 `ChangesetState.files` 取得自己的總數。

### 已更改

- `ToolCallBase.ToolClientId *string` 替換為
  `ToolCallBase.Contributor *ToolCallContributor`（與
  `Client { ClientId }` 和 `Mcp { CustomizationId }` 變體）。
  `SessionToolCallStartAction` 攜帶新的 `Contributor` 欄位為
  好吧。重新命名後會出現 reducer。
## [0.1.0] — 2026-05-28

實作 AHP `0.2.0`。

Go 模組的第一個發布版本。包括：

- `ahptypes` — 從 `types/*.ts` 產生的線路類型，包括
  擴充的 `resource*` 系列（`resourceResolve`、`resourceMkdir`、
  `createResourceWatch`，新的 `ahp-resource-watch:/` 通道
  `resourceWatch/changed` 運算），`ResourceWriteParams` 的 `mode` /
  `position` / `ifMatch` 欄位，新的 `Conflict` (`-32011`) 錯誤代碼，
  以及暴露在其上的雙向內容承載 `resource*` 表面
  `CommandMap` 和 `ServerCommandMap`。結構使用 Go
  JSON 結構標籤，保留規格的駝峰式連線名稱；
  判別聯集是具體的包裝結構，透過以下方式往返
  自訂 `MarshalJSON` / `UnmarshalJSON`；位元集列舉的型別為 `uint32`
  帶有命名標誌常數和助手。
- `UserMessage._meta` 可選地圖欄位，生成為
  `Map[string]json.RawMessage`，公開新的規格級提供者
  使用者訊息的元資料通道。
- `ahp` — 由可插拔 `Transport` 驅動的非同步 `Client`，純
  `ApplyActionToRoot` / `ApplyActionToSession` / `ApplyActionToTerminal`
  /`ApplyActionToChangeset` reducer，`MultiHostClient` 下的執行時
  `ahp/hosts`，`MultiHostStateMirror` 助手。- `ahpws` — 基於 `github.com/coder/websocket` 建構的 WebSocket 傳輸，
  符合 Rust `ahp-ws` crate的 API 形狀。