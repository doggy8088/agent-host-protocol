# 入門

本指南逐步介紹使用代理主機協定的基本用戶端-伺服器交互作用。

## 每個訊息的形狀

在完成握手之前，請注意貫穿下面每個範例的一個結構規則：**每個指令和每個通知的參數都帶有頂級 `channel: URI`**。通道範圍的訊息將其設定為目標通道（例如 `ahp-session:/<uuid>`）；連線級命令將其設定為 `'ahp-root://'`。伺服器、用戶端和中間代理程式透過 `(method, params.channel)` 分派每個訊息。請參閱[通道和訂閱](/specification/subscriptions) 以了解完整模型。

## 連線握手

每個 AHP 工作階段都以透過傳輸（WebSocket、MessagePort 等）的 JSON-RPC 握手開始：





```
1. Client → Server:  initialize(channel: 'ahp-root://', protocolVersions[], clientId, initialSubscriptions?)
2. Server → Client:  { protocolVersion, serverSeq, snapshots[], defaultDirectory? }
```


`initialSubscriptions` 欄位允許用戶端在與握手相同的往返過程中訂閱根狀態和任何先前開啟的工作階段。伺服器回傳回應中每個的快照。可選的 `defaultDirectory` 欄位為用戶端提供了遠端檔案系統瀏覽的合理起點。

## 訂閱狀態

連線後，用戶端訂閱 URI 標識的通道。根目錄狀態始終在 `ahp-root://` 處可用：





```jsonc
// Client → Server (request)
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "subscribe",
  "params": { "channel": "ahp-root://" }
}

// Server → Client (response)
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "snapshot": {
      "resource": "ahp-root://",
      "state": {
        "agents": [
          {
            "provider": "copilot",
            "displayName": "Copilot",
            "description": "GitHub Copilot agent",
            "models": [
              { "id": "gpt-4o", "name": "GPT-4o", "provider": "copilot" }
            ]
          }
        ]
      },
      "fromSeq": 5
    }
  }
}
```


訂閱後，用戶端透過伺服器推播的通知接收該通道範圍內的所有後續操作。

## 建立一個工作階段

工作階段建立使用指令式 RPC 指令：





```jsonc
// 1. Client picks a session URI
// 2. Client sends createSession command
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "createSession",
  "params": {
    "channel": "ahp-session:/<uuid>",
    "provider": "copilot"
  }
}

// 3. Client subscribes to the session URI
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "subscribe",
  "params": { "channel": "ahp-session:/<uuid>" }
}
```


初始快照有`lifecycle: 'creating'`。伺服器非同步初始化代理後端，然後分派 `session/ready` 或 `session/creationFailed` 操作。就緒的工作階段從預設聊天開始：其 `ahp-chat:/<cid>` URI 在 `SessionState.defaultChat` 中攜帶，並在工作階段的 `chats` 目錄中列出。每個對話狀態 - 回合、串流回應和工具呼叫 - 存在於該聊天自己的通道上，而不是工作階段通道上。請參閱[聊天通道規格](/specification/chat-channel) 以了解完整的每聊天模型。

## 發送訊息

回合發生在**聊天通道**。訂閱工作階段的預設聊天的方式與訂閱工作階段的方式相同：





```jsonc
// Client → Server (request): subscribe to the session's default chat
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "subscribe",
  "params": { "channel": "ahp-chat:/<cid>" }
}
```


若要開始回合，請在聊天通道上調度 `chat/turnStarted` 操作。這是一個**預寫**操作 - 用戶端樂觀地將其應用到其本地聊天狀態：





```jsonc
// Client → Server (notification, fire-and-forget)
{
  "jsonrpc": "2.0",
  "method": "dispatchAction",
  "params": {
    "channel": "ahp-chat:/<cid>",
    "clientSeq": 1,
    "action": {
      "type": "chat/turnStarted",
      "turnId": "turn-1",
      "message": { "text": "Explain this code", "origin": { "kind": "user" } }
    }
  }
}
```


伺服器開始代理處理並在同一聊天通道上流回操作：





```jsonc
// Server → Client: streaming text delta
{ "method": "action", "params": {
  "channel": "ahp-chat:/<cid>",
  "action": { "type": "chat/delta", "turnId": "turn-1", "partId": "p1", "content": "This code " },
  "serverSeq": 6
}}

// Server → Client: more streaming text
{ "method": "action", "params": {
  "channel": "ahp-chat:/<cid>",
  "action": { "type": "chat/delta", "turnId": "turn-1", "partId": "p1", "content": "defines a function..." },
  "serverSeq": 7
}}

// Server → Client: turn complete
{ "method": "action", "params": {
  "channel": "ahp-chat:/<cid>",
  "action": { "type": "chat/turnComplete", "turnId": "turn-1" },
  "serverSeq": 8
}}
```


## 處理工具呼叫

當代理程式呼叫工具時，伺服器在聊天通道上發出一系列操作，對工具呼叫的生命週期進行建模（有關完整的狀態機器，請參閱 [狀態模型 — 工具呼叫生命週期](/guide/state-model#tool-call-lifecycle)）：

1. `chat/toolCallStart` — 一個新的工具呼叫開始。
2. `chat/toolCallDelta` — 部分參數流入。
3. `chat/toolCallReady` — 參數完成。如果該工具需要使用者確認，則呼叫將轉換為 `pending-confirmation`；否則直接進入`running`。
4. `chat/toolCallComplete` — 工具執行完成。

用戶端透過分派 `chat/toolCallConfirmed` 解析 `pending-confirmation` 工具呼叫：





```jsonc
// Client → Server: approve the tool call
{
  "jsonrpc": "2.0",
  "method": "dispatchAction",
  "params": {
    "channel": "ahp-chat:/<cid>",
    "clientSeq": 2,
    "action": {
      "type": "chat/toolCallConfirmed",
      "turnId": "turn-1",
      "toolCallId": "tc-1",
      "approved": true,
      "confirmed": "user-action"
    }
  }
}
```


要拒絕，請使用 `approved: false` 和 `reason`（`"denied"` 或 `"skipped"`）調度相同的操作。

## 後續步驟

- [狀態模型](/guide/state-model) — 完整的狀態樹狀結構。
- [訊息參考](/reference/messages) — 每個 JSON-RPC 方法的索引，連結到記錄它的通道。