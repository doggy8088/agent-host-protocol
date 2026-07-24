# 聊天通道

聊天通道承載單一對話執行緒的完整狀態：回合、串流回應、工具呼叫、待處理訊息和輸入請求。聊天總是屬於 [工作階段](./session-channel); 工作階段可能包含一個或多個聊天。聊天是可獨立訂閱的，因此用戶端可以觀察活動的子集，而無需支付工作階段中每個聊天的頻寬成本。

## 網址





```
ahp-chat:/<uuid>
```


此路徑是建立聊天時由伺服器指派的伺服器唯一識別碼（通常是 UUID）。擁有的工作階段 URI **未** 在聊天 URI 中進行編碼 - 該關係透過工作階段的 [`chats`](/reference/session#sessionstate) 目錄和每個聊天的 [`origin`](/reference/chat#chatorigin) 來表達。

多個聊天通道可以同時處於活動狀態。用戶端訂閱他們想要追蹤其狀態的每個聊天。

## 狀態

訂閱者收到 [`ChatState`](/reference/chat#chatstate) 快照。 `ChatState` 將 [`ChatSummary`](/reference/chat#chatsummary) 欄位直接非規範化到自身（`resource`、`title`、`status`、`activity`、`modifiedAt`、`origin`、`workingDirectory`）並新增對話內容（已完成回合的歷史記錄、活動（若有待處理）製作者必須保持工作階段目錄中聊天的 `ChatSummary` 與這些內聯摘要欄位一致 - 通常透過每當聊天中的任何摘要欄位發生變更時調度相符的 [`session/chatUpdated`](/reference/session#actions)。請參閱[狀態模型指南](/guide/state-model)以了解結構概述。

當用戶端訂閱 `view.turns` 時，伺服器可能僅公開
初始快照中最近完成的回合。請求的號碼是
建議：伺服器可能會傳回比請求更多或更少的匝數。如果
`view.turns` 被省略，伺服器必須傳回所有保留的回合。如果年紀大了
保留的匝數仍然可用，`ChatState.turnsNextCursor` 存在。的
用戶端將此不透明遊標傳遞給
[`fetchTurns`](#commands-paramschannel--ahp-chatuuid) 要求主持人
調度 `chat/turnsLoaded`，它將舊的轉變成相同的縮減
聊天狀態並更新或清除 `turnsNextCursor`。

在應用任何之前，主機還必須急切地將較舊的回合載入到狀態中
引用目前載入視窗之外的回合的操作（例如
例如，分叉、旁聊來源、聊天附件或針對某個目標的截斷
老轉）。

### 草稿

[`ChatState.draft`](/reference/chat#chatstate) 是使用者正在進行的聊天輸入 - 他們正在撰寫但尚未發送的 [`Message`](/reference/chat#message)，包括其模型/代理選擇和附件。與上面的欄位不同，`draft` 僅是狀態，並且 **不** 鏡像到 [`ChatSummary`](/reference/chat#chatsummary) 上。

用戶端可以透過調度 [`chat/draftChanged`](/reference/chat#actions) 定期將其本機輸入狀態同步到草稿中。不需要急於同步 - 用戶端應該Go抖並且可以僅在方便的點（例如，在模糊時）同步。當為現有聊天呈現輸入 UI 時，用戶端應使用任何 `draft` 來初始化其輸入狀態。發送訊息後，調度不帶 `draft` 的 `chat/draftChanged` 以將其清除。

### 每個聊天的工作目錄

`ChatState.workingDirectory`（及其在 [`ChatSummary`](/reference/chat#chatsummary) 上的鏡像）是**可選**。當缺席時，聊天將繼承工作階段的 [`workingDirectory`](/reference/session#sessionsummary)。主機可以設定每個聊天的工作目錄，為各個聊天提供自己的檔案系統上下文 - 例如，為每個聊天分配一個單獨的 git 工作樹，以便同一工作階段中的多個聊天可以進行獨立的編輯，然後編排聊天將其合併回來。工作階段層級的 `workingDirectory` 是不覆蓋它的聊天的預設/主要位置。

## 與工作階段通道的關係

- 聊天的 [`ChatSummary`](/reference/chat#chatsummary) 出現在工作階段的 [`SessionState.chats`](/reference/session#sessionstate) 目錄中。工作階段 reducer 使此目錄與底層聊天生命週期保持同步。
- 工作階段也可以將 [`defaultChat`](/reference/session#sessionstate) 公開為整體尋址到工作階段的輸入的 UI 路由提示。這僅是建議性的——聊天在協定級別上保持平等。
- 工作階段層級欄位，例如 [`status`](/reference/session#sessionsummary)、`activity` 和 `modifiedAt` 是從工作階段的聊天中派生的聚合。請參閱 [工作階段通道規格](./session-channel#chat-aggregation) 以了解推導規則。

## 生命週期





```
1. Client subscribes to the owning session URI (ahp-session:/<sid>)
2. Client (or the server, via a tool call, fork, or side chat) creates a chat with createChat
3. Server allocates a chat URI (ahp-chat:/<cid>) and mutates the session's chats catalog
4. Client subscribes to the chat URI to receive its ChatState snapshot
5. Server streams chat actions over the chat channel until the chat (or its session) is disposed
```


### 創造

[`createChat`](/reference/chat#createchat) 是 JSON-RPC 請求。呼叫者透過請求的 `channel` 參數 (`ahp-session:/<sid>`) 來識別擁有的工作階段，並且可以提供：

- 立即開始第一回合的 `initialMessage` — 攜帶自己的 [`model`](/reference/chat#message) / [`agent`](/reference/chat#message) 選擇 — 以及
- 型別 [`ChatSource`](/reference/chat#chatsource) 的 `source`，或
  `{ kind: "fork", chat, turnId }` 或 `{ kind: "sideChat", chat, turnId }`，
  選擇特定的源輪次。邊聊來源也可能有
  `selection: { text, responsePartId? }`，不可變的選定文字快照
  當主機接受 `createChat` 時捕獲。

在傳回之前，伺服器指派聊天 URI 並將聊天新增至工作階段的目錄（工作階段通道上的 `session/chatAdded`）。

用戶端必須使用所選的基於來源的建立進行門控
[`AgentInfo.capabilities.multipleChats`](/reference/root#multiplechatscapability)：

- `fork: true` 允許 `source.kind: "fork"`。
- `sideChat: true` 允許 `source.kind: "sideChat"`。
缺少或`false`表示不支援對應的源形式。主持人
必須拒絕不受支援的來源。它還必須拒絕外部的來源聊天
目標工作階段，未知來源的聊天或回合，或命名聊天的來源
正在被建立。對於分叉，主機必須另外拒絕任何其
`kind` 不是 `"fork"` - 僅分叉目標已完成的回合。

對於私聊，`turnId` 是一個穩定的身份，而不是生命週期快照。主辦單位
並用戶端根據來源聊天的當前 `activeTurn` 或其
根據需要保留 `turns`。這可以防止 `/btw` 式的側聊
當前活動的回合正在工作，即使同一回合稍後進入
完成式的歷史`turns`。

當 `source.kind` 為 `"sideChat"` 且存在 `source.selection` 時，主機
當它接受 `createChat` 時，必須精確地產生 `selection.text` 的快照；它必須
不能為空。稍後的來源轉編輯或串流增量不會追溯
更改儲存的快照。 `selection.responsePartId`，當存在時，是
諮詢出處命名包含快照文字的回應部分
時間；它**不是**活動範圍、偏移或補丁錨點。

分岔和側聊使用源的方式不同：

- **分叉**透過引用的轉折將來源歷史記錄複製到新的轉折中
  聊天可見 `turns`，之後聊天會出現分歧。
- **側聊**從自己的空可見歷史記錄開始。主機供應
  透過引用的轉為代理上下文來源歷史記錄，但不複製
  此歷史記錄進入側聊的`turns`。當引用 `turnId`
  解析為來源聊天的目前 `activeTurn`，主機快照
  來源聊天的保留歷史記錄加上活動回合的當前使用者訊息以及
  接受時任何輔助響應部分已經可用
  `createChat`；後來的源轉三角洲不會追溯改變側面
  聊天的起始上下文。如果存在 `source.selection`，則主機也會
  將所選文字精確到已建立的聊天來源的快照。安
  `initialMessage`，當提供時，成為側邊聊天的第一個可見回合。

### 起源

每個聊天都透過 [`ChatOrigin`](/reference/chat#chatorigin) 宣傳它是如何存在的：

|親切 |意義|
|---|---|
| `user` |使用者明確建立聊天（例如透過主機 UI）。 |
| `fork` |在特定的已完成回合中從現有聊天中分叉 - 有效負載引用源聊天 URI 和穩定源 `turnId`。 |
| `sideChat` |透過特定來源回合使用上下文建立為獨立的側對話 - 有效負載引用來源聊天 URI 和穩定來源 `turnId`，在建立聊天時可能是活動的或歷史的，並且可以保留在建立接受時捕獲的不可變的 `selection` 快照。 |
| `tool` |由另一個聊天中運行的工具呼叫產生 - 有效負載引用來源聊天 URI 和工具呼叫 ID（例如子代理委託）。 |

用戶端可以使用原點來呈現上下文 UI（父指示器、分叉標記、「由工具產生」徽章），但原點**不是**層次結構 - 每個聊天都是同等可尋址的。

工俱生成的工作者是從同一條邊的兩端來描述的。工作執行緒聊天透過其 `tool` 來源（產生的聊天 URI 和工具呼叫 ID）攜帶規範記錄。生成工具呼叫透過其結果中的 [`ToolResultSubagentContent`](/reference/chat#toolresultsubagentcontent) 區塊向前顯示相同的關係，其 `resource` 是工作執行緒 **chat** URI（`ahp-chat:/<cid>`，而不是工作階段 URI）。發出該區塊的工具呼叫是由工作聊天的 `origin.toolCallId` 命名的工具呼叫；主機必須保持兩者一致。

#### 祖先與築巢深度

`fork`、`sideChat` 或 `tool` 來源僅命名聊天的**直接**來源聊天（透過 URI），以及產生它的回合或工具呼叫。因此，聊天的祖先不會直接儲存；這是您透過從一個聊天到下一個聊天跟隨 `origin.chat` 重建的鏈。由於工具產生的聊天本身可以運行產生更多聊天的工具，因此這些鏈可以是任意深度。

- **沒有協定強加的深度限制。 ** AHP 不限制巢狀深度或扇出，且線路不承載深度計數器或最大深度欄位。任何界限都是協定既不強制執行也不公佈的主機策略決定；主機應該防止失控遞歸或無界扇出。
- **祖先是建議性的，可能不完整。 ** 每個聊天都是工作階段的 [`chats`](/reference/session#sessionstate) 目錄中的平面、同等可尋址的對等體 - `origin` 是呈現提示，而不是結構父連結。當來源聊天產生的聊天繼續存在時，來源聊天可能會被修剪 (`session/chatRemoved`)，因此不保證能夠解析 `origin.chat` URI。用戶端重建祖先必須容忍遺失的引用，並且應該防止循環和無限深度（例如，透過限制它們行走或渲染的深度）。

### 將一個聊天拉入另一個聊天

訊息可以使用以下方式附加有界轉錄本
[`MessageChatAttachment`](/reference/chat#messagechatattachment)。它的`resource`
標識同一工作階段中的另一個聊天，而 `endTurn` 標識最後一個聊天
已完成的回合包含在成績單中。需要綁定：稍後
引用的聊天回合不得追溯更改聊天的上下文
已經發送的訊息。

這是將側聊結果拉回原始狀態的標準方法
聊天。它不限於使用者體驗：任何聊天都可以附加來自
相同的工作階段。不會發生合併或聊天間訊息傳遞操作；附件
透過 `chat/turnStarted` 中的普通訊息傳送。

接受訊息時，主持人必須解析引用的聊天保留
從第一輪到 `endTurn` 的轉錄，包括在內，並提供它
作為模型上下文。主機必須拒絕未知聊天、跨工作階段聊天、
未知回合，或正在進行的回合而不是已完成的回合。裡面有聊天附件
引用的轉錄本必須保持引用狀態且不能遞歸
擴展，防止循環和無限的上下文增長。

附件本身保持耐用轉動狀態。如果引用的聊天是
稍後修剪，用戶端應該繼續渲染儲存的 `label` 並處理
盡最大努力打開`resource`。修剪不會改變模型輸入
當主機接受包含訊息時，它已經具體化了。

### 活躍聊天

一旦聊天存在並且其工作階段為 `lifecycle: 'ready'`，聊天就會接受回合。線形狀反映了傳統的單一聊天工作階段形狀：

- 用戶端調度 `chat/turnStarted` 開始回合。
- 伺服器流 `chat/delta`、`chat/responsePart`、`chat/toolCallStart`、`chat/toolCallReady` 和相關運算。
- 用戶端調度 `chat/toolCallConfirmed` / `chat/toolCallResultConfirmed` 以批准或拒絕工具呼叫，或調度 `chat/turnCancelled` 以中止。
- 當回合結束時，伺服器調度 `chat/turnComplete` 或 `chat/error`。
- 當回合處於活動狀態時，伺服器可以調度 `chat/inputRequested`。用戶端與 `chat/inputAnswerChanged` 同步答覆草稿並使用 `chat/inputCompleted` 完成請求。

在此通道上分派的所有操作均在 `channel` 為聊天 URI 的 `ActionEnvelope` 上傳輸。操作有效負載不攜帶自己的聊天 URI — 通道來自信封。

### 處理

當聊天所屬的工作階段被處置時，聊天也會被隱式處置。該協定目前未公開 `disposeChat` 指令；聊天將在其工作階段的生命週期內持續存在，除非伺服器修剪它們。當聊天被刪除時（無論是明確的還是因為其工作階段被拆除），伺服器必須透過 `session/chatRemoved` 更新工作階段的 `chats` 目錄，以便訂閱者可以釋放其每聊天訂閱。

## 該通道上的方法和事件

本節列出了在聊天 URI (`ahp-chat:/<uuid>`) 上下文中解釋的連線方法。

### 指令 (`params.channel = "ahp-chat:/<uuid>"`)

|方法|親切 |目的|
|---|---|---|
| `fetchTurns` |請求 |請主持人將較舊的歷史回合載入到此聊天狀態。 |
| `completions` |請求 |聊天範圍的內聯完成（例如使用者訊息提及）。 |

`createChat` 針對所擁有的工作階段 URI (`params.channel = "ahp-session:/<sid>"`) 進行分派。

### 通知 (`params.channel = "ahp-chat:/<uuid>"`)

|方法|親切 |意義|
|---|---|---|
| `action` | 伺服器 → 用戶端通知 |聊天操作信封（`chat/*` 操作負載）。 |
| `dispatchAction`| 用戶端 → 伺服器通知 |在此聊天中調度用戶端操作（`chat/turnStarted`、`chat/toolCallConfirmed`、...）。 |
| `unsubscribe` | 用戶端 → 伺服器通知 |停止接收此聊天通道的訊息。 |

## 伺服器用戶端操作的驗證

當伺服器在此通道上收到用戶端分派的操作時，它必須在應用之前對其進行驗證。無效運算必須在 `ActionEnvelope` 上使用 `rejectionReason` 進行回顯。驗證規則鏡像舊版工作階段驗證表 — 以 `chat/*` 取代 `session/*`：

|行動|狀況 | 伺服器行為 |
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |------------------------------------------------------------------------------------------------ |
|任何引用不存在的聊天的操作 |未找到通道 URI | 伺服器必須默默地忽略該操作（無回顯）|| `chat/toolCallConfirmed` |工具呼叫不在 `pending-confirmation` 狀態 | 中伺服器必須拒絕該操作 |
| `chat/turnCancelled` |沒有主動回合 | 伺服器必須拒絕該動作 |
| `chat/inputAnswerChanged` |沒有符合 `requestId` | 的輸入請求伺服器應拒絕該操作 || `chat/inputAnswerChanged` | `answer.state` 需要一個值，但 `answer.value` 不存在，或 `answer.value.kind` 缺少匹配的有效負載欄位 | 伺服器應拒絕該操作 |
| `chat/inputCompleted`|沒有符合 `requestId` | 的輸入請求伺服器應拒絕該操作 |
| `chat/inputCompleted` | `response` 是 `'accept'`，但必填問題尚未提交答案 | 伺服器應拒絕該操作 || `chat/pendingMessageRemoved` |沒有符合 `id` 和 `kind` 的待處理訊息 | 伺服器應拒絕該動作 |

## 待處理訊息消費

待處理訊息在聊天中即時顯示，而不是在工作階段中。消耗規則反映了舊的工作階段行為：

### 排隊訊息

當一輪完成且 `queuedMessages` 非空時，伺服器應：

1. 使用 `kind: 'queued'` 調度第一個排隊訊息的 `chat/pendingMessageRemoved`。
2. 調度 `chat/turnStarted`，並將排隊訊息的 `message` 和 `queuedMessageId` 設定為訊息的 `id`。

當聊天空閒（無活動回合）時新增排隊訊息時，伺服器應立即使用相同的兩步驟序列使用它。

### 轉向訊息

當回合處於活動狀態且 `steeringMessages` 非空時，伺服器可以自行決定消耗轉向訊息。要使用轉向訊息，伺服器：

1. 使用 `kind: 'steering'` 調度 `chat/pendingMessageRemoved`。
2. 將訊息內容注入模型脈絡中（注入機制對協定來說是不透明的）。

空閒時新增的轉向訊息會在回合啟動時以靜默方式儲存和消耗。

## 行動

請參閱[聊天通道參考](/reference/chat#actions) 以取得完整的每個操作參考。所有聊天範圍的操作信封都帶有 `channel: "ahp-chat:/<uuid>"`。