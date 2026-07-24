# 變更日誌 — `AgentHostProtocol` Swift 包

對 Swift 包的所有顯著變更 (`AgentHostProtocol` +
`AgentHostProtocolClient` 產品）記錄在此。參見
[`../../CHANGELOG.md`](../../CHANGELOG.md) 協定規格變更日誌
和 [`release-metadata.json`](release-metadata.json) 用於機器可讀
目前原始碼樹和協定版本之間的對應。

格式基於[保留變更日誌](https://keepachangelog.com/en/1.1.0/)
包遵循 [SemVer](https://semver.org)。

SwiftPM 透過匹配儲存庫中的普通 `vX.Y.Z` git 標籤來解析套件
root，因此 Swift 版本使用裸 semver 標記命名空間（沒有 `swift/`
前綴）。 `publish-swift.yml` 工作流程拒絕發布 `vX.Y.Z` 標籤
該文件中缺少匹配的 `## [X.Y.Z]` 標題，並驗證
此標籤與 [`VERSION`](VERSION) 中固定的版本相符。

## [未發布]

## [0.6.0] — 2026-07-20

實作 AHP 0.6.0。

### 新增

- `Changeset.capabilities` 具有 `review` 存在標誌 (`ChangesetCapabilities`)，以便變更集可以在工作階段的變更集清單中預先宣傳對每個文件審核工作流程的支援。（#328）
- `SystemNotificationResponsePart` 上的可選 `_meta` 插槽，遵循 MCP `_meta` 約定。主機可以附加觸發通知的機器可讀描述符，以便用戶端可以對其進行分類、圖示、分組、過濾或本地化，而無需解析 `content`。 (#308)
- `chat/turnStarted` 帶有 `startedAt` 時間戳，`chat/turnComplete`/`chat/turnCancelled`/`chat/error` 帶有經過的 `duration`（毫秒，生產者自己的時鐘），完成的回合公開其開始時間和持續時間。
- 非同步工具呼叫風險評估，具有模型提供的解釋和標準化安全評分。
- `ToolCallStatus.AuthRequired` 工具呼叫狀態和 `chat/toolCallAuthRequired` / `chat/toolCallAuthResolved` 操作，以便正在執行的 MCP 貢獻的工具呼叫可以暫停 OAuth 質詢 (`McpAuthRequirement`) 的執行過程，並在用戶端進行驗證後恢復；透過新的 `toolAuthentication` `SessionInputRequest` 變體出現在工作階段級別，`AuthenticateParams` 獲得了可選的 `scopes` 欄位，現在除了 `AgentInfo.protectedResources` 之外還接受從實時 `McpServerAuthRequiredState` 或 `ToolCallAuthRequiredState` 發現的資源。現在，當工具呼叫為 `auth-required` 時，`chat/toolCallComplete` 也接受失敗結果，從而讓用戶端在不完成驗證質詢的情況下取消該呼叫。
- 用於預先註冊公共和機密 OAuth 用戶端的 `McpAuthRequirement.oauthClient` 元資料。
- `AHPClient.ping()` 用於協定級連線活躍度和 `AHPCommands.ping(id:)` 請求工廠，鏡像 TypeScript 用戶端的 `AhpClient.ping()`。
- `AHPCommands.createTerminal(id:params:)` 和 `AHPCommands.disposeTerminal(id:params:)` 請求工廠，因此可以透過鍵入的命令介面存取產生的 `CreateTerminalParams` / `DisposeTerminalParams`，以與 `createSession` / `disposeSession` 進行奇偶校驗。（#341）

### 已更改

- 將變更集審核操作 `changeset/filesReviewedChanged` 重新命名為 `changeset/filesReviewChanged`（欄位 `fileIds` → `files`）並使其可用戶端分派，以便審核者可以直接透過預寫 reducer 切換檔案的 `reviewed` 標誌。（#328）
- 輸入請求現在依序存在 `responseParts`，並帶有可選的 `response`，直到 `chat/inputCompleted` 提交結果。（#327）

## [0.5.2] — 2026-07-09

實作 AHP 0.5.2。

### 新增

- 在 `AHPClient` 上鍵入 `resource*` 便捷方法：發送包裝器（`resourceRead`、`resourceWrite`、`resourceList`、`resourceCopy`、`resourceDelete`、`resourceMove`、`resourceResolve`、`resourceMkdir`、`resourceRequest`、`createResourceWatch`)和請求通過 `setServerRequestHandler(_:)` 處理通過 {c72x} 的新站） `ServerRequestHandler` 類型別名和`ResourceRequestHandlers` 型別）。入站伺服器發起的請求由已安裝的處理器應答（未設定時仍為 `MethodNotFound`）。
- `ToolResultTerminalCompleteContent` 用於工具中的終端機樣式完成元資料
  結果。
- 子自訂類型上的可選 `enabled` 欄位
  （`AgentCustomization`、`SkillCustomization`、`PromptCustomization`、
  `RuleCustomization`，`HookCustomization`）。
- `SkillCustomization` 上的 `disableUserInvocation`，加上 `disableModelInvocation`
  和 `AgentCustomization` 上的 `disableUserInvocation`。
- `ChangesetFile` 上的可選 `reviewed` 欄位。省略它（或將其設為
  `nil`) 表示伺服器不支援檔案“審核”
  功能。
- 伺服器的 `changeset/filesReviewedChanged` 操作以更新 `reviewed`
  一個或多個變更集檔案的標誌。
- 每個自訂項目上的可選 `meta`（連線 `_meta`）提供者元資料欄位型別，從 `AgentCustomization` 移至共用自訂基礎，因此
  `PluginCustomization`，`ClientPluginCustomization`，`DirectoryCustomization`，
  `SkillCustomization`、`PromptCustomization`、`RuleCustomization`、
  `HookCustomization`和`McpServerCustomization`都帶有它。
- `InitializeResult` 上的可選 `serverInfo` 和 `clientInfo` 上
  `InitializeParams`，每 `Implementation` （`name`，可選 `version`，
  可選`title`），辨識雙方背後的實作與構建
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
- `InputRequestResponsePart` 和 `ResponsePart.inputRequest` 情況。這reducer 現在在活動回合中記錄已解決的輸入請求
  `responseParts` on `chatInputCompleted` - 嵌入已解析的
  `ChatInputRequest`（最後的`answers`）和`response`（`accept`，`decline`，
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
- `SubscribeParams.delivery.maxLatencyMs` 和
  `AHPClient.subscribe(_:delivery:)` 為用戶端請求最大值
  訂閱傳送延遲，包括無故意合併的 `0`。
- `AgentInfo` 上的可選 `capabilities` 欄位（`AgentCapabilities` 帶有
  巢狀的 `multipleChats` 功能攜帶 `fork`)，因此用戶端門多聊天
  並透過廣告功能而不是提供者 ID 交換器進行分叉。
- 透過新的共享 `PaginatedParams` 對 `listSessions` 進行基於遊標的分頁
  (`limit` + `cursor`) 和 `PaginatedResult` (`nextCursor`) 型：
  `ListSessionsParams` 和 `ListSessionsResult` 現在攜帶這些欄位，讓
  用戶端瀏覽大型工作階段目錄。完全相加－省略
  欄位保留先前的行為。
- `SubscribeParams.view.turns`、`ChatState.turnsNextCursor` 和
  `chat/turnsLoaded` 操作，以便用戶端可以訂閱有限的聊天尾部
  歷史記錄和較舊的頁面會根據需要變成減少的聊天狀態。
- `SessionState.inputNeeded` — 工作階段等級未完成輸入的聚合
  所有聊天中的請求（`SessionInputRequest` 列舉`SessionChatInputRequest`、`SessionToolConfirmationRequest` 和
  `SessionToolClientExecutionRequest` 例），加上
  `StateAction.sessionInputNeededSet` / `StateAction.sessionInputNeededRemoved`
  動作和 `ToolCallConfirmationState` 聯集。工作階段 reducer
  維護佇列中的 `SessionStatus.inputNeeded` 活動位，
  當最後一個條目被刪除時清除它（回退到 `.inProgress`）。
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

- `ListSessionsParams` 中的 `filter` 欄位。這是一個無類型的佔位符
  沒有定義的語意；一旦工作階段它就會以具體形狀傳回
  指定過濾/排序。

### 固定的

- `SnapshotState` 現在解碼 `chat` 變體。它的解碼器以前從未
  嘗試`ChatState`，因此聊天快照無法解碼。變體
  消歧也不再依賴刪除的 `summary` 欄位（剩餘的
  從 `SessionState` 被展平之前開始）。

## [0.5.0] — 2026-06-26

實作 AHP 0.5.0。

### 新增

- `ChatActivityChangedAction`（`StateAction.chatActivityChanged`，線路
  `chat/activityChanged`) 用於更新聊天的當前活動描述
  獨立於工作階段摘要。
- `ProgressParams` struct (wire `root/progress`) — 通用進度通知
  由 `progressToken` 相關（在 `CreateSessionParams` 上新增）。
  今天用於代理本機 SDK 的延遲首次使用下載。
- `SessionModelInfo.maxOutputTokens` 和 `SessionModelInfo.maxPromptTokens`
  用於傳達模型令牌限制的可選欄位。
- `SessionSummary.meta`（`_meta`線上）可選的提供者元資料欄位
  用於輕量級工作階段-列表演示提示。
- `SessionActiveClientRemovedAction` (`StateAction.sessionActiveClientRemoved`,
  連線 `session/activeClientRemoved`) 來釋放單一活動的用戶端
  `clientId`。
- `ChatDraftChangedAction`（`StateAction.chatDraftChanged`，線路
  `chat/draftChanged`) 和 `ChatState.draft` (`Message?`) 設定或清除
  使用者正在進行的聊天草稿輸入。聊天 reducer 應用它
  不蓋印章`modifiedAt`。
- `Message.model` 和 `Message.agent` 可選欄位攜帶選擇 a
  訊息是用.

### 已更改

- `SessionState.activeClients`（`[SessionActiveClient]`，必需）替換
  單一可選`SessionState.activeClient`；工作階段 reducer 更新插入和
  刪除由 `clientId` 鍵控的條目。
- `StateAction.sessionActiveClientChanged` 重新命名為
  `StateAction.sessionActiveClientSet`（連線`session/activeClientSet`）與
  upsert-by-`clientId` 語意學；它不再取消設定活動的用戶端
  （改為調度 `session/activeClientRemoved`）。
- `ConfigPropertySchema.enum` 欄位現在是 `[AnyCodable]?` 而不是
  `[String]?`，允許數字、布林值和空列舉值。
- `ModelSelection.config` 值現在是 `AnyCodable` 而非 `String`，
  允許數字、布林值和空配置值。
- `SessionState` 現在內嵌工作階段元資料欄位（`provider`、`title`、
  直接`status`、`activity`、`project`、`workingDirectory`、`annotations`)
  而非嵌入 `summary: SessionSummary`。工作階段 reducer 發生突變
  這些欄位直接並且不再標記 `modifiedAt`。 `SessionSummary`
  仍然是僅根目錄結構，其 `createdAt`/`modifiedAt` 現在是
  ISO-8601 `String` 不再包含 `model`/`agent`。- `ChatState` 和 `ChatSummary` 不再攜帶 `model`/`agent`。

### 已刪除

- `SessionActiveClientToolsChangedAction`。活動的用戶端現在更新其
  透過重新調度 `StateAction.sessionActiveClientSet` 及其
  完整的、更新的條目。
- `SessionModelChangedAction` (`StateAction.sessionModelChanged`,
  `session/modelChanged`) 和 `SessionAgentChangedAction`
  (`StateAction.sessionAgentChanged`, `session/agentChanged`)，以及他們的
  工作階段-reducer 處理。

## [0.4.0] — 2026-06-19

實作 AHP 0.4.0。

### 新增

- `MessageOrigin` 結構與 `MessageKind` 列舉現在型別 `Message.origin`
  （以前是無類型的 `AnyCodable`）； `MessageKind` 涵蓋 `user`、`agent`、
  `tool` 和 `systemNotification`，新增忠實代理和工具發起的
  起源。
- `ConfigPropertySchema.additionalProperties` — 描述的可選欄位
  超出 `properties` 中的物件類型配置屬性的架構。
- `ChangesetContentChangedAction` 用於完全替換變更集文件
  帶有可選操作和錯誤詳細資訊的快照。
- `ChangesetOperationStatus.disabled` — 變更集操作的新案例
  目前不可用且無法呼叫。
- `ChangesetOperation.group` — 分組相關的可選標識符
  UI 中一起進行變更集操作。
- 每回合聊天操作的 `_meta` (`meta`) 欄位 (`chat/turnStarted`,
  `chat/delta`、`chat/responsePart`、`chat/reasoning`、`chat/usage`、
  `chat/turnComplete`、`chat/turnCancelled`、`chat/error`) — 可選
  提供者特定的元資料，以便主機可以攜帶可移植的每個事件上下文，
  例如將事件歸因於特定代理（例如，代理行為的子代理）
  回合內）。

### 已更改

- `ToolResultSubagentContent.resource` 現在被指定為產生的工作人員
  **聊天** URI (`ahp-chat:/<cid>`)，而不是工作階段 URI — 工具產生的
  子代理是聊天。它的文件現在描述了與工作者的通信
  聊天的 `ChatOrigin.tool` 記錄（匹配 `toolCallId`），該記錄仍然是
  產生關係的規範表示。
- **中斷：** `SessionStatus` 現在是具有 `UInt32` rawValue 的 `OptionSet`
  （原為 `Int`），一個無符號 32 位元位集，保留組合和未知
  前向相容位。將標誌與 set-union (`∪` / `union`) 結合並測試
  `contains(_:)` 的會員資格。
- **破壞：** `ChangesetOperationTarget` 的範圍目標現在帶有巢狀
  `TextRange` (`{start: {line, character}, end: {line, character}}`) 而非
  平面 `{start, end}` 整數對。

### 新增

- `SnapshotState.resourceWatch` 案例和匹配
  `MultiHostStateMirror.resourceWatches` 槽，所以 `applySnapshot(host:snapshot:)`
  可以播種 `ahp-resource-watch:` 通道的描述符（根 URI、遞歸
  標誌，可選包含/排除）與現有根 / 工作階段 /
  終端機/變更集/註解槽。 `reset(host:)` / `reset()` 清除
  新插槽。

### 固定的

- `AnyCodable.encode` 不再將 `NSNumber` 支援的 `Int`/`Double` 值破壞為 `Bool`/`Int`。 `NSNumber` 現在是通用 Swift 型別臂之前的特殊情況，使用 `CFBooleanGetTypeID()` 來區分佈林值和數字 `NSNumber` 實例。
- `AnyCodable.encode(to:)` 現在保留 `Int64.max` 以上的無符號整數（透過 `uint64Value` 編碼 `objCType` 無符號的 `NSNumber` 值，而不是有符號的 `int64Value` 回退），並且 `scripts/generate-swift.ts` 中的 `AnyCodable.swift` 模板重現完整的編碼/腳架邏輯，因此重新生成完整的空間。
- `MultiHostClient`/host 執行時期現在在 `initialize` 上通告產生的 `SUPPORTED_PROTOCOL_VERSIONS`，而不是過時的硬編碼 `"0.2.0"`。
- 工作階段 reducer現在應用來自每個的 `_meta` (`meta`) 更新
  工具呼叫範圍內的操作，而不僅僅是 `session/toolCallStart`。

### 新增

- 新註解通道線路類型 (`ahp-session:/<uuid>/annotations`)：
  `AnnotationsState`，`Annotation`，`AnnotationEntry`，
  `AnnotationsSummary`；和用戶端-可調度
  `annotations/set` / `annotations/removed` / `annotations/entrySet`
  / `annotations/entryRemoved` 案例，在 `StateAction` — 用戶端磁碟機上，每
  透過直接分派這些註釋突變，分配
  `Annotation.id` / `AnnotationEntry.id` 本身；和
  `SnapshotState.annotations`。
- `MessageAnnotationsAttachment`（`annotations` `MessageAttachment` 變體）
  透過 `resource` 引用工作階段的註釋通道上的註釋
  URI，可以選擇縮小為 `annotationIds` 陣列。
- `annotationsReducer` 實作；註釋一致性裝置 (210-219) 現已通過。

- `AnnotationsUpdatedAction` (`annotations/updated`) — 部分更新
  現有註釋的 `turnId` / `resource` / `range` / `resolved` 不帶
  重新發送其條目。由註解 reducer 處理（未知時無操作
  身份證）。

- `ahp-chat:` 每個聊天對話的通道狀態； `SessionState.chats[]` 目錄； `SessionState.defaultChat?` 輸入路由提示； `ChatOrigin` 出處聯集； `createChat` / `disposeChat` 指令。
- 用於增量聊天目錄更新的 `SessionChatAddedAction`、`SessionChatRemovedAction` 和 `SessionChatUpdatedAction` 處理。
- `ChatSummary.workingDirectory` — 可選的每個聊天工作目錄。當不存在時，傳回工作階段的 `workingDirectory`。
- `SessionDefaultChatChangedAction` (`session/defaultChatChanged`) — 更新 `SessionState.defaultChat` 引導新輸入到指定聊天；缺少值會清除提示。
- `ErrorInfo.meta: [String: AnyCodable]?` — 錯誤負載上可選的特定於提供者的元資料包（序列化為 `_meta`），鏡像 `UsageInfo` 和其他協定類型上的現有 `meta` 欄位。用戶端可以在此處檢查眾所周知的鍵，以獲得更豐富的本地化錯誤 UI。
- `RootState` 現在公開一個可選的 `_meta` 屬性包（`meta: [String:
  AnyCodable]?`) 用於實作定義的代理主機元資料，例如
  眾所周知的 `hostBuild` 鍵，包含主機的建置版本/提交/日期。- `changesetReducer` 和 `resourceWatchReducer` — 兩個狀態 reducer
  Swift 用戶端中缺少的功能現已實作，鏡像
  規範的 TypeScript reducer（以及 Kotlin/.NET 用戶端）。 `changesetReducer`
  將 `changeset/*` 操作折疊到 `ChangesetState` 中； `resourceWatchReducer`
  將 `resourceWatch/changed` 視為記錄的事件傳遞。的
  夾具驅動的 reducer 測試不再默默地跳過終端機、變更集、
  和 resourceWatch 夾具系列 - 他們現在解碼並斷言，使用
  剩餘差距（未知判別回應部分；尚未實作
  註解通道）由顯式漂移絆線固定。

### 已更改

- `ChatState` 現在是扁平的 — 之前嵌入的 `summary` 已替換為內聯 `resource` / `title` / `status` / `activity` / `modifiedAt` / `model` / `agent` / `origin` / 屬性 `agent` / `origin`/屬性。 `ChatSummary` 仍作為 `SessionState.chats` 上的獨立目錄條目。
- `ChatSummary.modifiedAt` 和 `ChatState.modifiedAt` 現在是 ISO 8601 `String` 值，而不是 `Int64`/`UInt64` 毫秒。

### 新增

- `ChatSummary.interactivity` / `ChatState.interactivity` (`"full" | "read-only" | "hidden"`) 指示使用者如何與聊天互動。缺席預設為 `"full"`。

### 已刪除

- `SessionChatsChangedAction`（由上面的三個離散聊天目錄操作取代）。

### 固定的

- 編碼保真度：未知的 `StateAction` 變體不再重新編碼為
  `{}`（刪除其 `type` 判別式和額外欄位）；原始有效負載是
  解碼時保留並逐字重新發送。
- 前向相容性：線路解碼判別的未知判別式
  聯集（`ResponsePart`、`ToolCallState`、`TerminalClaim`、
  `TerminalContentPart`、`Customization` 和其他可進化聯集）現在解碼
  到原始直通並逐字重新編碼而不是拋出
  `DecodingError`，因此攜帶未知變體的快照仍然可以解碼並
  後續動作正確摺疊。
- `ChangesetOperationResourceTarget` / `…RangeTarget` 現在對其 `kind` 進行編碼
  判別式（以前是從 `CodingKeys` 排除的計算屬性，因此它
  被丟棄在編碼上）。

## [0.3.0] — 2026-06-05

實作 AHP 0.3.0。

### 新增

- `McpServerCustomization` 現在公開完整的 MCP 生命週期：`enabled`，
  判別 `McpServerState` 列舉
  (`.starting`/`.ready`/`.authRequired`/`.error`/`.stopped`)，可選
  `channel` `mcp://` 側通道的 URI，以及可選的 `mcpApp`
  阻止為 MCP 應用程式攜帶 `AhpMcpUiHostCapabilities`。
- `McpServerAuthRequiredState` 攜帶 `ProtectedResourceMetadata`
  加上 `reason` / `requiredScopes` / `description` 現有
  `authenticate` 指令可以驅動 per-伺服器驗證。
- `Customization.mcpServer` 頂級案例 - 主機可能表面裸露
  直接 MCP 伺服器而不僅僅是在插件或目錄中。
- `SessionMcpServerStateChangedAction` 和匹配的 reducer 手臂 —
  在現有的 MCP 上縮小 `state` + `channel` 的更新插入
  伺服器按 ID 自訂。透過 `Reducers.swift` 和
  基於協定的`NativeReducer.swift`。
- `InitializeParams.capabilities` 上的 `ClientCapabilities` 結構
  第一個條目`mcpApps`。
- `Changeset` 上的 `changeKind` 欄位（眾所周知的值：`'session'`，
  `'branch'`、`'uncommitted'`、`'turn'`、`'compare-turns'`）。
- `ChangesetOperation` 上的 `status` 和 `error` 欄位以及
  `changeset/operationStatusChanged` 操作，追蹤`idle → running → error` 變更集操作的生命週期。
- `AgentCustomization._meta` 提供者元資料欄位。
- `SessionSummary` 上的可選 `changes` 欄位（`ChangesSummary` 以及可選的 `additions`、`deletions` 和 `files` 計數）總結了工作階段的檔案變更足跡。

### 已更改

- `fetchTurns` 和 `completions` 現在以 `ahp-chat:` 通道為目標； `PROTOCOL_VERSION` 撞到了 `0.4.0`。
- 將 `ChangesetSummary` 型別重新命名為 `Changeset`。線上形狀沒有改變。
- 將 `changesets` 目錄從 `SessionSummary` 移至 `SessionState`。 `session/changesetsChanged` 操作現在直接更新 `state.changesets` 而不是 `state.summary.changesets`。

### 已刪除

- `SessionState.turns`、`SessionState.activeTurn`、`SessionState.steeringMessage`、`SessionState.queuedMessages`、`SessionState.inputRequests`（移至 `ChatState`）。
- 從 `ChangesetSummary` 中刪除了 `additions`、`deletions` 和 `files` 欄位。總計計數現在位於 `SessionSummary.changes` 上；每個變更集視圖從 `ChangesetState.files` 取得自己的總數。

### 已更改

- `ToolCallBase.toolClientId: String?` 替換為
  `ToolCallBase.contributor: ToolCallContributor?`（列舉與
  `.client(ToolCallClientContributor)` 和 `.mcp(ToolCallMcpContributor)`
  例）。 `SessionToolCallStartAction` 攜帶新的 `contributor`
  場也是如此。 `Reducers.swift`、`NativeReducer.swift` 和
  `ToolCallStateExtensions.swift` 遵循重命名。

## [0.2.0] — 2026-05-28

實作 AHP `0.2.0`。

第一個版本的 Swift Package Manager 版本。包括：

- `AgentHostProtocol` 產品 — 產生的連線路類型、操作、指令、
  通知、錯誤、reducer（`AHPRootReducer`、`AHPSessionReducer`、
  `AHPTerminalReducer`、`AHPChangesetReducer`、`NativeReducer`）。包括
  擴充的 `resource*` 系列（`resourceResolve`、`resourceMkdir`、
  `createResourceWatch`，新的 `ahp-resource-watch:/` 通道
  `resourceWatch/changed` 操作）、`ResourceWriteParams` 的 `mode` /
  `position` / `ifMatch` 欄位，新的 `Conflict` (`-32011`) 錯誤代碼，
  以及暴露在其上的雙向內容承載`resource*`表面
  `CommandMap` 和 `ServerCommandMap`。
- `UserMessage.meta` 可選的 `[String: AnyCodable]?` 欄位（序列化為
  `_meta`），向使用者公開新的規格層級提供者元資料通道
  訊息。產生的 `init` 得到一個尾隨的 `meta:` 參數
  預設為 `nil`。
- `AgentHostProtocolClient` 產品 — 單主機 `AHPClient`、多主機
  `MultiHostClient`、`AHPStateMirror` / `MultiHostStateMirror`、傳輸
  （`URLSessionWebSocketTransport`、`NWConnectionWebSocketTransport`、
  `InMemoryTransport`），以及持久的用戶端-ID 儲存。
- 產生 `PROTOCOL_VERSION` 和 `SUPPORTED_PROTOCOL_VERSIONS` 常數
  在 `AgentHostProtocol` 模組上。