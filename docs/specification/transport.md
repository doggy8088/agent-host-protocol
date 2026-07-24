# 運輸

與[語言伺服器協定](https://microsoft.github.io/language-server-protocol/) 和[偵錯適配器協定](https://microsoft.github.io/debug-adapter-protocol/) 類似，AHP 目前沒有規定特定的傳輸。任何提供可靠、有序、雙向訊息流的機制都可以承載 AHP 訊息。

**在** AHP 協定開始之前選擇傳輸；它不是在協定本身內協商的。用戶端和伺服器就帶外傳輸達成一致，並且伺服器負責接受該傳輸上的連線。

## 要求

合規的運輸必須：

1. **按順序**傳遞訊息。
2. **可靠**地傳遞訊息（無靜默丟棄）。
3.支援**雙向**通信。
4. 傳遞**完整**訊息（無部分傳遞）。

任何滿足這些要求的機制都是可以接受的——WebSocket、帶有幀層的 TCP、行程內訊息通道或其他任何機制。

## 常見交通

雖然 AHP 不強制要求傳輸，但 **WebSocket** 是遠端和跨行程連線的最常見選擇，也是 VS Code 實作所使用的。

使用WebSocket時：

- 伺服器充當 WebSocket 伺服器。
- 訊息作為 WebSocket **文字** 訊框發送。
- 每個文字框架僅包含一個完整的 JSON-RPC 訊息。

## 保持活動狀態

AHP 定義了一個協定級 [`ping`](/reference/common#ping) 指令，用戶端可使用該指令來驗證連線是否處於活動狀態並防止其被空閒逾時中介（代理程式、負載平衡器等）關閉。 `ping` 在任一方向上均不攜帶有效負載；回應本身就是訊號，無論用戶端是否已完成 `initialize` 或持有任何訂閱，伺服器都必須回應。

實作還可以依賴可用的傳輸級活躍機制（例如，WebSocket ping/pong 幀）。 ping 間隔和逾時是特定於實作的。

## 驗證

對 AHP 端點的存取本身就是傳輸層的問題，並且超出了 AHP 線路協定的範圍。需要控制連線的實作應該在傳輸握手期間執行此操作（例如，對於透過查詢參數、標頭或 HTTP 升級請求的 WebSocket），在發送 AHP `initialize` 請求之前。

連線建立後，AHP 也會提供協定級 [`authenticate`](/reference/common#authenticate) 指令。實作者可以使用它來管理對各個代理人及其公開的其他受保護資源（例如 MCP 伺服器或其他支援服務）的權利，而與傳輸無關。代理程式透過 [`AgentInfo`](/reference/root#agentinfo) 上的 `protectedResources` 欄位公佈其要求，並根據需要為每個資源推送承載代幣。請參閱[身份驗證](/specification/authentication) 以了解完整流程。