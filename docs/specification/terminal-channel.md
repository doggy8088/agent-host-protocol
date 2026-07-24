# 終端機通道

終端機通道承載單一偽終端機 (pty) 程序的狀態 - shell、dev 伺服器、建置任務或其他長時間執行的指令。終端獨立於任何建立它們的工作階段，並且可以由用戶端或工作階段聲明。

有關終端機流的實作演練，請參閱[終端指南](/guide/terminals)。

## 網址





```
<scheme>:/<id>
```


終端機 URI 的方案和路徑是由伺服器定義的。 [`RootState.terminals`](/specification/root-channel#state) 所承載的輕量級終端機目錄通告每個即時終端機的 URI；用戶端訂閱終端機 URI 以取得其完整的狀態。

## 狀態

訂閱者收到 [`TerminalState`](/reference/terminal#terminalstate) 快照：





```typescript
TerminalState {
  title: string
  cwd?: URI
  cols?: number
  rows?: number
  content: TerminalContentPart[]
  exitCode?: number
  claim: TerminalClaim
  supportsCommandDetection?: boolean
}
```


`content` 是鍵入部分的有序陣列。每個部分要麼是 `unclassified`（原始 VT 輸出），要麼是承載命令列、累積輸出、退出程式碼和持續時間的結構化 `command` 部分。有關零件形狀，請參閱[端子指南](/guide/terminals#full-terminal-state)。

終端機 **總是擁有** - [`claim`](/guide/terminals#claims-and-ownership) 欄位記錄它是屬於用戶端還是工作階段。

## 生命週期

### 創造

[`createTerminal`](/reference/terminal#createterminal) 是一個 JSON-RPC 請求，它會指派一個新的終端機，其中包含必要的初始宣告以及可選的名稱、cwd 和維度：





```jsonc
// Client → Server
{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "createTerminal",
  "params": {
    "channel": "ahp-terminal:/<id>",
    "claim": { "kind": "client", "clientId": "client-abc" },
    "name": "build",
    "cwd": "file:///workspace",
    "cols": 120,
    "rows": 30
  }
}
```


建立後，伺服器調度 `root/terminalsChanged`，以便 `ahp-root://` 的訂閱者看到終端機目錄中的新條目，並且用戶端應訂閱終端機 URI 以接收完整的狀態。

### 處理

[`disposeTerminal`](/reference/terminal#disposeterminal) 終止底層 pty（如果正在執行）並刪除終端機。伺服器調度 `root/terminalsChanged` 以反映新目錄。不存在「不釋放就釋放」的情況——當不再需要終端機時，它就會被釋放。

## 該通道上的方法和事件

本節列出了在上下文中解釋的連線方法
終端機 URI (`ahp-terminal:/<id>`)。

### 指令 (`params.channel = "ahp-terminal:/<id>"`)

|方法|親切 |目的|
|---|---|---|
| `createTerminal` |請求 |在選定的 URI 處建立帶有初始聲明的終端機。 |
| `disposeTerminal` |請求 |處理此終端機並終止其 pty（如果仍在執行）。 |

### 通知 (`params.channel = "ahp-terminal:/<id>"`)

|方法|親切 |意義|
|---|---|---|
| `action` | 伺服器 → 用戶端通知 | 終端機操作信封（`terminal/*` 操作有效負載）。 |
| `dispatchAction` | 用戶端 → 伺服器通知 |調度終端機用戶端操作（`terminal/input`、`terminal/resized`、`terminal/claimed`、`terminal/titleChanged`、`terminal/cleared`）。 |
| `unsubscribe` | 用戶端 → 伺服器通知 |停止接收此終端機通道的訊息。 |

## 行動

所有終端機範圍的操作信封都帶有 `channel: "<terminal-uri>"`。操作有效負載不攜帶自己的終端機 URI。

### 資料流

|行動| 用戶端-可調度 | reducer 效果 |
|---|:---:|---|
| `terminal/data` |沒有 |追加到尾部內容部分 |
| `terminal/input` |是的 |無操作（伺服器轉送到 pty）|

`terminal/data` 僅限 **伺服器**。 `terminal/input` 是一個 **僅副作用** 用戶端操作 - 用戶端調度鍵盤輸入，而伺服器將其轉送到 pty 行程。 reducer 不會修改 `terminal/input` 上的狀態；任何結果輸出稍後都會透過 `terminal/data` 到達。

::: 提示為什麼要進行兩個單獨的操作？
終端機 I/O 有意分為 `terminal/input` (用戶端 → pty) 和 `terminal/data` (pty → 用戶端)，因為 **標準預寫入協調對終端並不安全**。 pty 是一個有狀態的、可變的過程－樂觀地應用輸入或預測輸出會產生不正確的狀態。透過將輸入保持為僅副作用操作並將輸出保持為伺服器權威，用戶端可以避免將終端機 I/O 視為正常狀態操作時可能出現的協調陷阱。
:::

### 命令檢測

Shell 整合終端可以宣布命令邊界：

|行動| 用戶端-可調度 | reducer 效果 |
|---|:---:|---|
| `terminal/commandDetectionAvailable` |沒有 |集`supportsCommandDetection: true` |
| `terminal/commandExecuted` |沒有 |附加 `command` 部分，設定 `supportsCommandDetection: true` |
| `terminal/commandFinished` |沒有 |將符合的 `command` 部分標記為完整，並包含退出代碼和持續時間 |

伺服器不得在 `terminal/data` 中包含 shell 整合轉義序列 — 它們必須在分派之前被剝離。用戶端在依賴指令邊界之前必須檢查 `supportsCommandDetection`。

### 控制

|行動| 用戶端-可調度 | reducer 效果 |
|---|:---:|---|
| `terminal/resized` |是的 |集 `cols`、`rows` |
| `terminal/claimed` |是的 |集 `claim` |
| `terminal/titleChanged` |是的 |集 `title` |
| `terminal/cwdChanged` |沒有 |集`cwd`|
| `terminal/exited` |沒有 |集 `exitCode` |
| `terminal/cleared` |是的 |將 `content` 重設為 `[]` |

## 指令

- [`createTerminal`](/reference/terminal#createterminal) — 建立一個帶有初始宣告的新終端機
- [`disposeTerminal`](/reference/terminal#disposeterminal) — 終止 pty（如果正在執行）並刪除終端機

## 目錄通知

`RootState.terminals` 上的輕量級終端機目錄透過 [根通道](/specification/root-channel) 上的伺服器端 `root/terminalsChanged` 運算保持同步。終端機通道本身不會發出協定通知 - 僅發出操作信封。