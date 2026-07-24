# 引出

代理可以透過將 `InputRequestResponsePart` 插入到 [聊天通道](/specification/chat-channel) 上的活動回合來請求使用者的結構化輸入。這些請求對於 MCP 啟發、基於 URL 的審核流程和代理程式澄清問題非常有用。

輸入請求是即時回應部分，而不是一次性 RPC 提示：聊天的每個訂閱者都會在其原始回應流位置看到開放請求和同步答案草稿。

## 狀態形狀





```typescript
InputRequestResponsePart {
  kind: 'inputRequest'
  request: {
    id: string
    message?: string
    url?: URI
    questions?: ChatInputQuestion[]
    answers?: Record<string, ChatInputAnswer>
  }
  response?: 'accept' | 'decline' | 'cancel'
}
```


當回合處於活動狀態時，該部分位於 `ChatState.activeTurn.responseParts` 中，然後不變地移動到已完成的回合。每個請求都有一個穩定的`id`。每個問題都有一個穩定的 `id` 用作 `answers` 中的鍵。缺少 `response` 意味著請求仍在等待提交。

## 請求生命週期

當伺服器需要使用者輸入繼續回合時，應使用此序列：

1. 保持回合活躍。
2. 使用穩定的請求 `id` 和穩定的問題 ID 調度 `chat/inputRequested`。 reducer 在回應流的目前結尾插入未解析的輸入請求部分。
3. 觀察零個或多個用戶端調度的 `chat/inputAnswerChanged` 運算。每個操作都會更新一個問題的草稿、已提交或跳過的答案。
4. 觀察 `chat/inputCompleted` 和 `response: 'accept'`、`'decline'` 或 `'cancel'`。 reducer 設定 `response` 以及同一部分的任何最終答案。
5. 恢復被阻止的操作，例如完成 MCP `elicitation/create` 請求或傳回提問工具呼叫的結果。

由於草稿位於回應部分，因此使用者可以在用戶端 A 上回答一個問題，在用戶端 B 上回答另一個問題；每個聊天訂閱者都會觀察合併的 `answers` 地圖。

## 狀態和清理

雖然活動回合有任何沒有 `response` 的輸入請求部分，但該聊天的 `status` 攜帶 `SessionStatus.InputNeeded`，並且工作階段的聚合 `status` 會提升為 `InputNeeded`，因為聊天需要輸入。當最後一個請求收到回應且回合仍處於活動狀態時，聊天狀態將回到 `SessionStatus.InProgress`。

如果活動回合完成、被取消或在提交輸入之前出現錯誤，則未解決的部分將保留在已完成的記錄中，且不存在 `response`。截斷活動回合會將其與該回合中的所有其他回應部分一起刪除。

## 持久記錄

`InputRequestResponsePart` 既是即時互動也是其持久記錄。 `chat/inputRequested` 將其插入活動回合中，答案變更會就地更新它，而 `chat/inputCompleted` 設定其最終的 `response` 和答案而不移動它。這反映了工具呼叫確認如何在整個生命週期中保留在其 `ToolCallResponsePart` 上。

該部分嵌入請求的 `id`、`message`、`url`、`questions` 和目前的 `answers`。完成後，`chat/inputCompleted` 提供的任何 `answers` 會覆蓋同步草稿。所有三個提交的結果都會被記錄，而未回答的提示仍然可以透過其不存在的 `response` 來區分。

## 問題與解答

每個問題都是 `kind` 的判別聯集：

|問題類型|答案值形狀|
|---|---|
| `text` | `{ kind: 'text', value: string }` |
| `number` / `integer` | `{ kind: 'number', value: number }` |
| `boolean` | `{ kind: 'boolean', value: boolean }` |
| `single-select` | `{ kind: 'selected', value: optionId, freeformValues?: string[] }` |
| `multi-select` | `{ kind: 'selected-many', value: optionIds[], freeformValues?: string[] }` |

`ChatInputAnswer.state` 將草稿/提交的答案 (`ChatInputAnswered`) 與跳過的答案 (`ChatInputSkipped`) 區分開來。草稿答案適用於多用戶端同步；當請求完成時，提交的答案已準備好供伺服器使用。

## URL 請求

輸入請求可以包括`url`來取代結構化問題，或除了結構化問題之外還包括`url`。用戶端可以開啟 URL 或將其提交以供審核，然後使用 `chat/inputCompleted` 完成請求。

## 驗證

在以下情況下，伺服器應該拒絕用戶端分派的輸入操作：

|行動|狀況 |
|---|---|
| `chat/inputAnswerChanged` |活動回合中沒有未解析的輸入請求部分具有符合的 `requestId`。 |
| `chat/inputAnswerChanged` | `answer.state` 需要一個值，但 `answer.value` 不存在，或值類型與答案負荷不符。 |
| `chat/inputCompleted` |活動回合中沒有未解析的輸入請求部分具有匹配的 `requestId`。 |
| `chat/inputCompleted` | `response` 是 `'accept'`，但必填問題尚未提交答案。 |

## 相關參考

- [聊天通道參考](/reference/chat) — `InputRequestResponsePart`、`ChatInputRequest`、問題和答案值類型以及 `chat/input*` 操作變體。
- [聊天通道](/specification/chat-channel) — 每個聊天輪次、活動輪次、工具呼叫和用戶端操作驗證。