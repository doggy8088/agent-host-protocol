# `mcp://` 通道

`mcp://` 通道是一個可選的側​​通道，允許 AHP 用戶端針對代理主機已在運行的 MCP 伺服器發起 [MCP](https://modelcontextprotocol.io/) 流量的受限子集。這是每當用戶端需要與 MCP 通話時 AHP 所使用的線路格式，但僅限主機明確選擇公開的 MCP 數量。

通道本身是通用的。它實際提供的方法和通知集完全取決於它所掛起的自訂的功能廣告。目前，唯一的此類廣告是 [`AhpMcpUiHostCapabilities`](/reference/session#ahpmcpuihostcapabilities)（由 [MCP Apps](/guide/mcp#mcp-apps) 使用），但將來可能會新增其他特定於網域的功能集，而無需更改通道本身。

## 線路格式

此通道逐字敘述 [MCP](https://modelcontextprotocol.io/specification) — JSON-RPC 2.0 請求、回應和通知，完全按照上游 MCP 規格的定義。 AHP 不會重新定義請求/回應形狀或通知負載；有關這些資訊，請參閱 MCP。

唯一的 AHP 等級新增是每個 AHP 訊息共享的路由信封：每個請求、回應和通知都攜帶一個頂級 `channel: URI`，其值是在所屬自訂上公開的 [通道 URI](#channel-uri)。接收方透過 `channel` 路由訊息的方式與路由任何其他 AHP 流量的方式完全相同 - 不需要每個方法的調度邏輯。

由於通道搭載現有的 AHP 傳輸，而不是打開到伺服器的新 MCP 連線，因此當用戶端打開通道時，上游伺服器已經超過了 MCP `initialize`（或不是 `ready` 並且通道不可用）； MCP `initialize`（或不是 `ready` 並且通道不可用）；用戶端。結果是：

- MCP `initialize` / `initialized` 握手**不**透過通道進行。
- MCP 中帶有狀態且已由 AHP 鏡像的方法（例如工具執行生命週期，工作階段狀態）**不**透過通道提供服務 — 用戶端使用對應的 AHP 運算和狀態。
- 僅提供通道所屬自訂上的功能廣告明確啟用的方法。其他一切都必須被主人拒絕。

主持人為通道服務；用戶端在其上發起流量。

## 協商服務面

用戶端可以發送的方法集（以及主機承諾轉發的通知集）是附加到通道所屬定制的每個功能廣告的**聯集**。每個功能集涵蓋一個特定的功能領域；需要比一組功能集提供的更大表面積的伺服器會通告其他功能集。

目前唯一定義的功能集是 [`AhpMcpUiHostCapabilities`](/reference/session#ahpmcpuihostcapabilities)，它涵蓋了 MCP 應用程式的需求：

|能力旗幟|所提供的方法 (用戶端 → 主機 → 伺服器) |轉送的通知 (伺服器 → 主機 → 用戶端) |
|---|---|---|
| `serverTools` | `tools/list`，`tools/call` | `notifications/tools/list_changed` *（當 `listChanged: true` 時）* |
| `serverResources` | `resources/list`，`resources/templates/list`，`resources/read` | `notifications/resources/list_changed` *（當 `listChanged: true` 時）* |
| `logging` | `logging/setLevel`，`notifications/message` | — |
| `sampling` | `sampling/createMessage` | — |

每個公佈的功能集之外的方法必須被主機拒絕，並顯示 JSON-RPC `-32601` *未找到方法*。用戶端不應在廣告之外進行推測 — 功能集是所提供服務的唯一真實來源。

主機如何滿足所提供的方法（將其代理到 MCP 伺服器的上游，在代理線束內處理它，或某種混合）是一個實作細節，此處未指定。廣告保證方法是**提供**的，而不是如何提供的。

## 通道 URI

通道 URI 在擁有它的自訂上公開。今天這意味著 [`McpServerCustomization.channel`](/reference/session#mcpservercustomization);未來保證側通道的自訂可能會遵循相同的模式。

URI 本身對於用戶端是不透明的。其方案為`mcp://`；它的路徑和權限是主機定義的。

- 工作階段中的每個自訂最多有一個通道。
- 主機只能在擁有的自訂位於可用執行時間狀態中時公開 `channel`（對於 `McpServerCustomization` 來說是 `state.kind === 'ready'`）。當該條件不再成立時，主機可以透過自訂的更新操作清除 `channel`。用戶端當通道不存在時，應視為不可用。
- URI 應在定制的生命週期內保持穩定，但主機可以更改它（例如重新啟動後）。每當更新自訂時，用戶端必須重新讀取 `channel`。
- 只有當擁有的自訂通告至少一種需要該通道的功能集時，該通道才會出現。沒有此類廣告的自訂不需要旁路 - 它們的狀態已經被 AHP 的正常流程覆蓋。

## 後續步驟

- [MCP 伺服器](/guide/mcp) — 通道掛起的自訂如何運作。
- [工作階段通道參考](/reference/session#ahpmcpuihostcapabilities) — `AhpMcpUiHostCapabilities` 的型別定義（在此通道上提供的第一個功能集）。