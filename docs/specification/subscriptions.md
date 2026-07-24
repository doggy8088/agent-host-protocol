# 通道和訂閱

AHP 將所有基於推送的通訊組織到**通道**。通道是一種由 URI 標識的資源，用戶端訂閱該資源以接收更新。通道可以有狀態（根、工作階段、終端、變更集）或無狀態（未來：日誌記錄、MCP 中繼、LSP 中繼）。訂閱機制（`subscribe`、`unsubscribe` 和每通道通知）在不同通道類型中是統一的。

## 每個訊息都帶有 `channel`

通道概念融入每個線路訊息中。 **每個指令和每個通知的參數上都有一個頂級 `channel: URI` 欄位。 ** 這個不變數允許伺服器、用戶端和中間代理程式透過檢查 `(method, params.channel)` 來分派任何傳入訊息，而無需了解其餘負載的每個方法。

|方向 |方法 | `channel` 值 |
|---|---|---|
| 用戶端 → 伺服器指令（通道範圍）| `subscribe`、`createSession`、`disposeSession`、`createTerminal`、`disposeTerminal`、`fetchTurns`、`completions`、`invokeChangesetOperation`|目標通道的 URI（例如 `ahp-session:/<uuid>`）。 |
| 用戶端 → 伺服器指令（連線級）| | `initialize`, `ping`, `reconnect`, `listSessions`, `authenticate`, `resolveSessionConfig`, `sessionConfigCompletions`, `resourceRead`, `resourceWrite`, `resourceList`, `resourceCopy`, `resourceDelete`, `resourceWrite`, `resourceList`, {c29, {c3c7}, {c `resourceRequest`, `createResourceWatch` |字面意思`'ahp-root://'`。 |
| 伺服器 → 用戶端指令（雙向 `resource*` 系列）|同樣的九個`resource*`請求方法加上`createResourceWatch`也可以由伺服器發起。用於主機驅動的每工作階段檔案系統提供者並用於取得用戶端發布的 URI（例如 `virtual://my-client/...` 外掛程式）。 |字面意思`'ahp-root://'`。 |
| 用戶端 → 伺服器 `dispatchAction` |操作目標的通道。 |
| 用戶端 → 伺服器 `unsubscribe` |該通道正在取消訂閱。 |
| 伺服器 → 用戶端 `action` |擁有操作信封的通道。 || 伺服器 → 用戶端協定通知 | `root/sessionAdded`、`root/sessionRemoved`、`root/sessionSummaryChanged`、`auth/required`、`otlp/exportLogs`、`otlp/exportTraces`、`otlp/exportMetrics`|通知範圍的通道（`root/*` 的根通道；`auth/required` 的驗證主機要求訊號範圍的通道（`root/*` 的根通道；`auth/required` 的驗證主機要求訊號範圍的主機（`root/*` 的根通道；`auth/required` 的驗證主機要求。 |

此限制以 TypeScript 類型進行編碼：`CommandMap` 中的每個條目和通知映射都具有可指派給 `BaseParams` 的參數（或者，對於通知，結構上為 `{ channel: URI }`）。如果任何新方法省略該欄位，則 `types/version/message-checks.ts` 中的編譯時檢查將會失敗。

本頁的其餘部分詳細介紹了 URI 方案和訂閱的生命週期。每個通道頁面（[Root](/specification/root-channel)、[工作階段](/specification/session-channel)、[終端機](/specification/terminal-channel)）下描述了操作傳遞和協定通知的機制。

## URI 方案

|統一資源定位符 | 狀態型別 |描述 |
|---|---|---|
| `ahp-root://` | `RootState` |全域狀態（代理程式、終端機、主機配置）。始終存在。 |
| `ahp-session:/<uuid>` | `SessionState` | Per-工作階段狀態（元資料加上 `chats` 目錄）。工作階段的提供者在 `SessionSummary.provider` 上承載，而不是在 URI 方案中。 |
| `ahp-chat:/<cid>` | `ChatState` |每次聊天對話狀態（回合、串流、工具呼叫、待處理訊息、輸入請求）。工作階段以預設聊天開始；多聊天主機透過 `createChat` 新增更多內容。請參閱[聊天通道](/specification/chat-channel)。 |
| `ahp-terminal:/<id>` | `TerminalState` |每-終端機狀態。伺服器-定義的 id。 |
| `ahp-changeset:/<id>` | `ChangesetState` |每個變更集狀態。 URI是透過擴展在工作階段上廣告的`Changeset.uriTemplate`而獲得的； id 是由伺服器定義的。 |
| `ahp-otlp:` _（主機定義的權限/路徑）_ | _無狀態_ | OpenTelemetry 訊號通道（日誌、追蹤、指標）。具體 URI 在 `InitializeResult.telemetry` 上公佈；用戶端必須將它們視為不透明。請參閱[遙測通道](/specification/telemetry-channel)。 || `ahp-resource-watch:/<id>` | `ResourceWatchState` | `createResourceWatch` 傳回的每個觀看通道。為監視的 URI 下的檔案/目錄變更提供 `resourceWatch/changed` 操作。該id是接收者分配的。 |

未來的通道類型（LSP 中繼、MCP 中繼等）會引入自己的 URI 方案。用戶端不得訂閱他們不理解的方案。

## 訂閱（請求）

`subscribe` 是一個 JSON-RPC **請求**。結果包括包含狀態的通道的快照，並忽略無狀態通道的快照。





```jsonc
// Client → Server
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "subscribe",
  "params": {
    "channel": "ahp-session:/<uuid>",
    "delivery": { "maxLatencyMs": 100 }
  }
}

// Server → Client (state-bearing channel)
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "snapshot": {
      "resource": "ahp-session:/<uuid>",
      "state": {
        "provider": "copilot",
        "title": "New Session",
        "status": 1,
        "lifecycle": "creating",
        "chats": [],
        "activeClients": []
      },
      "fromSeq": 5
    }
  }
}

// Server → Client (stateless channel)
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {}
}
```


訂閱後，用戶端會收到該通道範圍內的所有訊息 — 包含操作信封（針對狀態通道）和任何特定於通道的通知。

### 交付偏好

用戶端可以在 `subscribe` 上包含 `delivery.maxLatencyMs` 以請求上限
綁定在有意的伺服器端緩衝上（以毫秒為單位）
訂閱。伺服器可以使用該預算來合併高頻更新
同時保留相同的簡化的狀態，用戶端會立即觀察到
交貨。 `0` 值無意識地請求立即交付
合併。省略 `delivery` 將使用伺服器的預設傳遞行為。

### 快照視圖

用戶端可以在 `subscribe` 上包含 `view`，以要求伺服器塑造
傳回快照。視圖首選項是建議性和附加性的：伺服器
不理解請求的視圖，忽略它並傳回其預設值
快照，且用戶端必須容忍接收多於請求的狀態。

對於聊天通道，`view.turns` 要求伺服器公開約
快照中許多最近完成的回合。該值是建議性的：
伺服器可能會傳回比請求更多或更少的匝數。如果 `view.turns` 是
省略，伺服器必須傳回所有保留的回合。如果較舊的保留回合
保持可用，傳回的`ChatState`包含`turnsNextCursor`；的
用戶端可以將此遊標傳遞給 `fetchTurns` 以要求主機尋呼較早的輪次
進入相同的減少的狀態。

## 取消訂閱（通知）

`unsubscribe` 是一勞永逸的用戶端 → 伺服器通知。與每個線路訊息一樣，它的參數攜帶要釋放的通道 URI。





```json
{
  "jsonrpc": "2.0",
  "method": "unsubscribe",
  "params": { "channel": "ahp-session:/<uuid>" }
}
```


取消訂閱後，用戶端將停止接收該通道的訊息。

## 行動交付 (`action`)

狀態通道透過 `action` 伺服器通知傳遞突變。參數是一個 `ActionEnvelope` — 平坦的，其中 `channel` 標識通道和單一 `action` 負載：





```json
{
  "jsonrpc": "2.0",
  "method": "action",
  "params": {
    "channel": "ahp-chat:/<cid>",
    "action": { "type": "chat/delta", "turnId": "t1", "partId": "p1", "content": "Hello" },
    "serverSeq": 6,
    "origin": { "clientId": "client-1", "clientSeq": 1 }
  }
}
```


- 根操作轉到訂閱 `ahp-root://` 的所有用戶端。
- 工作階段操作將會轉到訂閱該工作階段 URI 的所有用戶端。
- 聊天操作會轉到訂閱該聊天 URI 的所有用戶端。
- 終端機操作將會轉到訂閱該終端機 URI 的所有用戶端。

操作有效負載（內部 `action` 物件）僅攜帶操作固有的欄位 - 通道來自信封。各個操作不攜帶自己的 `session: URI` 或 `terminal: URI` 欄位。

用戶端 → 伺服器調度路徑使用不同的方法 `dispatchAction`，參數為 `{ channel, clientSeq, action }`：





```json
{
  "jsonrpc": "2.0",
  "method": "dispatchAction",
  "params": {
    "channel": "ahp-chat:/<cid>",
    "clientSeq": 1,
    "action": { "type": "chat/turnStarted", "turnId": "t1", "message": { "text": "Hi", "origin": { "kind": "user" } } }
  }
}
```


請參閱 [操作](/guide/actions) 以取得用戶端可分派運算的完整清單。

## 初始訂閱

在握手期間，用戶端可以在 `initialize` 中包含 `initialSubscriptions`，以在同一往返中訂閱通道：





```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "channel": "ahp-root://",
    "protocolVersions": ["0.3.0"],
    "clientId": "client-abc",
    "initialSubscriptions": ["ahp-root://", "ahp-session:/<prev-session>"]
  }
}
```


伺服器包含 `initialize` 回應中每個包含狀態的通道的快照。

## 協定通知

除了 `action` 之外，伺服器還會針對臨時事件推送每個通道的**協定通知**。每個方法都有自己的頂層 JSON-RPC 方法（例如 `root/sessionAdded`、`auth/required`）—沒有 `notification` 包裝器。





```json
{
  "jsonrpc": "2.0",
  "method": "root/sessionAdded",
  "params": {
    "channel": "ahp-root://",
    "summary": { "resource": "ahp-session:/<uuid>", "title": "New Session", ... }
  }
}
```


對於現有工作階段摘要的部分更新，伺服器會廣播 `root/sessionSummaryChanged`：





```json
{
  "jsonrpc": "2.0",
  "method": "root/sessionSummaryChanged",
  "params": {
    "channel": "ahp-root://",
    "session": "ahp-session:/<uuid>",
    "changes": { "title": "Refactor auth middleware", "status": 8 }
  }
}
```


協定通知僅發送至訂閱其目標通道的用戶端。它們不會儲存在狀態中，並且在重新連線時不會重播。

## 無狀態通道

通道可以是無狀態的－即不攜帶 `Snapshot`。訂閱傳回空結果 `{}`，後續流量通過特定於通道的方法而不是 `action` 信封流動。訂閱/取消訂閱機制與狀態通道相同。無狀態通道不會在重新連線時重播 - 用戶端從即時邊緣重新訂閱和恢復。