# 連結生命週期

連結生命週期定義了 AHP、用戶端和伺服器如何建立、復原和拆除傳輸連線。每個通道的生命週期（工作階段建立、終端機建立等）位於各自的通道頁面中 - 請參閱[根通道](/specification/root-channel)、[工作階段通道](/specification/session-channel) 和 [終端機通道](/specification/terminal-channel)。

## 連線握手

用戶端透過 `initialize` **請求** 啟動連線。用戶端提供了它可以使用的協定版本清單；伺服器選擇一個並以協商版本和初始狀態快照進行回應：





```
1. Client → Server:  initialize(protocolVersions[], clientId, clientInfo?, initialSubscriptions?, locale?)
2. Server → Client:  { protocolVersion, serverSeq, serverInfo?, snapshots[], defaultDirectory? }
```


### 初始化 (用戶端 → 伺服器)

`initialize` 是一個 JSON-RPC **請求** — 伺服器必須回應結果或錯誤。





```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "channel": "ahp-root://",
    "protocolVersions": ["0.3.0"],
    "clientId": "client-abc",
    "clientInfo": { "name": "acme-ide", "version": "2.5.0" },
    "initialSubscriptions": ["ahp-root://"],
    "locale": "en-US"
  }
}
```


`protocolVersions` 依照從最優選到最不優選的順序排列。伺服器選擇一個專案並將其傳回為 `InitializeResult.protocolVersion`。如果伺服器不能說出任何提供的版本，它必須傳回 [`UnsupportedProtocolVersion`](/reference/error-codes) (`-32005`) 而不是結果。有關協商規則，請參閱[版本控制](/specification/versioning)。

`initialSubscriptions` 允許用戶端在與握手相同的往返中訂閱通道 - 通常是 `ahp-root://` 加上任何先前打開的工作階段 URI。

`locale` 是可選的 IETF BCP 47 語言標記（例如 `"en-US"`、`"ja"`），指示用戶端的首選語言。伺服器應該使用它來本地化面向使用者的字串，例如確認選項標籤。

`clientInfo` 可選地識別用戶端 *實作* — 其 `name` 以及可選的 `version` 並顯示 `title`。它與 `clientId` 不同，後者是用於重新連線的不透明每個連線標識符。請參閱下面的[實作標識](#implementation-identity)。

### 初始化回應 (伺服器 → 用戶端)





```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "0.3.0",
    "serverSeq": 42,
    "serverInfo": { "name": "acme-agent-host", "version": "1.4.2" },
    "defaultDirectory": "file:///home/testuser",
    "snapshots": [
      {
        "resource": "ahp-root://",
        "state": { "agents": [...] },
        "fromSeq": 42
      }
    ]
  }
}
```


`protocolVersion` 是伺服器從用戶端的 `protocolVersions` 清單中選取的版本。兩個對等方必須在連線的其餘部分使用此版本。

如果存在，`defaultDirectory` 將為遠端檔案系統瀏覽提供一個伺服器本機起始位置。

如果伺服器由於任何其他原因無法接受連線，則它必須傳回 JSON-RPC 錯誤。請參閱[錯誤代碼](/reference/error-codes) 以了解已定義的代碼。

### 實作身份

握手雙方可以宣傳其背後的*實作*：透過 `InitializeParams.clientInfo` 的用戶端和透過 `InitializeResult.serverInfo` 的伺服器。每個都是一個 `Implementation`（請參閱 [`initialize`](/reference/common#initialize) 參考），攜帶必需的 `name` 以及可選的 `version` 和顯示 `title`。這鏡像了 LSP 的 `clientInfo`/`serverInfo` 和 MCP 的 `Implementation`。

實作標識**僅供參考** - 用於日誌記錄、遙測、關於/狀態可供性，以及作為最後手段的針對特定錯誤構建的已知問題解決方法。它回答“另一端是什麼軟體以及哪個版本”，這與協商的 `protocolVersion` 和命名代理角色的 [`AgentInfo`](/reference/root#agentinfo) 不同。

它**不是**一種特徵檢測機制。功能可用性取決於功能模型（`ClientCapabilities` 和各種 `*.capabilities` 宣告）；用戶端和伺服器不應在解析 `version` 時控制協定行為。這兩個欄位都是可選的並且純粹是附加的：省略自己資訊或忽略另一方資訊的對等方保持完全可互通。

## 驗證

代理人可以在其 [`AgentInfo`](/reference/root#agentinfo) 中宣告 `protectedResources`。在與此類代理程式支援的工作階段互動之前，用戶端應透過從聲明的授權伺服器取得承載令牌並透過 [`authenticate`](/reference/common#authenticate) 指令推送它來進行驗證。

如果用戶端嘗試透過需要驗證且尚未提供令牌的代理程式建立或使用工作階段，則伺服器應傳回錯誤代碼 `-32007` (`AuthRequired`)，並在錯誤的 `data` 欄位中傳回所需的資源元資料。

有關完整的規格，請參閱[驗證](/specification/authentication)。

## 重新連線

如果傳輸連線斷開，用戶端會重新連線並傳送 `reconnect` **請求**：





```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "reconnect",
  "params": {
    "channel": "ahp-root://",
    "clientId": "client-abc",
    "lastSeenServerSeq": 42,
    "subscriptions": ["ahp-root://", "ahp-session:/<uuid>"]
  }
}
```


在傳回之前，伺服器必須在回應中包含所有重播的資料。如果伺服器可以從請求的序列重播，它將傳回錯過的動作信封：





```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "type": "replay",
    "actions": [
      { "channel": "ahp-chat:/<cid>", "action": { "type": "chat/delta", ... }, "serverSeq": 43 },
      { "channel": "ahp-chat:/<cid>", "action": { "type": "chat/delta", ... }, "serverSeq": 44 }
    ],
    "missing": ["ahp-session:/<disposed-uuid>"]
  }
}
```


`missing` 陣列列出了伺服器無法恢復的請求中的訂閱 - 例如，工作階段或已處置的終端，或不再允許用戶端觀察的資源。用戶端應將它們從本機訂閱集中刪除。

如果間隙超出重播緩衝區，則伺服器會傳送新快照：





```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "type": "snapshot",
    "snapshots": [
      { "resource": "ahp-root://", "state": { ... }, "fromSeq": 50 },
      { "resource": "ahp-session:/<uuid>", "state": { ... }, "fromSeq": 50 }
    ]
  }
}
```


協定通知**不**重播 - 用戶端應透過 [`listSessions`](/reference/root#listsessions) 重新取得工作階段清單。無狀態通道只需重新訂閱即可；錯過的訊息將被丟棄。

## 意外斷開

如果伺服器程序意外終止：

- 主機環境應該將伺服器視為已終止。
- 主機可以嘗試重新啟動伺服器（例如，透過自動重新啟動進行崩潰復原）。
- 正在進行的輪次應被視為失敗。
- 重新啟動時，用戶端使用上面的重新連線流程重新連線。