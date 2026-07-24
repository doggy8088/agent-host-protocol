---
description: >-
  透過 WebSocket 與代理主機協定（AHP）伺服器互動。
  當被要求連線、傳送訊息或控制 AHP 伺服器時使用。
---

# 代理主機協定 – 副駕駛技能

您可以存取 MCP 伺服器 (`ahp-websocket`)，它可以讓您連線到
透過 WebSocket 的代理主機協定伺服器並交換 JSON-RPC 2.0 訊息。

## 可用的 MCP 工具

|工具|目的|
| ------------------- | ------------------------------------------------------------------------------------ |
| `connect` |開啟（或重新開啟）到 AHP 伺服器 URL 的 WebSocket |
| `send` |傳送 JSON-RPC 訊息並取得回應 + 任何待處理的通知 |
| `get_notifications` |清空通知收件匣（可以選擇先等待 N 秒）|
| `status` |檢查連線狀態、待處理請求計數、收件匣深度 |
| `next_id` |取得 JSON-RPC 請求 `id` 欄位的唯一遞增整數 |

## 快速啟動工作流程





```
1. connect(url: "ws://localhost:3000")
2. send initialize notification
3. wait for serverHello via get_notifications
4. subscribe to root state
5. create a session, subscribe, send turns
```


## 協定概述

AHP 是一個基於 JSON-RPC 2.0 建構的 **Redux 啟發的狀態同步協定**
透過 WebSocket。伺服器維護權威的狀態樹；用戶端申請
樂觀地採取行動並與伺服器的回應行動保持一致。

關鍵概念：

- **根狀態** (`ahp-root://`) – 列出可用的代理/模型。
- **工作階段狀態** (`ahp-session:/<uuid>`) – 每回合的對話狀態，
  增量、工具呼叫和權限。
- **Actions** – 唯一的突變機制，套件在帶有 a 的 `ActionEnvelope` 中
  `serverSeq`。
- **訂閱** – 用戶端訂閱 URI 標識的狀態資源
  接收動作流。
- **通知** – 臨時廣播（工作階段新增/刪除）不是
  狀態樹的一部分，並且在重新連線時不會重播。

## 連結生命週期

### 1.初始化

發送 `initialize` **通知**（無 `id` 欄位）：





```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersions": ["0.3.0"],
    "clientId": "<unique-client-id>",
    "initialSubscriptions": ["ahp-root://"]
  }
}
```


然後呼叫 `get_notifications(wait: 2)` 收集 `serverHello` 回應，
其中包括任何初始訂閱的快照。

### 2.訂閱狀態





```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "subscribe",
  "params": { "channel": "ahp-root://" }
}
```


回應包含目前的狀態快照。
訂閱後，後續突變將作為 `action` 通知到達。

### 3. 建立一個工作階段





```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "createSession",
  "params": {
    "session": "<provider>:/<uuid>",
    "provider": "<provider>",
    "model": "<model-id>"
  }
}
```


然後訂閱工作階段 URI。等待 `session/ready` 操作。

### 4.發送訊息（開始一輪）

將 `session/turnStarted` 操作作為 **通知** 分派（即發即棄）：





```json
{
  "jsonrpc": "2.0",
  "method": "dispatchAction",
  "params": {
    "channel": "<provider>:/<uuid>",
    "clientSeq": 1,
    "action": {
      "type": "session/turnStarted",
      "turnId": "<unique-turn-id>",
      "userMessage": { "text": "Hello, world!" }
    }
  }
}
```


然後輪詢 `get_notifications(wait: 2)` 以收集串流媒體 `session/delta`
執行操作，直到您看到 `session/turnComplete`。

### 5. 處理工具呼叫與權限

如果代理呼叫工具，則伺服器發送：

- `session/toolStart` – 工具呼叫開始
- `session/permissionRequest` – 需要使用者批准

解決權限問題：





```json
{
  "jsonrpc": "2.0",
  "method": "dispatchAction",
  "params": {
    "channel": "<provider>:/<uuid>",
    "clientSeq": 2,
    "action": {
      "type": "session/permissionResolved",
      "turnId": "<turn-id>",
      "requestId": "<perm-request-id>",
      "approved": true
    }
  }
}
```


### 6.其他指令

|命令 |目的|
| ---------------- | ------------------------------------------------ |
| `listSessions` |列出所有工作階段摘要 |
| `disposeSession` |拆掉一個工作階段 |
| `resourceRead` |透過 URI 引用讀取內容 |
| `resourceList` |列出目錄條目 |
| `resourceCopy` |複製資源 |
| `resourceDelete` |刪除資源 |
| `resourceMove` |移動/重新命名資源 |
| `resourceWrite` |將內容寫入檔案 |
| `fetchTurns` |取得工作階段 | 的歷史轉捩點

### 7. 重新連線

如果連線斷開，請再次呼叫 `connect` 並傳送 `reconnect` 訊息
而不是 `initialize`：





```json
{
  "jsonrpc": "2.0",
  "method": "reconnect",
  "params": {
    "clientId": "<same-client-id>",
    "lastSeenServerSeq": 42,
    "subscriptions": ["ahp-root://", "<provider>:/<uuid>"]
  }
}
```


## 動作類型參考

### 用戶端-可分派操作

|行動|效果|
| ---------------------------- | ---------------------------------------------------- |
| `session/turnStarted` |用使用者訊息開始新的回合 |
| `session/permissionResolved` |核准或拒絕待處理的工具權限 |
| `session/turnCancelled` |中止正在進行的回合 |
| `session/modelChanged` |為未來的轉變而切換模型 |

### 伺服器發起的操作

|行動|意義|
| ------------------------ | | ---------------------------------- |
| `root/agentsChanged` |可用代理或型號變更 |
| `session/ready` | 工作階段後端已初始化 |
| `session/creationFailed` | 工作階段初始化失敗 |
| `session/delta` | 串流文字內容一圈 |
| `session/toolStart` |代理正在呼叫工具 |
| `session/toolDelta` |串流媒體工具輸出 |
| `session/toolComplete` |工具執行完成 |
| `session/permissionRequest` |工具需要使用者批准|
| `session/turnComplete` |轉完了|
| `session/error` |回合時發生錯誤 |

## 完整文件

有關完整的協定詳細資訊，請參閱此儲存庫中的文件：

- **指南**：`docs/guide/` – 概念概述與演練
  - `getting-started.md` – 端對端範例
  - `state-model.md` – 完整的狀態樹形
  - `actions.md` – 操作如何運作
  - `reconciliation.md` – 預寫入協調演算法
- **規格**：`docs/specification/` – 規範協定規格
  - `transport.md` – 運輸要求
  - `lifecycle.md` – 連結、工作階段和重新連結生命週期
  - `subscriptions.md` – 訂閱機制
  - `versioning.md` – 版本協商
- **參考**：`docs/reference/` – 完整的型別參考
  - `messages.md` – 所有狀態類型
  - `actions.md` – 所有帶有欄位的操作類型
  - `commands.md` – 所有 JSON-RPC 指令
  - `notifications.md` – 所有通知類型
  - `error-codes.md` – 錯誤代碼參考

當您需要精確的欄位名稱、型別形狀或邊緣情況時，請閱讀這些文件
行為。
