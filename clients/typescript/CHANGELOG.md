# 變更日誌 — `@microsoft/agent-host-protocol` (TypeScript)

對 TypeScript 用戶端包的所有顯著變更都記錄在此處。參見
[`../../CHANGELOG.md`](../../CHANGELOG.md) 協定規格變更日誌
和 [`release-metadata.json`](release-metadata.json) 用於機器可讀
目前原始碼樹和協定版本之間的對應。

格式基於[保留變更日誌](https://keepachangelog.com/en/1.1.0/)
包遵循 [SemVer](https://semver.org)。

`clients/typescript/pipeline.yml` ADO 發布管道拒絕發布 `typescript/vX.Y.Z`
此文件中缺少匹配的 `## [X.Y.Z]` 標題的標記。的
工作流程驗證標籤，運行 `npm run verify:release-metadata` 並
`npm run verify:changelog`，然後才會觸發 Azure DevOps
`pipeline.yml` 處的管道（透過 Pipelines REST API
`publishPackage: true`）來執行實際簽章的 npm 發布。

ADO 管道也可以從 ADO UI 手動觸發
修補逃生艙口。

## [未發布]

## [0.6.0] — 2026-07-20

實作 AHP 0.6.0。

### 新增

- `Changeset.capabilities` 具有 `review` 存在標誌 (`ChangesetCapabilities`)，以便變更集可以在工作階段的變更集清單中預先宣傳對每個檔案審核工作流程的支援。（#328）
- `SystemNotificationResponsePart` 上的可選 `_meta` 插槽，遵循 MCP `_meta` 約定。主機可以附加觸發通知的機器可讀描述符，以便用戶端可以對其進行分類、圖示、分組、過濾或本地化，而無需解析 `content`。 (#308)
- `chat/turnStarted` 帶有 `startedAt` 時間戳，`chat/turnComplete`/`chat/turnCancelled`/`chat/error` 帶有經過的 `duration`（毫秒，生產者自己的時鐘），並且完成的回合公開其開始時間和持續時間。
- 非同步工具呼叫風險評估，具有模型提供的解釋和標準化安全評分。
- `ToolCallStatus.AuthRequired` 工具呼叫狀態和 `chat/toolCallAuthRequired` / `chat/toolCallAuthResolved` 操作，以便正在執行的 MCP 貢獻的工具呼叫可以暫停 OAuth 質詢 (`McpAuthRequirement`) 的執行過程，並在用戶端進行驗證後恢復；透過新的 `toolAuthentication` `SessionInputRequest` 變體出現在工作階段級別，`AuthenticateParams` 獲得了可選的 `scopes` 欄位，現在除了 `AgentInfo.protectedResources` 之外還接受從實時 `McpServerAuthRequiredState` 或 `ToolCallAuthRequiredState` 發現的資源。現在，當工具呼叫為 `auth-required` 時，`chat/toolCallComplete` 也接受失敗的結果，從而讓用戶端在不完成驗證質詢的情況下取消該呼叫。
- 用於預先註冊公共和機密 OAuth 用戶端的 `McpAuthRequirement.oauthClient` 元資料。

### 已更改

- 將變更集審核操作 `changeset/filesReviewedChanged` 重新命名為 `changeset/filesReviewChanged`（欄位 `fileIds` → `files`）並使其可用戶端分派，以便審核者可以直接透過預寫 reducer 切換檔案的 `reviewed` 標誌。（#328）
- 輸入請求現在依序存在 `responseParts`，並帶有可選的 `response`，直到 `chat/inputCompleted` 提交結果。（#327）

## [0.5.2] — 2026-07-09

實作 AHP 0.5.2。

### 新增

- 在 `AhpClient` 上鍵入 `resource*` 便捷方法：發送包裝器（`resourceRead`、`resourceWrite`、`resourceList`、`resourceCopy`、`resourceDelete`、`resourceMove`、`resourceResolve`、`resourceMkdir`、`resourceRequest`、`createResourceWatch`)並透過 `resourceResolve`、`resourceMkdir`、`resourceRequest`、`createResourceWatch`)並透過 `createResourceWatch`2631}（161}263}261}(61}))（16261}）。 `createResourceRequestHandler` 幫助程式）。
- `ToolResultTerminalCompleteContent` 用於工具中的終端機樣式完成元資料
  結果。
- 子自訂類型上的可選 `enabled` 欄位
  （`AgentCustomization`、`SkillCustomization`、`PromptCustomization`、
  `RuleCustomization`，`HookCustomization`）。
- `SkillCustomization` 上的 `disableUserInvocation`，加上 `disableModelInvocation`
  和 `AgentCustomization` 上的 `disableUserInvocation`。
- `ChangesetFile` 上的可選 `reviewed` 欄位。省略它（或將其設為
  `undefined`) 表示伺服器不支援檔案“審核”
  功能。
- 伺服器的 `changeset/filesReviewedChanged` 操作以更新 `reviewed`
  一個或多個變更集檔案的標誌。
- 每個自訂型別上的可選 `_meta` 提供者元資料欄位已移動
  從 `AgentCustomization` 到共享自訂基礎，所以
  `PluginCustomization`，`ClientPluginCustomization`，`DirectoryCustomization`，
  `SkillCustomization`，`PromptCustomization`，`RuleCustomization`，
  `HookCustomization`和`McpServerCustomization`都帶有它。
- `InitializeResult` 上的可選 `serverInfo` 和 `clientInfo` 上`InitializeParams`，每 `Implementation`（`name`，可選 `version`，
  可選 `title`)，辨識雙方背後的實作與構建
  的握手。僅供參考 - 不得用於特徵檢測。
- 對於支援的主機，`InitializeResult` 上可選的 `terminalCommandPrefix`
  將帶有 `!` 前綴的使用者訊息解釋為終端機命令。
- `PluginCustomization` 上的可選 `version` 欄位（繼承自
  `ClientPluginCustomization`），攜帶來自於的插件的 semver
  開啟插件清單。僅出處/展示。
- `session/mcpServerStartRequested` 和 `session/mcpServerStopRequested`
  用戶端要求主機啟動或停止 MCP 伺服器的操作；停止
  將 `authRequired` 伺服器移到 `stopped`，因此它不再等待
  認證。
- `InputRequestResponsePart` (`kind: 'inputRequest'`) 響應部分變體。的
  reducer 現在在活動回合中記錄已解決的輸入請求
  `responseParts` on `chat/inputCompleted` - 嵌入已解析的
  `ChatInputRequest`（最後的`answers`）和`response`（`accept`，`decline`，或 `cancel`) — 因此在即時請求被刪除後結果仍然存在。
  放棄的請求仍然沒有記錄任何內容（#324）。

### 已更改

- `session/customizationToggled` reducer 現在可以切換任何頂級
  自訂（`plugin`、`directory` 或頂層 `mcpServer`）或
  透過 `id` 單一子項，設定該條目的 `enabled`。

## [0.5.1] — 2026-07-02

實作 AHP 0.5.1。

### 新增

- `ContentRef` 上的可選 `nonce` 欄位。
- `SubscribeParams.delivery.maxLatencyMs` 和 `AhpClient.subscribe` 交付
  用戶端請求最大訂閱傳送延遲的選項，
  包括 `0` 以避免有意合併。
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

### 已更改

- `fetchTurns` 現在接受來自 `ChatState.turnsNextCursor` 的 `cursor` 並傳回
  主機載入舊版後的空結果會變成聊天狀態，而不是
  傳回一個分離的 `{ turns, hasMore }` 頁面。
- 產生的用戶端現在僅通告協定 `0.5.1`，因為 `fetchTurns`
  合約與 `0.5.0` 不相容。
- `SessionState.inputNeeded` — 工作階段等級未完成輸入的聚合
  所有聊天中的請求（`SessionInputRequest` 與
  `SessionChatInputRequest`、`SessionToolConfirmationRequest` 和
  `SessionToolClientExecutionRequest`），加上 `SessionInputNeededSetAction`
  (`session/inputNeededSet`) 和 `SessionInputNeededRemovedAction`
  (`session/inputNeededRemoved`) 運算與 `ToolCallConfirmationState`
  聯盟。工作階段 reducer 維護 `SessionStatus.InputNeeded` 活動
  位元從佇列中清除，當最後一個
  條目被刪除。
- `ChatToolCallStartAction` 和每個工具呼叫上的可選 `intention` 欄位
  生命週期狀態。
- `AgentCustomization` 上的可選 `model` 和 `tools` 欄位用於自訂
  代理的固定模型和工具白名單。

### 已刪除

- `ListSessionsParams` 中的 `filter` 欄位。這是一個無類型的佔位符
  沒有定義的語意；一旦工作階段它就會以具體形狀傳回
  指定過濾/排序。

## [0.5.0] — 2026-06-26

實作 AHP 0.5.0。

### 新增

- `ChatDraftChangedAction` (`chat/draftChanged`) 和 `ChatState.draft`
  (`Message`) 用於同步聊天正在進行的輸入草稿； `chatReducer`套
  或清除`draft`而不加蓋`modifiedAt`。
- `Message.model` 和 `Message.agent` 可選欄位記錄模型/
  撰寫訊息所用的代理選擇。
- `ChatActivityChangedAction` (`chat/activityChanged`) 用來更新聊天
  目前活動描述獨立於工作階段摘要。
- `ProgressParams` (wire `root/progress`) 相關的通用進度通知
  a `progressToken`，加上 `createSession.progressToken` 以選擇加入。今天用於
  代理本機 SDK 的惰性首次使用下載，因此用戶端可以顯示
  指示器而不是無聲的多秒掛起。
- `SessionModelInfo.maxOutputTokens` 和 `SessionModelInfo.maxPromptTokens`
  用於傳達模型令牌限制的可選欄位。
- `SessionSummary._meta` 可選的輕量級提供者元資料欄位
  工作階段-列出示範提示。
- 導出了 `JsonPrimitive` 型別別名 (`string | number | boolean | null`)。
- `SessionActiveClientRemovedAction` (`session/activeClientRemoved`) 釋
  `clientId` 的單一活動用戶端。

### 已更改

- `SessionState` 不再嵌入 `summary` 子物件；它的元資料欄位
  (`provider`、`title`、`status`、`activity`、`project`、`workingDirectory`、
  `annotations`) 直接內嵌在 `SessionState` 上，不再帶有
  `model`、`agent`、`createdAt` 或 `modifiedAt`。 `sessionReducer` 讀取並
  寫入這些平面欄位並且不再標記工作階段 `modifiedAt`。
- `SessionSummary` 現在是僅根目錄型別（透過共享引入
  `SessionMetadata` 鹼基）；它的 `createdAt` / `modifiedAt` 是 ISO-8601 字串
  （以前是數字）並且不再帶有 `model` / `agent`。
- `ChatState` 和 `ChatSummary` 不再攜帶 `model` / `agent`。
- `ConfigPropertySchema.enum` 欄位現在是 `JsonPrimitive[]` 而不是
  `string[]`，允許數字、布林值和空列舉值。
- `ModelSelection.config` 值現在是 `JsonPrimitive` 而非 `string`，
  允許數字、布林值和空配置值。
- `SessionState.activeClients`（必需的陣列）取代單一可選的
  `SessionState.activeClient`; `sessionReducer` 更新插入並刪除條目
  由 `clientId` 鍵控。- `SessionActiveClientChangedAction` 重新命名為 `SessionActiveClientSetAction`
  (`session/activeClientSet`) 具有 upsert-by-`clientId` 語意學；它不再
  接受 `null` 來取消設定（改為調度 `session/activeClientRemoved`）。

### 已刪除

- `SessionModelChangedAction` (`session/modelChanged`) 和
  `SessionAgentChangedAction`（`session/agentChanged`）。不再有一個
  工作階段層級模型/代理人選擇 — 選擇存在於每個 `Message` 上（且
  聊天的`draft`）。 `model` / `agent` 參數也已從
  `createSession` 和 `createChat` 指令；將它們傳遞給（初始）訊息
  相反。
- `SessionActiveClientToolsChangedAction`。活動的用戶端現在更新其
  透過重新調度 `SessionActiveClientSetAction` 及其
  完整的、更新的條目。

### 固定的

- 託管的工作階段摘要快取現在應用來自的 `_meta` 更新
  `root/sessionSummaryChanged` 通知。
- 更正了 `annotations/set` 的 `ACTION_INTRODUCED_IN` 條目，
  `annotations/removed`、`annotations/entrySet` 和 `annotations/entryRemoved`
  從 `0.3.0` 到 `0.4.0`，因此 `isActionKnownToVersion` 不再報告
  註釋通道可供同儕協商 `0.3.0` （它首先
  在 `0.4.0` 中出貨）。

## [0.4.0] — 2026-06-19

實作 AHP 0.4.0。

### 新增

- `MessageOrigin` 介面現在類型 `Message.origin`，並且 `MessageKind` 增益
  由代理人或工具發起的回合的 `Agent` 和 `Tool` 值
  比使用者更重要（例如，播種工作者聊天的第一條訊息的工具）
  產生）。
- `ConfigPropertySchema.additionalProperties` — 可選 JSON 模式欄位
  (`ConfigPropertySchema`) 描述物件類型配置的架構
  超出 `properties` 中所列的屬性。
- `ChangesetContentChangedAction` 用於完全替換變更集文件
  帶有可選操作和錯誤詳細資訊的快照。
- `ChangesetOperationStatus.Disabled` — 變更集的新列舉值
  目前不可用且無法呼叫的操作。
- `ChangesetOperation.group` — 分組相關的可選標識符
  UI 中一起進行變更集操作。
- 每回合聊天操作的 `_meta` 欄位（`chat/turnStarted`、`chat/delta`、
  `chat/responsePart`、`chat/reasoning`、`chat/usage`、`chat/turnComplete`、
  `chat/turnCancelled`, `chat/error`) — 可選的特定於提供者的元資料，因此
  主機可以攜帶可移植的每個事件上下文，例如將事件歸因於特定代理（例如，在回合內執行操作的子代理）。

### 已更改

- `ToolResultSubagentContent.resource` 現在被指定為產生的工作人員
  **聊天** URI (`ahp-chat:/<cid>`)，而不是工作階段 URI — 工具產生的
  子代理是聊天。它的文件現在描述了與工作者的通信
  聊天的 `ChatOrigin` 記錄（`kind: 'tool'`，匹配 `toolCallId`），其中
  仍然是生成關係的規範表示。

### 新增

- `Snapshot.state` 現在接受 `ResourceWatchState`，因此現有的
  `initialize` / `reconnect` / `subscribe` 快照路徑可以攜帶
  `ahp-resource-watch:` 通道的描述子與現有根 /
  工作階段 / 終端機 /變更集/註解變體。

### 新增

- 所有人使用的共享往返測試語料庫 (`test/round-trips/*.json`)
  語言用戶端斷言編碼/解碼保真度； TypeScript 測試工具
  加載並驗證每個夾具。

### 固定的

- `sessionReducer` 現在套用來自每個工具呼叫範圍的 `_meta` 更新
  行動，不只是`session/toolCallStart`。

### 新增

- 新註解通道（`ahp-session:/<uuid>/annotations`）：`AnnotationsState`，
  `Annotation`，`AnnotationEntry`，`AnnotationsSummary`，
  `annotationsReducer` 和用戶端可調度的 `annotations/set`，
  `annotations/removed`、`annotations/entrySet` 和 `annotations/entryRemoved`
  actions — 用戶端透過調度這些來驅動每個註釋突變
  直接分配 `Annotation.id` / `AnnotationEntry.id` 本身。
  `SessionSummary.annotations` 呈現 per-工作階段 `AnnotationsSummary`
  用於徽章 UI。
- `MessageAnnotationsAttachment`（`annotations` `MessageAttachment` 變體）
  透過 `resource` 引用工作階段註釋通道上的註釋
  URI，可以選擇縮小為 `annotationIds` 陣列。
- `AnnotationsUpdatedAction` (`annotations/updated`) — 部分更新
  現有註釋的 `turnId` / `resource` / `range` / `resolved` 不帶
  重新發送其條目。由 `annotationsReducer` 處理（對未知 id 無操作）。

- `ahp-chat:` 每個聊天對話的通道狀態； `SessionState.chats[]` 目錄； `SessionState.defaultChat?` 輸入路由提示； `ChatOrigin` 出處聯集； `createChat` / `disposeChat` 指令。
- `ChatSummary.workingDirectory?` — 可選的每個聊天工作目錄。當不存在時，回退到工作階段的 `workingDirectory`。
- `ChatInteractivity` 列舉 (`"full"` / `"read-only"` / `"hidden"`) 和可選的 `ChatSummary.interactivity` / `ChatState.interactivity` 欄位描述使用者如何與聊天互動。缺席預設為 `Full`。
- 工作階段通道上的三個離散聊天目錄操作 — `SessionChatAddedAction`（由 `summary.resource` 更新插入）、`SessionChatRemovedAction` 和 `SessionChatUpdatedAction`（使用 `Partial<ChatSummary>` 進行部分更新）。
- `SessionDefaultChatChangedAction` (`session/defaultChatChanged`) — 更新 `SessionState.defaultChat` 以將新輸入引導至指定聊天；缺少值會清除提示。
- `ErrorInfo._meta?: Record<string, unknown>` — 錯誤負載上可選的特定於提供者的元資料包，鏡像 `UsageInfo` 和其他協定類型上的現有 `_meta` 約定。用戶端可以在此處檢查眾所周知的鍵，以獲得更豐富的本地化錯誤 UI。- `RootState` 現在公開可選的 `_meta` 屬性包（`_meta？：
  Record<string, unknown>`) 用於實作定義的代理主機元資料，例如
  作為攜帶主機的建置版本/提交/日期的眾所周知的 `hostBuild` 鍵。

### 已更改

- `ChatState` 現在是扁平的 — 之前的巢狀 `summary: ChatSummary` 已替換為內聯 `resource` / `title` / `status` / `activity` / `modifiedAt` / `model` / `agent` / {c3623/位。 `ChatSummary` 仍作為 `SessionState.chats` 上的獨立目錄條目。
- `ChatSummary.modifiedAt` 和 `ChatState.modifiedAt` 現在是 ISO 8601 `string` 值，而不是數字毫秒。

### 已刪除

- `SessionChatsChangedAction`（由上面的三個離散聊天目錄操作取代）。

## [0.3.0] — 2026-06-05

實作 AHP 0.3.0。

### 新增

- `McpServerCustomization` 現在公開完整的 MCP 生命週期：`enabled`，
  判別`McpServerState`聯集
  (`starting`/`ready`/`authRequired`/`error`/`stopped`)，可選
  `channel` `mcp://` 側通道的 URI，以及可選的 `mcpApp`
  阻止為 MCP 應用程式攜帶 `AhpMcpUiHostCapabilities`。
- `McpServerAuthRequiredState` 變體攜帶 `ProtectedResourceMetadata`
  加上 `reason` / `requiredScopes` / `description` 現有
  `authenticate` 指令可以驅動 per-伺服器驗證。
- `Customization` 頂級聯集現在包括 `McpServerCustomization`
  — 主機可以直接暴露 MCP 伺服器而不僅僅是內部
  插件或目錄。
- `session/mcpServerStateChanged` 運算與符合的 reducer 案例 —
  在現有的 MCP 上縮小 `state` + `channel` 的更新插入
  伺服器按 ID 自訂。
- `ClientCapabilities` 型別在 `InitializeParams.capabilities` 上
  第一個條目`mcpApps`。
- `Changeset` 上的 `changeKind` 欄位（眾所周知的值：`'session'`，
  `'branch'`、`'uncommitted'`、`'turn'`、`'compare-turns'`）。
- `ChangesetOperation` 上的 `status` 和 `error` 欄位以及
  `changeset/operationStatusChanged` 操作，追蹤
  `idle → running → error` 變更集操作的生命週期。- `AgentCustomization._meta` 提供者元資料欄位。
- `SessionSummary` 上的可選 `changes` 欄位（`ChangesSummary` 以及可選的 `additions`、`deletions` 和 `files` 計數）總結了工作階段的檔案變更足跡。

### 已更改

- `fetchTurns` 和 `completions` 現在以 `ahp-chat:` 通道為目標； `PROTOCOL_VERSION` 撞到了 `0.4.0`。
- 將 `ChangesetSummary` 型別重新命名為 `Changeset`。線上形狀沒有改變。
- 將 `changesets` 目錄從 `SessionSummary` 移至 `SessionState`。 `session/changesetsChanged` 操作現在直接更新 `state.changesets` 而不是 `state.summary.changesets`。

### 已刪除

- `SessionState.turns`、`SessionState.activeTurn`、`SessionState.steeringMessage`、`SessionState.queuedMessages`、`SessionState.inputRequests`（移至 `ChatState`）。
- 從 `ChangesetSummary` 中刪除了 `additions`、`deletions` 和 `files` 欄位。總計計數現在位於 `SessionSummary.changes` 上；每個變更集視圖從 `ChangesetState.files` 中取得自己的總數。

### 已更改

- `ToolCallBase.toolClientId?: string` 替換為
  `ToolCallBase.contributor?: ToolCallContributor`（判別聯集
  與 `{ kind: 'client'; clientId }` 和 `{ kind: 'mcp'; customizationId }`
  變體）。 `session/toolCallStart` 攜帶新的 `contributor`
  場也是如此。
## [0.2.0] — 2026-05-28

實作 AHP `0.2.0`。

`@microsoft/agent-host-protocol` 的初始 npm 發布。包括：

- 預設條目 - 線路類型、操作、命令、reducer、版本
  常數（`PROTOCOL_VERSION`、`SUPPORTED_PROTOCOL_VERSIONS`）。零輸入/輸出。
  包括擴充的 `resource*` 系列（`resourceResolve`、
  `resourceMkdir`、`createResourceWatch`、新的 `ahp-resource-watch:/`
  具有 `resourceWatch/changed` 操作的通道）、`ResourceWriteParams` 的
  `mode` / `position` / `ifMatch` 欄位，新的 `Conflict` (`-32011`)
  錯誤代碼和雙向內容承載 `resource*` 表面
  在 `CommandMap` 和 `ServerCommandMap` 上都公開。
- `UserMessage._meta` 可選的 `Record<string, unknown>` 欄位，公開
  使用者訊息上的新規格級提供者元資料通道。
- `/client` 子路徑 — `AhpClient`、`Subscription`、`AhpStateMirror`、
  `AhpTransport` 接口，`InMemoryTransport`，錯誤分類。
- `/ws` 子路徑 — `WebSocketTransport` 建構在全域 `WebSocket` 之上。