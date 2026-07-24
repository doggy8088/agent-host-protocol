# 工作階段通道

工作階段通道承載工作階段級狀態，並充當一個或多個聊天的協調範圍。工作階段追蹤生命週期、自訂、每個工作階段配置、變更集以及屬於工作階段的聊天目錄。每個對話狀態 — 回合、串流回應、工具呼叫、待處理訊息和輸入請求 — 存在於 [聊天通道](./chat-channel) 上。

## 網址





```
ahp-session:/<uuid>
```


該路徑是伺服器唯一識別碼（通常是 UUID），由用戶端在建立時選擇。工作階段的提供者（例如 `"copilot"`）並未在 URI 方案中編碼 — 它由 [`SessionSummary.provider`](/reference/session#sessionsummary) 承載。這種解耦允許任何代理支援相同的方案位址工作階段。

多個工作階段通道可以同時處於活動狀態。用戶端訂閱他們想要追蹤其狀態的每個人。

## 狀態

訂閱者收到一個 [`SessionState`](/reference/session#sessionstate) 快照，其中包含直接內聯的工作階段元資料（標題、狀態、提供者、活動、工作目錄等）、生命週期階段、屬於此工作階段的 [`chats`](/reference/session#sessionstate) 目錄、可選的 [{c71}(/reference/session#sessionstate 狀態、自訂、變更集、 [`inputNeeded`](#aggregated-input-requests) 聚合和每個工作階段配置。每個對話狀態（回合、串流、工具呼叫、待處理訊息、輸入請求）位於 [聊天通道](./chat-channel) 上。請參閱[狀態模型指南](/guide/state-model)以了解結構概述。

## 生命週期





```
1. Client picks a session URI (e.g. ahp-session:/<new-uuid>)
2. Client sends createSession(uri, config) command
3. Client sends subscribe(uri) — MAY be batched with the command
4. Server creates session with lifecycle: 'creating', returns the snapshot
5. Server asynchronously initialises the agent backend
6. On success: server dispatches session/ready
7. On failure: server dispatches session/creationFailed
8. Server broadcasts root/sessionAdded to clients subscribed to ahp-root://
```


### 創造

[`createSession`](/reference/session#createsession) 是 JSON-RPC 請求。用戶端選擇 URI；伺服器分配工作階段狀態並開始後端初始化。如果 URI 已被使用，則伺服器傳回 `SessionAlreadyExists` (`-32003`)。

### 活躍工作階段

一旦工作階段到達 `lifecycle: 'ready'`，用戶端就可以在其上與 [`createChat`](/reference/chat#createchat) 建立聊天。每個聊天都可以透過自己的 `ahp-chat:/<cid>` URI 獨立訂閱；請參閱[聊天通道規格](./chat-channel)，了解每個聊天的生命週期、轉向流程、工具呼叫和輸入請求處理。

在此通道上調度的工作階段範圍的操作僅限於：

- 目錄突變 — `session/chatAdded`、`session/chatRemoved`、`session/chatUpdated` 和 `session/defaultChatChanged`。
- 工作階段範圍的配置 — 主動 - 用戶端追蹤、自訂、變更集、生命週期轉換。

在此通道上分派的所有操作都在 `ActionEnvelope` 上傳輸，其 `channel` 是工作階段 URI。操作有效負載不攜帶自己的工作階段 URI - 通道來自信封。

### 聊天目錄突變

隨著聊天的進行，三個獨立的操作使 `SessionState.chats` 保持同步。工作階段與單一聊天在建立時簡單地往返 `session/chatAdded` 一次；多聊天工作階段練習所有三個：

|行動|有效負載| reducer 行為 |
|---|---|---|
| `session/chatAdded` | `summary: ChatSummary` |由 `summary.resource` 更新插入。當沒有條目具有相同的 URI 時追加；否則替換現有條目。鏡子`root/sessionAdded`。 |
| `session/chatRemoved` | `chat: URI` |刪除符合的條目。當沒有條目匹配時不執行任何操作。如果 `state.defaultChat` 引用了已刪除的 URI，則 reducer 會將其清除。鏡子`root/sessionRemoved`。 |
| `session/chatUpdated` | `chat: URI, changes: Partial<ChatSummary>` |將 `changes` 的非身分欄位合併到符合項目上。當沒有條目匹配時無操作；用戶端然後應該等待 `session/chatAdded`。身分欄位 (`resource`) 不得在 `changes` 中攜帶。鏡子`root/sessionSummaryChanged`。 |

聊天自己的 [`ChatState`](./chat-channel#state) 的生成者負責發出匹配的 `session/chatUpdated` 操作，以便目錄和每個聊天通道保持一致。

### 聊天聚合

[`SessionSummary`](/reference/session#sessionsummary) 攜帶工作階段範圍的身份（`resource`、`provider`、`createdAt`、`workingDirectory`），但其多個可變欄位是從工作階段的聊天中派生的聚合。生產者應該應用這些規則，以便僅使用工作階段摘要（例如工作階段列表）的用戶端仍然看到有意義的狀態：

|領域|推導規則|
|---|---|
| `status` |設定後，從 [`defaultChat`](#defaultchat) 取得活動位元 (`Idle` / `InProgress` / `InputNeeded` / `Error`)，否則從最近修改的聊天中取得。如果**任何**聊天需要輸入，則升級 `InputNeeded`。如果**任何**聊天出現錯誤狀態，則升級 `Error`。正交的 `IsRead` / `IsArchived` 標誌保持工作階段範圍並不變地傳遞。 |
| `activity` |鏡像提供活動位的聊天的活動字串 - 通常是預設聊天，但當非預設聊天贏得促銷時引發 `InputNeeded` / `Error` 的聊天。 |
| `modifiedAt` |每個聊天的最大值為 `modifiedAt`。 |
| `workingDirectory` | 工作階段等級**預設**。個人聊天可以透過 [`ChatSummary.workingDirectory`](/reference/chat#chatsummary) 覆蓋；聚合每個聊天覆蓋是沒有意義的，不應該嘗試。 |
| `changes` |可選捲起。生產者可以匯總每個聊天的變更集統計資料或報告最昂貴的聊天統計資料 - 以計算成本較低者為準。 |

工作階段透過一次聊天即可輕鬆滿足上述所有條件（聊天的值會傳遞）。只有當工作階段承載多個聊天時，這些規則才有意義。

### 聚合輸入請求

聊天會在使用者輸入（[引發](/guide/elicitation)）或輪次狀態深處的工具確認時阻塞。發現這些區塊通常需要訂閱每個聊天通道，這對於行動應用程式或提供僅觀看工作階段的工具用戶端來說是不切實際的。

[`SessionState.inputNeeded`](/reference/session#sessionstate) 是所有聊天中每個未完成區塊的工作階段層級總和。當底層聊天層級請求出現並解析時，主機使用 `session/inputNeededSet` 更新插入條目，並使用 `session/inputNeededRemoved` 刪除它們。每當清單非空時，工作階段的 [`status`](#chat-aggregation) 就會攜帶 `InputNeeded` 位元。

每個條目都是一個 [`SessionInputRequest`](/reference/session#sessioninputrequest) — `kind` 上的判別聯集：

| `kind` |攜帶|透過派遣來回應... |
|---|---|---|
| `chatInput` |鏡像的 [`ChatInputRequest`](/reference/chat#chatinputrequest) | `chat/inputCompleted`（或 `chat/inputAnswerChanged`）|
| `toolConfirmation` | [`ToolCallConfirmationState`](/reference/chat#toolcallconfirmationstate) 加 `turnId` | `chat/toolCallConfirmed` 或 `chat/toolCallResultConfirmed` |
| `toolClientExecution` |處於 `running` 狀態的 [`ToolCallState`](/reference/chat#toolcallstate) 加上 `turnId` 和擁有的 `clientId` | `chat/toolCallComplete`（可選`chat/toolCallContentChanged`）|
| `toolAuthentication` | [`ToolCallAuthRequiredState`](/reference/chat#toolcallauthrequiredstate) 加 `turnId` | *（見下文）* `authenticate` |

每個條目都攜帶所屬的 `chat` URI 以及構造回應所需的識別碼（`request.id` 或 `turnId` + `toolCall.toolCallId`）。因此，用戶端透過將普通的 `chat/*` 操作**傳送到該聊天通道**來進行應答 - 它**不需要**需要先訂閱聊天。 `inputNeeded` 是一個讀取/回應便利介面，而不是一個單獨的回應協定：聊天通道仍然是事實來源，一旦聊天層級請求被解決，主機就會刪除聚合條目。

`toolAuthentication` 是「透過 `chat/*` 操作回應」模式的例外：用戶端透過使用來自 `toolCall.auth.resource` 的資源呼叫連線級 `authenticate` 指令來解決這個問題（請參閱 [驗證](/specification/authentication)），而不是透過向聊天分派操作。一旦令牌被接受，主機就會調度 `chat/toolCallAuthResolved` 並刪除此時的 `session/inputNeeded` 條目。

### 處理





```jsonc
// Client → Server (request)
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "disposeSession",
  "params": { "channel": "ahp-session:/<uuid>" },
}
```


伺服器拆除工作階段後端，刪除關聯的訂閱，並向訂閱 `ahp-root://` 的用戶端廣播 `root/sessionRemoved`。

## 該通道上的方法和事件

本節列出了在上下文中解釋的連線方法
工作階段 URI (`ahp-session:/<uuid>`)。

### 指令 (`params.channel = "ahp-session:/<uuid>"`)

|方法|親切 |目的|
|---|---|---|
| `createSession` |請求 |在所選 URI 處建立一個工作階段。 |
| `disposeSession` |請求 |處置此工作階段及其後端資源（級聯到工作階段目錄中的每個聊天）。 |

### 通知 (`params.channel = "ahp-session:/<uuid>"`)

|方法|親切 |意義|
|---|---|---|
| `action` | 伺服器 → 用戶端通知 | 工作階段操作信封（`session/*` 操作有效負載 - 目錄更新、生命週期、自訂、變更集）。 |
| `dispatchAction` | 用戶端 → 伺服器通知 |在此工作階段（`session/titleChanged`、`session/defaultChatChanged`、...）上調度用戶端操作。 |
| `unsubscribe` | 用戶端 → 伺服器通知 |停止接收此工作階段通道的訊息。 |

當需要驗證時，`auth/required` 也可以定位工作階段 URI
操作範圍為工作階段；看到
[驗證](/specification/authentication)。

## 伺服器用戶端操作的驗證

當伺服器在此通道上收到用戶端分派的操作時，它必須在應用之前對其進行驗證。無效操作必須透過 `ActionEnvelope` 上的 `rejectionReason` 進行回顯。以下驗證規則適用：

|行動|狀況 | 伺服器行為 |
|------------------------------------------------------------------------------------------------------------------------------------ ---------------------------------------------------------------------------------------------------------------- ------------------------------------------------ |
|任何引用不存在的工作階段 | 的操作未找到通道 URI | 伺服器必須默默地忽略該操作（無回顯）|| `session/defaultChatChanged` | `defaultChat` URI 與工作階段的聊天目錄中的條目不符 | 伺服器必須拒絕該操作 |

回合、工具呼叫、輸入請求和待處理訊息層級的驗證存在於 [聊天通道](./chat-channel#server-validation-of-client-actions) 上。

## 行動

請參閱 [工作階段通道參考](/reference/session#actions) 以了解完整的每個操作參考。所有工作階段範圍的操作信封都帶有 `channel: "ahp-session:/<uuid>"`。

## 目錄通知

工作階段目錄事件（建立、處置、摘要突變）在 [根通道](/specification/root-channel#protocol-notifications) 上發出，而不是在工作階段通道本身上發出。這讓用戶端可以追蹤工作階段列表，而無需訂閱每個工作階段。