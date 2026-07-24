# 變更日誌 — 代理主機協定 (規格)

對 **協定規格** 的所有顯著變更均記錄在此。的
規格的版本獨立於每種語言的用戶端庫；看到
用戶端發布歷史記錄的每個 `clients/<lang>/CHANGELOG.md`。

格式基於[保留變更日誌](https://keepachangelog.com/en/1.1.0/)
規格位於 [SemVer](https://semver.org) 之後。直到達到`1.0.0`，
重大變更可能會出現 `MINOR` 的障礙（請參閱
[`docs/specification/versioning.md`](docs/specification/versioning.md))。

每個發布的條目都包含一個與
[`types/version/registry.ts`](types/version/registry.ts) 中的 `PROTOCOL_VERSION` 常數
發佈時。 `publish-spec.yml` 工作流程拒絕發布
此標記中缺少匹配的 `## [X.Y.Z]` 標題的 `spec/vX.Y.Z` 標記
文件。

## [未發布]

一旦破壞或值得注意的新增劑，下一個規格版本將從 `main` 中刪除
變化不斷累積。透過 PR 觸摸追蹤飛行中的協定更改
[`types/`](types/) 和每個符號 `ACTION_INTRODUCED_IN` /
`NOTIFICATION_INTRODUCED_IN` 映射於
[`types/version/registry.ts`](types/version/registry.ts)。

## [0.7.0] — 未發布

規格版本：`0.7.0`

## [0.6.0] — 2026-07-20

規格版本：`0.6.0`

### 新增

- `Changeset.capabilities` 具有 `review` 存在標誌 (`ChangesetCapabilities`)，以便變更集可以在工作階段的變更集清單中預先宣傳對每個檔案審核工作流程的支援。（#328）
- `SystemNotificationResponsePart` 上的可選 `_meta` 插槽，遵循 MCP `_meta` 約定。主機可以附加觸發通知的機器可讀描述符，以便用戶端可以對其進行分類、圖示、分組、過濾或本地化，而無需解析 `content`。 (#308)
- `chat/turnStarted` 攜帶 `startedAt` 時間戳，`chat/turnComplete`/`chat/turnCancelled`/`chat/error` 攜帶經過的 `duration`（毫秒，生產者自己的時鐘），完成的回合公開其開始時間和持續時間。
- 非同步工具呼叫風險評估，具有模型提供的解釋和標準化安全評分。
- `ToolCallStatus.AuthRequired` 工具呼叫狀態和 `chat/toolCallAuthRequired` / `chat/toolCallAuthResolved` 操作，以便正在執行的 MCP 貢獻的工具呼叫可以暫停 OAuth 質詢 (`McpAuthRequirement`) 的執行過程，並在用戶端進行驗證後恢復；透過新的 `toolAuthentication` `SessionInputRequest` 變體出現在工作階段級別，`AuthenticateParams` 獲得了可選的 `scopes` 欄位，現在除了 `AgentInfo.protectedResources` 之外還接受從實時 `McpServerAuthRequiredState` 或 `ToolCallAuthRequiredState` 發現的資源。現在，當工具呼叫為 `auth-required` 時，`chat/toolCallComplete` 也接受失敗的結果，讓用戶端在不完成驗證質詢的情況下取消該呼叫。
- 預先註冊的公共和機密 OAuth 用戶端的 `McpAuthRequirement.oauthClient` 元資料。

### 已更改

- 將變更集審核操作 `changeset/filesReviewedChanged` 重新命名為 `changeset/filesReviewChanged`（欄位 `fileIds` → `files`）並使其可用戶端分派，以便審核者可以直接透過預寫 reducer 切換檔案的 `reviewed` 標誌。（#328）
- 輸入請求現在依序存在 `responseParts`，並帶有可選的 `response`，直到 `chat/inputCompleted` 提交結果。（#327）

## [0.5.2] — 2026-07-09

規格版本：`0.5.2`

### 新增

- `ToolResultTerminalCompleteContent` 用於工具中的終端機樣式完成元資料
  結果。
- 子自訂項目上的可選 `enabled` 標誌（`AgentCustomization`、
  `SkillCustomization`、`PromptCustomization`、`RuleCustomization`、
  `HookCustomization`），因此可以獨立關閉單一子項
  它的容器；缺席意味著啟用。
- `disableUserInvocation` 在 `SkillCustomization` 上，加上 `disableModelInvocation`
  和 `AgentCustomization` 上的 `disableUserInvocation`，提供自訂代理程式和
  技能對稱的使用者/模型呼叫矩陣。
- `ChangesetFile` 上的可選 `reviewed` 欄位。省略它（或將其設為
  `undefined`) 表示伺服器不支援檔案“審核”
  功能。
- 伺服器的 `changeset/filesReviewedChanged` 操作以更新 `reviewed`
  一個或多個變更集檔案的標誌。
- 從 `AgentCustomization` 提升了可選的 `_meta` 提供者元資料槽
  直到共享 `CustomizationBase`，因此每個自訂型別
  （`PluginCustomization`、`ClientPluginCustomization`、`DirectoryCustomization`、
  `SkillCustomization`，`PromptCustomization`，`RuleCustomization`，
  `HookCustomization` 和 `McpServerCustomization`) 現在有相同的
  提供者特定的逃生艙口。線路相容：`AgentCustomization` 仍然現在透過繼承公開 `_meta`。
- `InitializeResult` 上的可選 `serverInfo` 和 `clientInfo` 上
  `InitializeParams`，每 `Implementation`（`name`，可選 `version`，
  可選的`title`），因此握手的任何一方都可以識別其
  實作和建設。僅供參考 — 鏡像 LSP/MCP 且不得
  用於特徵檢測。
- `InputRequestResponsePart` (`kind: 'inputRequest'`) — 一個新的 `ResponsePart`
  在回合的記錄中記錄已解決的輸入請求的變體。開
  `chat/inputCompleted`，reducer 現在附加這部分（嵌入
  解析了 `ChatInputRequest` 及其最終的 `answers` 和 `response`：
  `accept`、`decline` 或 `cancel`) 到活動回合的 `responseParts`，因此
  啟發的結果持久存在，反映了解決的工具呼叫如何
  確認被保留。請求在回合結束、取消、錯誤或
  截斷仍然沒有記錄任何內容（#324）。
- `InitializeResult` 上的可選 `terminalCommandPrefix` 標記适用于以下主機：支援將帶有 `!` 前綴的使用者訊息解釋為終端機命令。
- `PluginCustomization` 上的可選 `version` 欄位（繼承自
  `ClientPluginCustomization`)，攜帶來自於的插件的 semver
  開啟外掛程式清單的可選 `version`。僅出處/展示；缺席
  當清單聲明沒有版本或來源沒有版本概念。
- `session/mcpServerStartRequested` 和 `session/mcpServerStopRequested`
  用戶端要求主機啟動或停止 MCP 伺服器的操作；停止
  將 `authRequired` 伺服器移到 `stopped`，使其不再等待
  認證。

### 已更改

- `session/customizationToggled` 現在針對任何頂級定制
  （`plugin`、`directory` 或頂層 `mcpServer`）或單一子項
  `id` 並設定該條目的 `enabled`；子節點的有效狀態是
  `container.enabled && (child.enabled ?? true)`。

### 固定的

- 產生的 JSON 架構工件 (`schema/*.json`) 現在是獨立的
  並且嚴格-`oneOf`-安全。生成器不再發出空的 `{}` 分支
  聯集型別別名的 `oneOf` （匹配任何值並擊敗嚴格
  `oneOf` 驗證），回填 `enum`、列舉成員和型別-別名 `$ref`
  之前在所有五個架構文件中懸而未決，並呈現 `null`
  成員為 `{ "type": "null" }` (#302)。

## [0.5.1] — 2026-07-02

規格版本：`0.5.1`

### 新增

- `SubscribeParams.delivery.maxLatencyMs` 為用戶端請求最大值
  訂閱傳送延遲，包括無故意合併的 `0`。
- `SessionState.inputNeeded` — 工作階段等級未完成輸入的聚合
  所有聊天中的請求，因此用戶端可以發現並回答誘導，
  工具確認，以及來自工作階段的用戶端-工具執行請求
  通道，無需訂閱個人聊天。每個條目
  （`SessionChatInputRequest`、`SessionToolConfirmationRequest`、
  `SessionToolClientExecutionRequest`，聯集為 `SessionInputRequest`) 攜帶
  擁有的聊天 URI 加上回應所需的識別碼。
- 主機的 `session/inputNeededSet` 和 `session/inputNeededRemoved` 操作
  更新插入和刪除 `SessionState.inputNeeded` 條目。工作階段 reducer
  當佇列非空時設定 `SessionStatus.InputNeeded` 並清除它
  （回落到 `InProgress`）一旦清空，保留正交標誌。
- `ToolCallConfirmationState` 聯集（`ToolCallPendingConfirmationState |
  ToolCallPendingResultConfirmationState`) 用於進行的工具呼叫
  `SessionToolConfirmationRequest`。- `ContentRef` 上的可選 `nonce` 欄位。
- `chat/toolCallStart` 和每個 `ToolCallState` 上的可選 `intention` 欄位
  變體，提供呼叫意圖的人類可讀的描述
  Go做。
- `AgentCustomization` 上的可選 `model` 和 `tools` 欄位，提供自訂
  代理的固定模型和工具將一流住宅列入白名單，而不是 `_meta`。
- `AgentInfo` 上的可選 `capabilities` 欄位（`AgentCapabilities` 帶有
  巢狀的 `multipleChats` 功能攜帶 `fork`)，因此用戶端門多聊天
  並透過廣告功能而不是提供者 ID 交換器進行分叉。
- 透過新的共享 `PaginatedParams` 對 `listSessions` 進行基於遊標的分頁
  (`limit` + `cursor`) 和 `PaginatedResult` (`nextCursor`) 型：
  `ListSessionsParams` 現在擴充了 `PaginatedParams` 和 `ListSessionsResult`
  擴充 `PaginatedResult`，讓用戶端取得大型工作階段目錄
  逐漸地。完全可加性－省略欄位保留了今天的
  行為。
- `SubscribeParams.view.turns`、`ChatState.turnsNextCursor` 和
  `chat/turnsLoaded` 操作，以便用戶端可以訂閱有限的聊天尾部歷史記錄和較舊的頁面會根據需要變成減少的聊天狀態。

### 已更改

- `fetchTurns` 現在接受來自 `ChatState.turnsNextCursor` 的 `cursor` 並傳回
  主機載入舊版後的空結果會變成聊天狀態，而不是
  傳回一個分離的 `{ turns, hasMore }` 頁面。
- 產生的用戶端現在僅通告協定 `0.5.1`，因為 `fetchTurns`
  合約與 `0.5.0` 不相容。

### 已刪除

- 來自 `ListSessionsParams` 的 `filter` 欄位。這是一個無類型的 `object`
  沒有定義語義的佔位符；它將用混凝土重新引入
  一旦指定了工作階段過濾/排序，就會形成形狀。

## [0.5.0] — 2026-06-26

規格版本：`0.5.0`

### 新增

- `chat/activityChanged` 用於更新聊天目前活動的操作
  描述獨立於工作階段摘要。
- `root/progress` (`ProgressParams`) 通用主機→用戶端進度通知，
  透過用戶端上的 `progressToken` 相關
  請求（今天的`createSession.progressToken`）而不是域物件。讓我們
  主持人報告長期運行的工作 - 例如懶惰的首次使用下載
  代理程式的本機 SDK — 因此用戶端可以顯示指示器而非靜默
  多秒掛起。攜帶單調的`progress`和可選的`total`；完成
  當`progress === total`時。
- `createSession.progressToken` 用於接收 `root/progress` 的可選選擇加入令牌
  有關工作階段啟動的通知。
- `SessionModelInfo.maxOutputTokens` 和 `SessionModelInfo.maxPromptTokens`
  用於傳達模型令牌限制的可選欄位。
- `SessionSummary._meta` 可選的輕量級提供者元資料欄位
  工作階段-列出示範提示。
- `types/common/state.ts` 中的 `JsonPrimitive` 型別別名 (`string | number | boolean | null`)。
- `session/activeClientRemoved` 操作，從 a 釋放單一活動的用戶端工作階段，作者：`clientId`。

### 已更改

- `ConfigPropertySchema.enum` 現在接受 `JsonPrimitive[]` 而不是 `string[]`，允許數字、布林值和空列舉值。
- `ModelSelection.config` 值現在是 `JsonPrimitive` (`string | number | boolean | null`) 而非 `string`，允許數字、布林值和空配置值。
- `SessionState.activeClients`（必需的陣列，以 `clientId` 為鍵）替換
  單一可選的 `SessionState.activeClient`。工作階段現在可能有
  多個並發活動用戶端。
- `session/activeClientChanged` 重新命名為 `session/activeClientSet`
  upsert-by-`clientId` 語意。它不再接受 `null` 來取消設定
  active 用戶端 — 分派 `session/activeClientRemoved`。

### 已刪除

- `session/activeClientToolsChanged`。活動的用戶端現在更新其已發布的
  透過重新傳送 `session/activeClientSet` 及其完整的更新條目來取得工具。

### 固定的

- 更正了 `annotations/set` 的 `ACTION_INTRODUCED_IN` 條目，
  `annotations/removed`、`annotations/entrySet` 和 `annotations/entryRemoved`
  從`0.3.0`到`0.4.0`。註釋通道首先在
  `0.4.0` 規格版本（`spec/v0.3.0` 中不存在），因此版本
  協商不得將其通告給使用 `0.3.0` 的同業。

## [0.4.0] — 2026-06-19

規格版本：`0.4.0`

### 新增

- `MessageOrigin` — `Message.origin` 現在是一個名為型別（是一個內聯
  `{ kind }` 物件），其 `MessageKind` 得到 `Agent` 和 `Tool` 類型
  由代理或工具而非使用者發起的回合（例如工具
  播種它所產生的工作聊天的第一條訊息），因此主機不再
  此類訊息必須扭曲為 `User` 或 `SystemNotification`。
- `ConfigPropertySchema.additionalProperties` — 可選 JSON 模式欄位
  (`ConfigPropertySchema`) 描述物件類型配置的架構
  超出 `properties` 中所列的屬性。
- `changeset/contentChanged` — 用於傳送的完全替換變更集操作
  初始快照或的批次文件、可選操作和錯誤詳細資訊
  批量刷新。
- `ChangesetOperationStatus.Disabled` — 表示變更集運算是
  目前不可用且無法呼叫，因此用戶端可以渲染
  控制被禁用而不是隱藏它。
- `ChangesetOperation.group` — 分組相關的可選標識符
  UI 中一起進行變更集操作。- 每回合聊天操作上的 `_meta` 槽（`chat/turnStarted`、`chat/delta`、
  `chat/responsePart`、`chat/reasoning`、`chat/usage`、`chat/turnComplete`、
  `chat/turnCancelled`, `chat/error`) — 可選的特定於提供者的元資料，因此
  代理主機可以攜帶可移植的每個事件上下文，例如歸因
  事件發送給特定代理（例如，在回合內執行操作的子代理）。的
  工具呼叫操作已公開 `_meta`；這擴展了相同的約定
  到剩餘的回合範圍動作。
- 新增了在 `ahp-session:/<uuid>/annotations` 上公開的新註釋通道。
  註釋錨定到帶有可選 `range` 的 `(turnId, resource)` 對
  （省略錨定到整個文件），攜帶 `resolved` 標誌（新
  已建立的註釋開始未解析），並且始終攜帶至少一個條目。
  用戶端透過分派用戶端-可分派來驅動每個突變
  `annotations/set`、`annotations/removed`、`annotations/entrySet` 和
  直接 `annotations/entryRemoved` 狀態操作 - 分配
  `Annotation.id` / `AnnotationEntry.id` 本身 - 而非透過 RPC指令，因此註解繼承了預寫重播和衝突解決。
  `SessionSummary.annotations` 宣傳 per-工作階段 `AnnotationsSummary`
  (`{ resource, annotationCount, entryCount }`) 用於徽章 UI。
- 新增了 `annotations` `MessageAttachment` 變體
  (`MessageAnnotationsAttachment`) 引用註釋
  工作階段的註解通道（透過其 `resource` URI），可以選擇縮小到
  一個 `annotationIds` 陣列（省略引用每個註解）。
- `annotations/updated` (`AnnotationsUpdatedAction`) — 可調度的用戶端
  部分更新現有註釋自身屬性的操作
  (`turnId`、`resource`、`range`、`resolved`)，不重新傳送其條目。
  解析或重新錨定註解不再需要替換
  整個註釋透過 `annotations/set`。省略的欄位保持不變；
  註釋的 `entries`、`id` 和 `_meta` 從未被觸及。
- `ahp-chat:` 每個聊天對話的通道狀態； `SessionState.chats[]` 目錄； `SessionState.defaultChat?` 輸入路由提示； `ChatOrigin` 出處聯集； `createChat` / `disposeChat` 指令。- `ChatSummary.workingDirectory?` — 可選的每個聊天工作目錄。當缺席時，聊天會繼承工作階段的 `workingDirectory`。啟用代理群模式，其中一個工作階段中的多個聊天在獨立的工作樹上運行。
- `ChatInteractivity` 列舉 (`"full"` / `"read-only"` / `"hidden"`) 加上可選的 `ChatSummary.interactivity` / `ChatState.interactivity` 欄位，描述使用者如何與聊天交互，支援工作人員聊天只讀或隱藏的座席團隊模式。缺席預設為 `"full"`。
- 工作階段通道上的三個離散聊天目錄操作 — `session/chatAdded`（由 `summary.resource` 更新插入）、`session/chatRemoved` 和 `session/chatUpdated`（使用 `Partial<ChatSummary>` 進行部分更新）— 鏡像根通道 `root/sessionAdded` / `root/sessionRemoved` / `root/sessionSummaryChanged` 映像模式。
- `session/defaultChatChanged` 操作 — 更新 `SessionState.defaultChat` 以將新輸入引導至指定聊天；缺少值會清除提示。
- `ErrorInfo._meta?: Record<string, unknown>` — 錯誤負載上可選的特定於提供者的元資料包，鏡像 `UsageInfo` 和其他協定類型上的現有 `_meta` 約定。用戶端可以在此處檢查眾所周知的鍵，以獲得更丰富的本地化錯誤 UI。
- `RootState` 現在帶有一個可選的 `_meta` 屬性包
  關於代理主機本身的實作定義的元資料，鏡像
  MCP `_meta` 約定。眾所周知的 `hostBuild` 鍵可能帶有 build
  有關託管代理主機的程序的資訊（版本、提交、日期）。

### 已更改

- `ToolResultSubagentContent.resource` 現在被指定為生成的工作人員
  **聊天** URI (`ahp-chat:/<cid>`)，而不是工作階段 URI — 工具產生的
  子代理是聊天。它的文件現在描述了與工作者的通信
  聊天的 `ChatOrigin` 記錄（`kind: 'tool'`，匹配 `toolCallId`），其中
  仍然是生成關係的規範表示。
- `Snapshot.state` 現在接受 `ResourceWatchState`，因此 `initialize` /
  `reconnect` / `subscribe` 可以從下列位置播種 `ahp-resource-watch:` 通道
  時間點快照。現有變體（root、工作階段、終端機、
  變更集、註釋）未更改。
- `fetchTurns` 和 `completions` 現在以 `ahp-chat:` 通道為目標； `PROTOCOL_VERSION` 撞到了 `0.4.0`。
- `ChatState` 現在是**扁平** — 之前的 `summary: ChatSummary` 子物件已被內聯 `resource` / `title` / `status` / `activity` / `modifiedAt` / `model` / `agent` / `chat/turnCancelled` 替換欄位。 `ChatSummary` 仍作為 `SessionState.chats` 上的獨立目錄條目。
- `ChatSummary.modifiedAt` 和 `ChatState.modifiedAt` 現在是 ISO 8601 字串，而不是數字毫秒。- `SessionSummary` 現在記錄如何從工作階段的聊天中派生出其聚合欄位（`status`、`activity`、`modifiedAt`），包括在任何聊天提出旗幟時進行 `InputNeeded` / `Error` 促銷。

### 固定的

- 工作階段 reducer現在應用來自每個工具呼叫範圍的 `_meta` 更新
  行動，不只是`session/toolCallStart`。

### 已刪除

- `SessionState.turns`、`SessionState.activeTurn`、`SessionState.steeringMessage`、`SessionState.queuedMessages`、`SessionState.inputRequests`（移至 `ChatState`）。
- `session/chatsChanged` 完全取代操作（被 `session/chatAdded` / `session/chatRemoved` / `session/chatUpdated` 取代）。

## [0.3.0] — 2026-06-05

規格版本：`0.3.0`

### 新增

- `McpServerCustomization` 現在將 MCP 伺服器建模為一流的工作階段
  自訂：`enabled`、`state`（判別
  `McpServerState` 並集覆蓋 `starting`、`ready`、`authRequired`、
  `error`、`stopped`)，`mcp://` 的可選 `channel` URI
  進入上游伺服器的側通道，以及可選的 `mcpApp` 區塊
  攜帶 `AhpMcpUiHostCapabilities` 以便用戶端可以渲染
  [MCP 應用程式](https://github.com/modelcontextprotocol/ext-apps)。
- `McpServerAuthRequiredState` 攜帶 `ProtectedResourceMetadata` 加
  `reason` / `requiredScopes` / `description`，讓用戶端驅動
  針對 per-MCP-伺服器驗證挑戰的現有 `authenticate` 指令。
- `Customization` 現在在頂層包含 `McpServerCustomization`
  （主機可以直接顯示全域配置的 MCP 伺服器
  不僅僅是在插件或目錄中）。 MCP 伺服器仍然有效
  容器的子級。
- 新的 `session/mcpServerStateChanged` 操作 — 縮小更新插入
  現有 `McpServerCustomization` 上的 `state` + `channel`
  by id，用於高頻
  `starting`/`ready`/`authRequired` 轉換。其他自訂欄位保留在 `session/customizationUpdated` 範圍內。
- `InitializeParams.capabilities` — 可選的用戶端功能包
  握手期間宣布。第一個條目是 `mcpApps?: {}`；主機
  應僅填入 `McpServerCustomization.mcpApp` / `channel`
  用戶端聲明了它。
- 新的指南頁 `docs/guide/mcp.md`（帶有 MCP 應用程式小節）和
  新的規格頁`docs/specification/mcp-channel.md`。
- 將 `changeKind` 加到 `Changeset`（眾所周知的值：`'session'`，
  `'branch'`、`'uncommitted'`、`'turn'`、`'compare-turns'`)，因此用戶端可以
  在不解析 `uriTemplate` 的情況下將圖示分組、排序或選取。
- 將 `status` 和 `error` 加到 `ChangesetOperation` 以及一個新的
  `changeset/operationStatusChanged` 操作，以便伺服器可以反映
  操作的執行生命週期 (`idle → running → error`) 回到
  變更集狀態。

### 已更改

- 將 `ToolCallBase.toolClientId?: string` 替換為判別
  `ToolCallBase.contributor?: ToolCallContributor` 聯盟
  (`ToolCallClientContributor` / `ToolCallMcpContributor`) 如此 MCP 服務
  工具呼叫可以歸因於其原始呼叫
  `McpServerCustomization`。 `session/toolCallStart` 攜帶新的
  `contributor?` 欄位代替 `toolClientId?`。

- 在 `AgentCustomization` 中加入了可選的 `_meta` 提供者元資料。
- 將型別 `ChangesSummary` 的可選 `changes` 欄位加入到 `SessionSummary`，
  攜帶可選的 `additions`、`deletions` 和 `files` 計數，因此伺服器
  可以廣告工作階段的檔案更改足跡的概覽視圖。
- 刪除了 `additions`、`deletions` 和 `files` 欄位
  `ChangesetSummary`。總計計數現在位於 `SessionSummary.changes` 上；
  每個變更集視圖從 `ChangesetState.files` 取得自己的總數。
- 將 `changesets` 目錄從 `SessionSummary` 移至
  `SessionState`。 `session/changesetsChanged` 操作現已更新
  直接用 `state.changesets` 來代替 `state.summary.changesets`。
- 將 `ChangesetSummary` 介面重新命名為 `Changeset`。的
  在線形狀未改變。
- 將 `UserMessage` 型別重新命名為 `Message` 並一致地顯示
  跨回合狀態 (`Turn.message`, `ActiveTurn.message`, `PendingMessage.message`)
  以及攜帶它的操作（`session/turnStarted`，
  `session/pendingMessageSet`）。型別現在帶有一個 `origin` 欄位和一個
  可選的 `_meta` 物件。

## [0.2.0] — 2026-05-28

規格版本：`0.2.0`

這是透過統一的規格發布管道發布的第一個版本
（`spec/v*` git 標籤 → 帶有附加架構工件的 GitHub 版本）。變化
在此版本下登陸的協定形狀在
在 `spec/v0.1.0`（尚未標記）和 `spec/v0.2.0` 之間提交。亮點：

- 通道重組－每個指令和通知都帶有頂層
  `channel: URI`；每個通道狀態類型和操作聯集位於
  `types/channels-*/`（參見 PR #97 和 PR #152）。
- 用於遙測導出的新 `otlp/*` 通知
  （`exportLogs` / `exportTraces` / `exportMetrics`）。
- 新的`session/agentChanged`，`session/customizationRemoved`，
  `session/changesetsChanged` 和 `changeset/*` 操作系列。
- 自訂重新設計為類型化的兩級樹。
- 新的 `resourceResolve` （stat + realpath；拋出 `NotFound`
  存在檢查）和 `resourceMkdir` （`mkdir -p` 語意）請求。
- 新的 `createResourceWatch` 請求加上 `ahp-resource-watch:/<id>`
  具有 `resourceWatch/changed` 操作的通道 — 長期文件更改
  透過標準訂閱機制進行串流。
- `resourceWrite` 以 `mode` 擴充 (`truncate` | `append` | `insert`)，
  `position` 和 `ifMatch` 用於樂觀並發。新
  `Conflict` (`-32011`) 過時的 `ifMatch` 寫入的錯誤碼。
- 整個承載內容的 `resource*` 系列現已正式上線雙向 — 這些方法出現在 `ServerCommandMap` 中，並且可能是
  由任一對等方發起（與 VS Code 的現有實作相符）。
- `UserMessage._meta` 可選的 `Record<string, unknown>` 欄位
  特定於提供者的訊息元資料，鏡像 MCP `_meta` 約定
  已用於 `MessageAttachmentBase`、`ToolDefinition`、`ToolCallBase`、
  `UsageInfo`和`SessionState`。

## [0.1.0] — 預標記

規格版本：`0.1.0`

初始公共協定表面。沒有追溯標記；該條目存在
為了完整性，使 `0.2.0` diff 明確。