# 行動

操作是可訂閱狀態的唯一突變機制。它們形成一個以 `type` 為鍵的判別聯集。每個操作都包含在 `ActionEnvelope` 中，用於排序和起源追蹤。

## 行動信封





```typescript
ActionEnvelope {
  channel: URI                                          // channel the action targets
  action: Action
  serverSeq: number                                     // monotonic, assigned by server
  origin: { clientId: string, clientSeq: number } | undefined  // undefined = server-originated
  rejectionReason?: string                              // present when the server rejected the action
}
```


- `channel` — 此操作目標的通道 URI。路由是透過信封進行的，而不是透過內部操作上的欄位進行的。請參閱[通道和訂閱](/specification/subscriptions)。
- `serverSeq` — 由伺服器指派的單調遞增序號，用於排序和重播。
- `origin` — 標識誰發起了此操作。 `undefined` 表示伺服器本身（例如來自代理後端）。否則標識調度它的用戶端。
- `rejectionReason` — 如果存在，則表示伺服器拒絕了該操作。用戶端應該恢復其樂觀預測。包含人類可讀的解釋（例如 `"no active turn to cancel"`、`"tool call not pending confirmation"`）。

各個操作有效負載**不**攜帶自己的 `session: URI` 或 `terminal: URI` 欄位 - 目標通道來自信封。

## 根操作

這些變異根狀態並在 [根通道](/specification/root-channel) 上傳播。一個根運算 — `root/configChanged` — 是用戶端可調度的；其餘的都是源自伺服器。

| 型別 | 用戶端-可調度？ |當 |
|---|---|---|
| `root/agentsChanged` |沒有 |可用的代理後端或其模型已更改 |
| `root/activeSessionsChanged` |沒有 |活動工作階段的計數已更改 |
| `root/terminalsChanged` |沒有 |輕量級終端機目錄已更改（完全替換）|
| `root/configChanged` | **是** |主機層級設定值已變更 |

## 工作階段和聊天操作

操作在以其前綴命名的通道上傳輸：[工作階段通道](/specification/session-channel) (`ahp-session:/<uuid>`) 上的 `session/*` 操作，以及 [聊天通道](/specification/chat-channel) (`ahp-chat:/<cid>`) 上的 `chat/*` 操作。工作階段是聊天目錄；它的每次對話活動（回合、串流、工具呼叫、待處理訊息和輸入請求）存在於聊天通道中，而生命週期、元資料、工具註冊表和自訂操作則存在於工作階段通道中。某些操作僅是伺服器（由代理後端產生），其他操作是可調度的用戶端。

當用戶端分派操作時，伺服器將其應用於狀態並對其做出副作用（例如，`chat/turnStarted` 觸發代理處理，`chat/turnCancelled` 中止它）。這避免了針對常見互動情況的單獨命令→動作轉換層。

### 生命週期（工作階段通道）

| 型別 | 用戶端-可調度？ |當 |
|---|---|---|
| `session/ready` |沒有 | 工作階段後端初始化成功 |
| `session/creationFailed` |沒有 | 工作階段後端初始化失敗 |

### Turn Lifecycle（聊天通道）

| 型別 | 用戶端-可調度？ |當 |
|---|---|---|
| `chat/turnStarted` | **是** |使用者傳送訊息；伺服器開始處理 |
| `chat/delta` |沒有 |由 `partId` | 附加到回應部分的流文本區塊
| `chat/responsePart` |沒有 |建立新的回應部分（降價、推理、內容引用、工具呼叫）|
| `chat/reasoning` |沒有 |由 `partId` | 附加到推理部分的推理/思考文本
| `chat/usage` |沒有 |活躍回合的代幣使用報告 |
| `chat/turnComplete` |沒有 |轉轉完畢（副怠速）|
| `chat/turnCancelled` | **是** |回合被中止；伺服器停止處理 |
| `chat/error` |沒有 |回合處理時出錯 |
| `chat/truncated` | **是** |截斷歷史記錄（帶有可選的 `turnId` 截斷）|

### 工具呼叫（聊天通道）

工具呼叫遵循判別聯集狀態機器 - 有關完整圖表，請參閱[狀態模型 - 工具呼叫生命週期](/guide/state-model#tool-call-lifecycle)。

| 型別 | 用戶端-可調度？ |當 |
|---|---|---|
| `chat/toolCallStart` |沒有 | 建立工具呼叫；LM 開始傳輸參數 |
| `chat/toolCallDelta` |沒有 |附加串流部分參數 |
| `chat/toolCallReady` |沒有 |參數完整（或執行工具需要重新確認） |
| `chat/toolCallConfirmed` | **是** | 用戶端核准或拒絕待處理的工具呼叫 |
| `chat/toolCallComplete` | **是**1 |工具執行完成 |
| `chat/toolCallResultConfirmed` | **是** | 用戶端核准或拒絕待處理結果 |
| `chat/toolCallContentChanged` | **是**1 |在工具執行時間串流中間內容 |
| `chat/toolCallAuthRequired` |沒有 |執行 MCP 貢獻的工具呼叫會暫停待處理的驗證 |
| `chat/toolCallAuthResolved` |沒有 |驗證已解決；工具呼叫恢復到 `running` |

¹ 用戶端 - 僅可調度 **用戶端 - 提供的工具**（其中工具呼叫的 `contributor.clientId` 與調度用戶端相符）。對於伺服器端工具，只有伺服器會產生這些運算。

### 活動和元資料

| 型別 | 用戶端-可調度？ |當 |
|---|---|---|
| `session/titleChanged` | **是** | 工作階段標題已更新（自動產生或用戶端重新命名）|
| `session/activityChanged` |沒有 | 伺服器更新了工作階段的目前活動描述 |
| `chat/activityChanged` |沒有 | 伺服器更新了聊天的當前活動描述 |
| `session/changesetsChanged` |沒有 |主機為此工作階段通告的變更集目錄已更改（完全替換）|
| `session/isReadChanged` | **是** | 用戶端將工作階段標記為已讀或未讀 |
| `session/isArchivedChanged` | **是** | 用戶端已存檔或未存檔工作階段 |
| `session/configChanged` | **是** |可變工作階段設定值已變更 |
| `session/metaChanged` |沒有 | 工作階段的 `_meta` 側通道已被取代 |

### 伺服器和 Active-用戶端工具（工作階段通道）

| 型別 | 用戶端-可調度？ |當 |
|---|---|---|
| `session/serverToolsChanged` |沒有 | 伺服器-提供的工具清單已更改（完全替換）|
| `session/activeClientSet` | **是** | 用戶端作為活動的用戶端（由 `clientId` 鍵入）加入或刷新，並具有其工具和自訂設定 |
| `session/activeClientRemoved` | **是** | A 用戶端離開活動集（由 `clientId`）|

請參閱[自訂和用戶端工具](/guide/customizations) 以了解完整流程。

### 待處理訊息（聊天通道）

| 型別 | 用戶端-可調度？ |當 |
|---|---|---|
| `chat/pendingMessageSet` | **是** |設定了轉向或排隊訊息（更新插入）|
| `chat/pendingMessageRemoved` | **是** |待處理訊息已被取消（由用戶端）或已消耗（由伺服器）|
| `chat/queuedMessagesReordered` | **是** |排隊的訊息已重新排序 |

`pendingMessageSet` 和 `pendingMessageRemoved` 運算有 `kind` 判別式（`'steering'` 或 `'queued'`）。請參閱 [狀態模型 — 待處理訊息](/guide/state-model#pending-messages) 以了解語意。

### 輸入請求（聊天通道）

| 型別 | 用戶端-可調度？ |當 |
|---|---|---|
| `chat/inputRequested` |沒有 | 伺服器請求使用者的結構化輸入（upsert） |
| `chat/inputAnswerChanged` | **是** | 用戶端更新了單一草稿/提交/跳過的答案 |
| `chat/inputCompleted` | **是** | 用戶端接受、拒絕或取消輸入請求 |

請參閱[Elicitation](/guide/elicitation) 以了解請求生命週期。

### 定制

| 型別 | 用戶端-可調度？ |當 |
|---|---|---|
| `session/customizationsChanged` |沒有 | 伺服器取代了工作階段的頂級自訂清單（完全替換）|
| `session/customizationToggled` | **是** | 用戶端按 ID 開啟或關閉容器或子自訂 |
| `session/customizationUpdated` |沒有 | 伺服器按 id 更新插入頂級容器（插件或目錄）（全條目替換，包括子項目）|
| `session/customizationRemoved` |沒有 | 伺服器刪除了按 id 進行的自訂（容器級聯到子級）|

請參閱[自訂指南](/guide/customizations) 以了解完整流程。

## 終端機操作

終端機操作在相關的 [終端機通道](/specification/terminal-channel) 上傳播。

| 型別 | 用戶端-可調度？ |當 |
|---|---|---|
| `terminal/data` |沒有 | pty 輸出流向用戶端（附加到尾部內容部分）|
| `terminal/input` | **是** |鍵盤輸入轉送到 pty（僅副作用）|
| `terminal/resized` | **是** | 終端機尺寸已更改 |
| `terminal/claimed` | **是** |索賠已轉移 (用戶端 ↔ 工作階段) |
| `terminal/titleChanged` | **是** |標題已更新 |
| `terminal/cwdChanged` |沒有 |工作目錄已更改 |
| `terminal/exited` |沒有 |行程已退出（退出代碼集）|
| `terminal/cleared` | **是** |回溯/內容重設 |
| `terminal/commandDetectionAvailable` |沒有 |外殼整合載入；現在報告命令邊界|
| `terminal/commandExecuted` |沒有 |指令已提交到 shell，正在執行 |
| `terminal/commandFinished` |沒有 |指令已完成執行（退出代碼、持續時間）|

有關使用流程，請參閱[終端指南](/guide/terminals)。

## 註解操作

註釋操作在工作階段的註釋通道 (`ahp-session:/<uuid>/annotations`) 上傳送。每個註釋操作都是用戶端可分派的 — 用戶端透過直接分派來建立、重新錨定、解析和刪除註釋及其條目（分配 `Annotation.id` / `AnnotationEntry.id` 本身並樂觀地應用它們），並且代理主機也可以發起它們。

| 型別 | 用戶端-可調度？ |當 |
|---|---|---|
| `annotations/set` | **是** |更新插入註釋 — 建立一個帶有強制第一個條目的註釋，或重新錨定/解析現有註釋 |
| `annotations/updated` | **是** |部分更新註解自己的屬性（解析/重新開啟、重新錨定），無需重新傳送其條目 |
| `annotations/removed` | **是** |刪除整個註釋（及其包含的每個條目）|
| `annotations/entrySet` | **是** |在註釋中更新插入單一條目（新增或編輯）|
| `annotations/entryRemoved` | **是** |刪除單一條目；分派 `annotations/removed` 而非刪除最後剩餘的條目 |

有關完整的狀態形狀，請參閱[註釋通道參考](/reference/annotations)。

## 用戶端-分派操作

用戶端透過將操作視為即發即忘通知分派來與伺服器互動：





```jsonc
// Client → Server
{
  "jsonrpc": "2.0",
  "method": "dispatchAction",
  "params": {
    "channel": "ahp-chat:/<cid>",
    "clientSeq": 1,
    "action": { "type": "chat/turnStarted", "turnId": "t1", ... }
  }
}
```


用戶端在發送之前**樂觀地**將操作應用到其本地狀態。當伺服器在 `ActionEnvelope` 中回顯時，用戶端會進行協調（請參閱[預寫入協調](/guide/reconciliation)）。

|行動| 伺服器-副作用|
|---|---|
| `chat/turnStarted` |開始新一輪的代理處理 |
| `chat/toolCallConfirmed` |核准或拒絕待處理的工具呼叫；解除封鎖或取消工具執行 |
| `chat/turnCancelled` |中止正在進行的回合 |
| `session/titleChanged` |更新工作階段標題（重新命名）|
| `chat/pendingMessageSet` |儲存轉向或排隊訊息（upsert）；如果排隊且空閒，則自動開始輪次 |
| `chat/pendingMessageRemoved` |在消費之前取消待處理的訊息 |
| `chat/queuedMessagesReordered` |重新排序排隊的訊息；未知 ID 被忽略，未提及的訊息保留在最後 |
| `session/customizationToggled` |按 id 開啟或關閉容器或子自訂 |
| `session/isReadChanged` |將工作階段標記為已讀或未讀 |
| `session/isArchivedChanged` |歸檔或取消歸檔工作階段 |

## reducer

狀態由純粹 reducer 函式變異－每個帶有狀態的通道型別變異一個：





```typescript
rootReducer(state: RootState, action: RootAction): RootState
sessionReducer(state: SessionState, action: SessionAction): SessionState
chatReducer(state: ChatState, action: ChatAction): ChatState
terminalReducer(state: TerminalState, action: TerminalAction): TerminalState
```


給定操作信封的 reducer 由 `envelope.channel` 的 URI 方案選取。reducer是**純粹的**——沒有副作用，沒有 I/O。相同的 reducer 程式碼在伺服器和用戶端上運行，這使得預寫成為可能。伺服器副作用（例如，將訊息轉送給代理程式 SDK）由單獨的調度層處理，而不是在 reducer 中處理。

操作 `type` 上的 reducer `switch` 非常詳盡 - 如果缺少大小寫，編譯器會出錯。這保證了每個操作型別都得到處理。

## 後續步驟

- [通道和訂閱](/specification/subscriptions) — 通道和動作信封如何路由突變。
- [預寫入協調](/guide/reconciliation) — 用戶端如何保持同步。
- [訊息參考](/reference/messages) — 每個 JSON-RPC 方法的索引，連結到記錄它的通道。
- [一般參考](/reference/common#action-envelope) — `ActionEnvelope`、`ActionType` 和 `StateAction` 並集。
- [狀態模型](/guide/state-model) — 這些運算會改變的狀態樹。