# 規格概述

本節包含代理主機協定 (AHP) 的正式規格。它定義了合規實作的規範要求。

## 地位

::: 警告草案
此規格是一個工作草案，正在積極開發中。預計線路類型、操作和狀態形狀將發生重大變化。在協定達到生產狀態之前，不要依賴向後相容性。
:::

## 慣例

此規格中的關鍵字「MUST」、「MUST NOT」、「REQUIRED」、「SHALL」、「SHALL NOT」、「SHOULD」、「SHOULD NOT」、「RECOMMENDED」、「MAY」和「OPTIONAL」應依照 [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) 中的描述進行解釋。

## 協定版本

協定版本為 [SemVer](https://semver.org) `MAJOR.MINOR.PATCH` 字串；請參閱 [GitHub 版本](https://github.com/microsoft/agent-host-protocol/releases) 頁面以了解目前發佈的版本。對等方在初始化時協商共享版本：用戶端提供 `InitializeParams.protocolVersions`（一個陣列，最優先的第一個），而伺服器選擇一個並將其作為 `InitializeResult.protocolVersion` 傳回。

有關完整版本策略，請參閱[版本控制](/specification/versioning)。

## 基礎協定

AHP 使用 [JSON-RPC 2.0](https://www.jsonrpc.org/specification) 作為其訊息框架。此協定與傳輸無關－任何可靠、有序、雙向的訊息流都可以攜帶 AHP 訊息。請參閱[交通](/specification/transport)。

### 通道是路由的關鍵

AHP 中的每個推送式互動都限定在一個**通道** - URI 標識的可訂閱資源（根目錄、工作階段、終端機、變更集等）。線路協定一致地表明了這一點：

- **每個指令的 `params` 都帶有一個頂層 `channel: URI`**，在每個指令參數型別擴充的 `BaseParams` 介面上宣告。通道範圍的指令（`createSession`、`disposeSession`、`fetchTurns`、`completions`、...）傳遞目標 URI；連線等級指令（`initialize`、`ping`、`listSessions`、`resource*` 指令、`authenticate`）將會 `channel` 縮小為文字 `'ahp-root://'`。
- **每個通知的 `params` 都帶有頂級 `channel: URI`**，包括 `action` 信封、`dispatchAction`、`unsubscribe` 和每個協定通知（`root/sessionAdded`、`auth/required`，...）。

因此，實作可以透過檢查 `(method, params.channel)` 來分派任何傳入訊息，而無需按方法反序列化。此不變數在編譯時在 `types/version/message-checks.ts` 中進行驗證。有關 URI 方案、訂閱機制和每個方法表，請參閱[通道和訂閱](/specification/subscriptions)。

### 訊息類別

|方向 | 型別 |範例 |
|---|---|---|
| 用戶端 → 伺服器（通知）|即發即忘 | `unsubscribe`，`dispatchAction` |
| 用戶端 → 伺服器（請求）|期待回應 | | `initialize`、`reconnect`、`subscribe`、`createSession`、`disposeSession`、`listSessions`、`fetchTurns`、`resourceRead`、`resourceWrite`、`resourceList`、`resourceCopy`、`resourceDelete`、`resourceMove`、`resourceResolve`、`resourceMkdir`、`resourceMove` |
| 伺服器 → 用戶端（請求）|對稱反向；期待回應 |任何 `resource*` 請求（`resourceRead`、`resourceWrite`、`resourceList`、`resourceCopy`、`resourceDelete`、`resourceMove`、`resourceResolve`、`resourceMkdir`、`resourceRequest`）加上 {c6262
| 伺服器 → 用戶端（通知）|推| `action`、`root/sessionAdded`、`root/sessionRemoved`、`root/sessionSummaryChanged`、`auth/required` |
| 伺服器 → 用戶端（回應）|由 `id` | 關聯成功結果或 JSON-RPC 錯誤 |

### 請求

JSON-RPC 請求具有 `id` 和 `method`。伺服器必須只使用一個攜帶相同 `id` 的回應進行回應。





```json
{ "jsonrpc": "2.0", "id": 1, "method": "subscribe", "params": { "channel": "ahp-root://" } }
```


### 回應

成功響應：





```json
{ "jsonrpc": "2.0", "id": 1, "result": { "snapshot": { "resource": "...", "state": { ... }, "fromSeq": 5 } } }
```


錯誤回應：





```json
{ "jsonrpc": "2.0", "id": 1, "error": { "code": -32603, "message": "No agent for provider" } }
```


### 通知

JSON-RPC 通知有 `method`，但沒有 `id`。它一定不能收到回應。





```json
{ "jsonrpc": "2.0", "method": "action", "params": { "channel": "ahp-session:/<uuid>", "action": { ... }, "serverSeq": 6 } }
```


## 結構

規格圍繞 AHP 公開的 **通道** 進行組織 - 每個通道頁面都描述其 URI、狀態、生命週期、操作和通知。橫切關注點（傳輸、身份驗證、版本控制）有自己的頁面。

- **[傳送](/specification/transport)** — 訊息如何在用戶端和伺服器之間傳送。
- **[生命週期](/specification/lifecycle)** — 連線握手、重新連線和斷開連線。
- **[通道與訂閱](/specification/subscriptions)** — 通道模型、通用 `channel: URI` 路由金鑰以及每個通道型別共用的訂閱機制。
- **[驗證](/specification/authentication)** — RFC 9728 / RFC 6750 驗證流程。
- **[根通道](/specification/root-channel)** — `ahp-root://` — 代理程式、終端目錄、主機配置、工作階段目錄事件。
- **[工作階段通道](/specification/session-channel)** — `ahp-session:/<uuid>` — 每工作階段狀態：`chats` 目錄、預設聊天、活動用戶端、自訂、變更集和聚合狀態。
- **[聊天通道](/specification/chat-channel)** — `ahp-chat:/<cid>` — 每個聊天對話狀態：回合、串流、工具呼叫、待處理訊息和輸入請求。
- **[終端機 Channel](/specification/terminal-channel)** — 每個終端機 pty 狀態、資料流、宣告、指令偵測。- **[遙測通道](/specification/telemetry-channel)** — `ahp-otlp:` — 代理主機發出的 OpenTelemetry 日誌、追蹤和指標。
- **[版本控制](/specification/versioning)** — 協定版本協商與相容性。
- **[常見類型](/reference/common)** — 橫切類型、基本指令/通知形狀和 JSON-RPC 線路類型。
- **[根通道參考](/reference/root)** — `RootState`、根操作、根命令和根通知。
- **[工作階段通道參考](/reference/session)** — `SessionState`、工作階段運算與工作階段指令。
- **[聊天通道參考](/reference/chat)** — `ChatState`、聊天操作和聊天指令。
- **[終端機通道參考](/reference/terminal)** — `TerminalState`、終端機操作與終端機指令。
- **[變更集通道參考](/reference/changeset)** — `ChangesetState`、變更集操作與變更集指令。
- **[Messages](/reference/messages)** — 每個 JSON-RPC 方法的索引，以及記錄該方法的通道頁面的連結。- **[錯誤代碼](/reference/error-codes)** — 應用程式特定的錯誤代碼。

## JSON 架構

針對所有協定類型發布了機器可讀的 [JSON 架構 (2020-12)](https://json-schema.org/draft/2020-12/schema) 定義：

|架構|描述 |
|---|---|
| [狀態.schema.json](/schema/state.schema.json) | 狀態類型 |
| [actions.schema.json](/schema/actions.schema.json) |動作類型 |
| [commands.schema.json](/schema/commands.schema.json) |指令參數及結果|
| [notifications.schema.json](/schema/notifications.schema.json) |通知類型 |
| [errors.schema.json](/schema/errors.schema.json) |錯誤代碼 |

這些架構是根據 TypeScript 型別定義產生的，可用於驗證、程式碼產生或編輯器支援。