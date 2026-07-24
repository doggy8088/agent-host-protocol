# 變更日誌 — `ahp-types`、`ahp`、`ahp-ws` (Rust)

對 Rust 用戶端包的所有顯著變更都記錄在此處。 Rust
Workspace 同時運送其三個 crate（`ahp-types`、`ahp`、`ahp-ws`）
版本－碰撞一個就碰撞所有三個。參見
[`../../CHANGELOG.md`](../../CHANGELOG.md) 協定規格變更日誌
和 [`release-metadata.json`](release-metadata.json) 用於機器可讀
目前原始碼樹和協定版本之間的對應。

格式基於[保留變更日誌](https://keepachangelog.com/en/1.1.0/)
包遵循 [SemVer](https://semver.org)。

`publish-rust.yml` 工作流程拒絕發布 `rust/vX.Y.Z` 標籤，其
此文件中缺少符合的 `## [X.Y.Z]` 標題。

## [未發布]

## [0.6.0] — 2026-07-20

實作 AHP 0.6.0。

### 新增

- `Changeset.capabilities` 具有 `review` 存在標誌 (`ChangesetCapabilities`)，以便變更集可以在工作階段的變更集清單中預先宣傳對每個文件審核工作流程的支援。（#328）
- `SystemNotificationResponsePart` 上的可選 `_meta` 插槽，遵循 MCP `_meta` 約定。主機可以附加觸發通知的機器可讀描述符，以便用戶端可以對其進行分類、圖示、分組、過濾或本地化，而無需解析 `content`。 (#308)
- `chat/turnStarted` 帶有 `startedAt` 時間戳，`chat/turnComplete`/`chat/turnCancelled`/`chat/error` 帶有經過的 `duration`（毫秒，生產者自己的時鐘），並且完成的回合公開其開始時間和持續時間。
- 非同步工具呼叫風險評估，具有模型提供的解釋和標準化安全評分。
- `ToolCallStatus.AuthRequired` 工具呼叫狀態和 `chat/toolCallAuthRequired` / `chat/toolCallAuthResolved` 操作，以便正在執行的 MCP 貢獻的工具呼叫可以暫停 OAuth 質詢 (`McpAuthRequirement`) 的執行過程，並在用戶端進行驗證後恢復；透過新的 `toolAuthentication` `SessionInputRequest` 變體出現在工作階段級別，`AuthenticateParams` 獲得了可選的 `scopes` 欄位，現在除了 `AgentInfo.protectedResources` 之外還接受從實時 `McpServerAuthRequiredState` 或 `ToolCallAuthRequiredState` 發現的資源。現在，當工具呼叫為 `auth-required` 時，`chat/toolCallComplete` 也接受失敗結果，從而讓用戶端在不完成驗證質詢的情況下取消該呼叫。
- 預先註冊的公共和機密 OAuth 用戶端的 `McpAuthRequirement.oauthClient` 元資料。
- `Client::ping()` 用於協定級連線活躍度，鏡像 TypeScript 用戶端的 `AhpClient.ping()`。

### 已更改

- 將變更集審核操作 `changeset/filesReviewedChanged` 重新命名為 `changeset/filesReviewChanged`（欄位 `fileIds` → `files`）並使其可用戶端分派，以便審核者可以直接透過預寫 reducer 切換檔案的 `reviewed` 標誌。（#328）
- 輸入請求現在依序存在 `responseParts`，並帶有可選的 `response`，直到 `chat/inputCompleted` 提交結果。（#327）

## [0.5.2] — 2026-07-09

實作 AHP 0.5.2。

### 新增

- 在 `ahp::Client` 上鍵入 `resource*` 便捷方法：發送包裝器（`resource_read`、`resource_write`、`resource_list`、`resource_copy`、`resource_delete`、`resource_move`、`resource_resolve`、`resource_mkdir`、`resource_request`、`create_resource_watch`)和請求通過 `resource_resolve`、`resource_mkdir`、`resource_request`、`create_resource_watch`)和請求通過 `set_server_request_handler` 處理的 65 `ServerRequestHandler`、 `ServerRequestFuture` 和 `ResourceRequestHandlers` 類型）。現在，透過已安裝的處理器或未設定處理器的 `MethodNotFound` 應答（之前已丟棄）入站伺服器發起的請求。
- `ToolResultTerminalCompleteContent` 用於工具中的終端機樣式完成元資料
  結果。
- 子自訂類型上的可選 `enabled` 欄位
  (`AgentCustomization`、`SkillCustomization`、`PromptCustomization`、
  `RuleCustomization`，`HookCustomization`）。
- `disable_user_invocation` 在 `SkillCustomization` 上，加上
  `disable_model_invocation` 和 `disable_user_invocation` 上
  `AgentCustomization`。
- `ChangesetFile` 上的可選 `reviewed` 欄位。省略它（或將其設為
  `None`) 表示伺服器不支援檔案“審核”
  功能。
- 伺服器的 `changeset/filesReviewedChanged` 操作以更新 `reviewed`
  一個或多個變更集檔案的標誌。
- 每個自訂項目上的可選 `meta`（連線 `_meta`）提供者元資料欄位型別，從 `AgentCustomization` 移至共用自訂基礎，以便
  `PluginCustomization`，`ClientPluginCustomization`，`DirectoryCustomization`，
  `SkillCustomization`，`PromptCustomization`，`RuleCustomization`，
  `HookCustomization` 和 `McpServerCustomization` 都帶有它。
- `InitializeResult` 上的可選 `server_info` 和 `client_info` 上的可選
  `InitializeParams`，每個都是一個 `Implementation` 結構（`name`，可選
  `version`，可選 `title`），識別背後的實作與構建
  握手的兩側。僅供參考 — 不得用於
  特徵檢測。
- `InitializeResult` 上的可選 `terminal_command_prefix`，適用於下列主機：
  支援將 `!` 前綴的使用者訊息解釋為終端機命令。
- `PluginCustomization` 上的可選 `version` 欄位（繼承自
  `ClientPluginCustomization`)，攜帶來自於的插件的 semver
  開啟插件清單。僅出處/展示。
- `session/mcpServerStartRequested` 和 `session/mcpServerStopRequested`
  用戶端要求主機啟動或停止 MCP 伺服器的操作；停止
  將 `authRequired` 伺服器移到 `stopped`，因此它不再等待
  認證。
- `InputRequestResponsePart` 和 `ResponsePart::InputRequest` 變體。這reducer 現在在活動回合中記錄已解決的輸入請求
  `response_parts` on `chat/inputCompleted` - 嵌入已解析的
  `ChatInputRequest`（最終的`answers`）和`response`（`accept`，`decline`，
  或 `cancel`) — 因此在即時請求被刪除後結果仍然存在。
  放棄的請求仍然沒有記錄任何內容（#324）。

### 已更改

- `session/customizationToggled` reducer 現在可以切換任何頂級
  自訂（`plugin`、`directory` 或頂層 `mcpServer`）或
  透過 `id` 單獨的子項，設定該條目的 `enabled`。

## [0.5.1] — 2026-07-02

實作 AHP 0.5.1。

### 新增

- `ContentRef` 上的可選 `nonce` 欄位。
- `SubscribeParams.delivery.max_latency_ms` 和
  `Client::subscribe_with_delivery` 為用戶端請求最大值
  訂閱交付延遲，包括無故意合併的 `0`。
- `AgentInfo` 上的可選 `capabilities` 欄位（`AgentCapabilities` 帶有
  巢狀的 `multipleChats` 功能攜帶 `fork`)，因此用戶端門多聊天
  並透過廣告功能而不是提供者 ID 交換器進行分叉。
- 透過新的共享 `PaginatedParams` 對 `listSessions` 進行基於遊標的分頁
  (`limit` + `cursor`) 和 `PaginatedResult` (`next_cursor`) 型：
  `ListSessionsParams` 和 `ListSessionsResult` 現在攜帶這些欄位，讓
  用戶端瀏覽大型工作階段目錄。完全相加－省略
  欄位保留先前的行為。
- `SubscribeParams.view.turns`，`Client::subscribe_with_options`，
  `ChatState.turns_next_cursor` 和 `chat/turnsLoaded` 操作，因此用戶端
  可以訂閱聊天歷史記錄的有限尾部，並且較舊的頁面會變成
  減少按需聊天狀態。
- `SessionState.input_needed` — 工作階段等級未完成輸入的聚合所有聊天中的請求（`SessionInputRequest` 列舉
  `SessionChatInputRequest`、`SessionToolConfirmationRequest` 和
  `SessionToolClientExecutionRequest` 變體），加上
  `StateAction::SessionInputNeededSet` / `StateAction::SessionInputNeededRemoved`
  動作和 `ToolCallConfirmationState` 聯集。工作階段 reducer
  維護佇列中的 `SessionStatus::InputNeeded` 活動位，
  當最後一個條目被刪除時清除它（回退到 `InProgress`）。
- `ChatToolCallStartAction` 和每個工具呼叫上的可選 `intention` 欄位
  生命週期狀態。
- `AgentCustomization` 上的可選 `model` 和 `tools` 欄位用於自訂
  代理的固定模型和工具白名單。

### 已更改

- `fetchTurns` 現在接受來自 `ChatState.turns_next_cursor` 的 `cursor` 並且
  主機將舊的回合載入到聊天狀態後傳回空結果，
  而不是回傳一個分離的 `{ turns, hasMore }` 頁面。
- 產生的用戶端現在僅通告協定 `0.5.1`，因為 `fetchTurns`
  合約與 `0.5.0` 不相容。

- `SubscribeParams` 的直接 Rust 結構文字現在必須包含
  `delivery: None`和`view: None`；使用 `SubscribeParams::new(channel)` 或
  `Client::subscribe` 保持預設傳送行為。

### 已刪除

- `ListSessionsParams` 中的 `filter` 欄位。這是一個無類型的佔位符
  沒有定義的語意；一旦工作階段它就會以具體形狀傳回
  指定過濾/排序。

## [0.5.0] — 2026-06-26

實作 AHP 0.5.0。

### 新增

- `StateAction::ChatActivityChanged`（`ChatActivityChangedAction`，線路
  `chat/activityChanged`) 用於更新聊天的當前活動描述
  獨立於工作階段摘要。
- `ProgressParams` struct (wire `root/progress`) — 通用進度通知
  由 `progressToken` 相關（在 `CreateSessionParams` 上新增）。
  今天用於代理本機 SDK 的延遲首次使用下載。
- `SessionModelInfo.maxOutputTokens` 和 `SessionModelInfo.maxPromptTokens`
  用於傳達模型令牌限制的可選欄位。
- `SessionSummary.meta`（`_meta`線上）可選的提供者元資料欄位
  用於輕量級工作階段-列表演示提示。
- `StateAction::SessionActiveClientRemoved` (`SessionActiveClientRemovedAction`)
  由 `client_id` 釋放單一活動的用戶端。
- `StateAction::ChatDraftChanged` (`ChatDraftChangedAction`) 和聊天 - reducer
  設定或清除 `ChatState.draft` 的手臂。
- `ChatState.draft` (`Option<Message>`) 持有正在進行的、未發送的訊息。
- `Message.model` 和 `Message.agent` 選用欄位記錄模型和
  為訊息選擇的代理。
- `ahp-ws` 現在可以透過 Cargo 功能選擇 TLS 後端：`native-tls`，
  `rustls-tls-native-roots`（預設）和 `rustls-tls-webpki-roots`。crate不再將 `tokio-tungstenite/native-tls` 強製到依賴圖上，因此
  下游二進位檔案可以自由選擇自己的 WebSocket TLS 堆疊。

### 已更改

- `SessionState` 不再嵌入 `summary` 子結構；它的元資料欄位
  (`provider`、`title`、`status`、`activity`、`project`、`working_directory`、
  `annotations`) 現在直接內聯在 `SessionState` 上，不再
  攜帶 `model`、`agent`、`created_at` 或 `modified_at`。工作階段 reducer
  讀取和寫入這些平坦欄位並且不再標記 `modified_at`。
- `SessionSummary.created_at` 和 `SessionSummary.modified_at` 現在是 ISO-8601
  `String`s（以前是數字）； `SessionSummary` 不再具有 `model` 或
  `agent`。
- `ChatState` 和 `ChatSummary` 不再攜帶 `model` 或 `agent`。
- `ahp-ws` 現在預設為 rustls（`rustls-tls-native-roots`、`ring` 提供者）
  而不是 `native-tls`，在 Linux 上刪除 OpenSSL 連結，同時仍然
  針對作業系統信任儲存進行驗證。要維持以前的行為，取決於
  在 `ahp-ws` 上與 `default-features = false, features = ["native-tls"]` 一起。
- `ConfigPropertySchema.enum` 欄位現在是 `Option<Vec<AnyValue>>` 而不是
  `Option<Vec<String>>`，允許數字、布林值和空列舉值。
- `ModelSelection.config` 值現在是 `AnyValue` 而非 `String`，允許數字、布林值和空配置值。
- `SessionState.active_clients`（`Vec<SessionActiveClient>`，必需）替換
  單一可選的 `SessionState.active_client`；工作階段 reducer 更新插入
  並刪除由 `client_id` 鍵控的條目。
- `StateAction::SessionActiveClientChanged` 重新命名為
  `StateAction::SessionActiveClientSet` 具有 upsert-by-`client_id` 語意學；它
  不再取消設定活動的用戶端（調度 `SessionActiveClientRemoved`
  相反）。

### 已刪除

- `StateAction::SessionModelChanged` (`SessionModelChangedAction`) 和
  `StateAction::SessionAgentChanged` (`SessionAgentChangedAction`)，以及
  他們的工作階段-reducer手臂。
- `SessionActiveClientToolsChangedAction`。活動的用戶端現在更新其
  透過重新散佈 `SessionActiveClientSet` 及其完整內容來發布工具，
  更新條目。

## [0.4.0] — 2026-06-19

實作 AHP 0.4.0。

### 新增

- `MessageOrigin` 結構體與 `MessageKind` 列舉現在為型別 `Message.origin`
  （以前是無類型的 `serde_json::Value`）； `MessageKind` 涵蓋 `User`，
  `Agent`、`Tool` 和 `SystemNotification`，新增忠實代理人- 和
  工具引發的起源。
- `ConfigPropertySchema.additional_properties` — 所描述的選用欄位
  超出 `properties` 中的物件類型配置屬性的架構。
- `ChangesetContentChangedAction` 用於完全替換變更集文件
  帶有可選操作和錯誤詳細資訊的快照。
- 將 `ahp_error_codes::CONFLICT` 常數 (`-32011`) 加到 `ahp-types`；涵蓋 `ResourceWriteParams.if_match` 檢查中的 ETag 衝突失敗。
- `ahp` 中的 `apply_action_to_changeset`、`apply_action_to_annotations` 和 `apply_action_to_resource_watch` reducer；所有先前跳過的 `changeset`、`annotations` 和 `resourceWatch` reducer 系列的一致性裝置現在都通過了。
- `ChangesetOperationStatus::Disabled` — 變更集操作的新變體
  目前不可用且無法呼叫。
- `ChangesetOperation.group` — 分組相關的可選標識符
  UI 中一起進行變更集操作。- 每回合聊天操作的 `_meta` (`meta`) 欄位 (`chat/turnStarted`,
  `chat/delta`，`chat/responsePart`，`chat/reasoning`，`chat/usage`，
  `chat/turnComplete`、`chat/turnCancelled`、`chat/error`) — 可選
  提供者特定的元資料，以便主機可以攜帶可移植的每個事件上下文，
  例如將事件歸因於特定代理（例如，代理行為的子代理）
  回合內）。

### 已更改

- `ToolResultSubagentContent.resource` 現在被指定為產生的工作人員
  **聊天** URI (`ahp-chat:/<cid>`)，而不是工作階段 URI — 工具產生的
  子代理是聊天。它的文件現在描述了與工作者的通信
  聊天的 `ChatOrigin::Tool` 記錄（匹配 `tool_call_id`），該記錄仍然是
  產生關係的規範表示。
- **中斷：** `SessionStatus` 現在是 `u32` 位元集新類型
  （命名標誌常數的`struct SessionStatus(pub u32)`）而非
  `#[repr(u32)]` 列舉。線形式是數位集，因此列舉不能
  表示組合標誌（例如 `InProgress | IsArchived`）或保留未知
  前向相容位。將標誌與 `|` 結合併使用 `contains(..)` 進行測試。
- **破壞：** `ChangesetOperationTarget` 的範圍目標現在帶有巢狀
  `TextRange` (`{start: {line, character}, end: {line, character}}`) 而非
  平面 `{start, end}` 整數對。

### 固定的

- `SessionStatus` 編碼/解碼保真度：現在組合和未知的位元集位
  準確往返，而不是被丟棄或拒絕。
- 現在，當不存在時，序列化輸出中會省略 `ActionEnvelope.origin`
  (`#[serde(skip_serializing_if = "Option::is_none")]`) 而非序列化
  如`null`。
- 工作階段 reducer現在應用來自每個的 `_meta` (`meta`) 更新
  工具呼叫範圍內的操作，而不僅僅是 `session/toolCallStart`。

### 新增

- `SnapshotState::ResourceWatch` 變體與匹配
  `MultiHostStateMirror::resource_watches()` 槽，因此 `apply_snapshot` 可以
  播種 `ahp-resource-watch:` 通道的描述符（根 URI、遞歸
  標誌，可選包含/排除）與現有根 / 工作階段 /
  終端機/變更集/註解槽。 `reset_host` / `reset` 清除
  新插槽。

### 新增

- 新註解通道線路類型 (`ahp-session:/<uuid>/annotations`)：
  `AnnotationsState`，`Annotation`，`AnnotationEntry`，
  `AnnotationsSummary`; 用戶端-可調度
  `annotations/set` / `annotations/removed` / `annotations/entrySet`
  / `annotations/entryRemoved` 操作變體 — 用戶端驅動每個註釋
  透過直接分派這些突變，分配 `Annotation.id` /
  `AnnotationEntry.id` 他們自己；
  `MultiHostStateMirror.annotations()`和`SnapshotState::Annotations`。
  reducer 邏輯被延遲（與變更集存根相符）。
- `MessageAnnotationsAttachment`（`annotations` `MessageAttachment` 變體）
  透過 `resource` 引用工作階段的註釋通道上的註釋
  URI，可以選擇縮小為 `annotationIds` 陣列。
- `AnnotationsUpdatedAction` (`annotations/updated`) — 部分更新
  現有註解的 `turn_id` / `resource` / `range` / `resolved` 不帶
  重新發送其條目。由註解 reducer 處理（未知時無操作
  身份證）。

- `ahp-chat:` 每個聊天對話的通道狀態； `SessionState.chats[]` 目錄； `SessionState.defaultChat?` 輸入路由提示； `ChatOrigin` 出處聯集； `createChat` / `disposeChat` 指令。
- `ChatSummary.working_directory` — 可選的每個聊天工作目錄。當不存在時，回退到工作階段的 `working_directory`。
- `ChatInteractivity` 列舉 (`Full` / `ReadOnly` / `Hidden`) 和可選的 `ChatSummary.interactivity` / `ChatState.interactivity` 欄位描述使用者如何與聊天互動。缺席預設為 `Full`。
- 工作階段通道上的三個離散聊天目錄操作 — `SessionChatAdded`（由 `summary.resource` 更新插入）、`SessionChatRemoved` 和 `SessionChatUpdated`（部分更新負載）。
- `SessionDefaultChatChanged` (`session/defaultChatChanged`) — 更新 `SessionState.default_chat` 引導新輸入到指定聊天；缺少值會清除提示。
- `ErrorInfo.meta: Option<JsonObject>` — 錯誤負載上可選的特定於提供者的元資料包（序列化為 `_meta`），鏡像 `UsageInfo` 和其他協定類型上的現有 `meta` 欄位。
- `RootState` 現在公開可選的 `_meta` 屬性包（`meta: Option<JsonObject>`) 用於實作定義的代理主機元資料，例如
  眾所周知的 `hostBuild` 金鑰，包含主機的建置版本/提交/日期。

### 已更改

- `ChatState` 現在是扁平的 — 之前嵌入的 `summary` 已替換為內聯 `resource` / `title` / `status` / `activity` / `modified_at` / `model` / `agent` / `origin` / `ToolCallAuthRequiredState` 欄位。 `ChatSummary` 仍作為 `SessionState.chats` 上的獨立目錄條目。
- `ChatSummary.modified_at` 和 `ChatState.modified_at` 現在是 ISO 8601 `String` 值，而不是 `u64` 毫秒。

### 已刪除

- `StateAction` 上的 `SessionChatsChanged` 變體（被上面的三個離散聊天目錄變體取代）。

## [0.3.0] — 2026-06-05

實作 AHP 0.3.0。

### 新增

- `McpServerCustomization` 現在公開完整的 MCP 生命週期：`enabled`，
  判別 `McpServerState` 列舉
  (`Starting`/`Ready`/`AuthRequired`/`Error`/`Stopped`)，可選
  `channel` `mcp://` 側通道的 URI，以及可選的 `mcp_app`
  阻止為 MCP 應用程式攜帶 `AhpMcpUiHostCapabilities`。
- `McpServerAuthRequiredState` 變體攜帶 `ProtectedResourceMetadata`
  加上 `reason` / `required_scopes` / `description` 現有
  `authenticate` 指令可以驅動 per-伺服器驗證。
- `Customization::McpServer` 頂級變體 - 主機現在可能會出現
  直接裸露 MCP 伺服器而不是僅在插件內或
  目錄。
- `SessionMcpServerStateChanged` 動作和匹配的 reducer 手臂 —
  在現有的 MCP 上縮小 `state` + `channel` 的更新插入
  伺服器按 ID 自訂。
- `InitializeParams.capabilities` 上的 `ClientCapabilities` 結構
  第一個條目`mcp_apps`。
- `Changeset` 上的 `changeKind` 欄位（眾所周知的值：`'session'`，
  `'branch'`、`'uncommitted'`、`'turn'`、`'compare-turns'`）。
- `ChangesetOperation` 上的 `status` 和 `error` 欄位以及
  `changeset/operationStatusChanged` 操作，追蹤
  `idle → running → error` 變更集操作的生命週期。- `AgentCustomization._meta` 提供者元資料欄位。
- `SessionSummary` 上的可選 `changes` 欄位（`ChangesSummary` 以及可選的 `additions`、`deletions` 和 `files` 計數）總結了工作階段的檔案變更足跡。

### 已更改

- `fetchTurns` 和 `completions` 現在以 `ahp-chat:` 通道為目標； `PROTOCOL_VERSION` 撞到了 `0.4.0`。
-Reducer 分為每個聊天處理器和工作階段聚合處理器，以符合多聊天協定形狀。 `SessionInput*` 類型已重新命名為 `ChatInput*`（它們現在位於聊天通道中）。
- 將 `ChangesetSummary` 型別重新命名為 `Changeset`。線上形狀沒有改變。
- 將 `changesets` 目錄從 `SessionSummary` 移至 `SessionState`。 `session/changesetsChanged` 操作現在直接更新 `state.changesets` 而不是 `state.summary.changesets`。

### 已刪除

- `SessionState.turns`、`SessionState.activeTurn`、`SessionState.steeringMessage`、`SessionState.queuedMessages`、`SessionState.inputRequests`（移至 `ChatState`）。
- 從 `ChangesetSummary` 中刪除了 `additions`、`deletions` 和 `files` 欄位。總計計數現在位於 `SessionSummary.changes` 上；每個變更集視圖從 `ChangesetState.files` 取得自己的總數。

### 已更改

- `ToolCallBase.tool_client_id: Option<String>` 替換為
  `ToolCallBase.contributor: Option<ToolCallContributor>`（列舉與
  `Client { client_id }` 和 `Mcp { customization_id }` 變體）。
  `SessionToolCallStartAction` 攜帶新的 `contributor` 欄位為
  好吧。重新命名後會出現 reducer。

## [0.2.0] — 2026-05-28

實作 AHP `0.2.0`。碰撞 `ahp-types`、`ahp` 和 `ahp-ws` 箱
從 `0.1.0` 一起將工作區與目前的規格對齊。

- 擴展 `resource*` 系列的線路類型：`resourceResolve`，
  `resourceMkdir`、`createResourceWatch` 和新的 `ahp-resource-watch:/`
  具有 `resourceWatch/changed` 操作的通道。 `ResourceWriteParams`
  增益 `mode` / `position` / `ifMatch`。新的 `Conflict` (`-32011`) 錯誤
  代碼。整個內容承載 `resource*` 系列現在是雙向的
  （它出現在 `CommandMap` 和 `ServerCommandMap` 中）。
- `UserMessage.meta` 可選的 `JsonObject` 欄位（序列化為 `_meta`），
  在使用者訊息上公開新的規格級提供者元資料通道。

## [0.1.0] — 2026-01-01

實作 AHP `0.1.0`。

Rust 用戶端的第一個發佈版本。包括：

- `ahp-types` — 從 `types/*.ts` 產生的線路類型。
- `ahp` — 非同步用戶端，純 reducer，可插入 `Transport` 特徵，
  `ahp::hosts` 多主機註冊表。
- `ahp-ws` — `tokio-tungstenite` 上的 WebSocket 傳送適配器。