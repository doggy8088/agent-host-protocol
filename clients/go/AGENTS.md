# Go 用戶端 — 代理指南

## 概述

此目錄包含代理主機協定的 **Go** 模組
(AHP)，發佈為
`github.com/microsoft/agent-host-protocol/clients/go`。

本模組以 Go 1.22+ 為目標，並分為三個鏡像包
Rust 用戶端的三箱分割：

- `ahptypes/` — 僅產生線路類型，無 I/O。
- `ahp/` — 非同步 `Client`、reducer 和可插入 `Transport`。子
  包 `ahp/hosts/` 攜帶多主機運行時。
- `ahpws/` — 基於 `github.com/coder/websocket` 建構的 WebSocket 傳輸。

## 程式碼生成

`ahptypes/` 下的 Go 檔案（`common.go` 和
`discriminated_unions.go`) 是從 TypeScript **自動產生**
`types/` 中的定義。不要直接編輯這些文件。產生
文件已提交給原始碼管理，因此該套件可透過以下方式使用
沒有程式碼產生工具鏈的 Go 模組代理程式。

協定更改後重新生成：





```bash
npm run generate:go    # runs: tsx scripts/generate.ts --go
```


產生的檔案（全部後綴為`.generated.go`）：`version`、`state`、
`actions`、`commands`、`notifications`、`messages`、`errors`。的
生成器在其輸出上運行 `gofmt -w`。

CI 驗證提交的生成文件與輸出匹配
`npm run generate:go` 並在漂移時失敗。

## 型別映射（TS → Go）

| TypeScript | Go |
| ------------------------ | | ------------------------------------------------------------------------------------------------ |
| `string` | `string` |
| `number` | `int64`（TS 合約：64 位整數）|
| `number` 與 `@format float` | `float64` |
| `boolean` | `bool` |
| `unknown` / `object` | `unknown` / `object` | `json.RawMessage` |
| `T \| null` | `*T` |
|可選欄位 | `*T` + `json:"name,omitempty"` || `T[]` / `Array<T>` | `T[]` / `Array<T>` | `[]T` |
| `Record<string, T>` | `map[string]T` |
| `Partial<T>` | `PartialT` 結構體，每個欄位都是指標 |
|字串列舉 |輸入 `string` + 命名常數 |
|位元集列舉 |輸入的 `uint32` + 標誌常數 + `Has`/`Or` 幫助程式 |
|介面結構|帶有 JSON 標籤的 `struct` |
|判別聯集|包裝結構 + 標記介面 + 自訂 `MarshalJSON`/`UnmarshalJSON` |
| `URI` | `type URI = string` |
| `StringOrMarkdown` |有自訂（un）marshal 的結構 ||遞歸結構|遞歸位置中的指標欄位 |
| `_meta` 欄位 | `Meta map[string]json.RawMessage` + `json:"_meta,omitempty"` |
| `snake_case` 線路欄位 | PascalCase Go 欄位 + `json:"snake_case"` |

### 判別聯集

每個 TS 判別聯集都作為具體的包裝結構發出，因此
它可以直接用作 Go 欄位型別 - `[]ResponsePart`，
`StateAction` 等 - 消費者無須呼叫自訂
每個使用站點的解組器：





```go
type ResponsePart struct {
    Value isResponsePart  // marker interface, one impl per variant
}

func (r *ResponsePart) UnmarshalJSON(b []byte) error { /* dispatch on kind */ }
func (r ResponsePart) MarshalJSON() ([]byte, error)  { return json.Marshal(r.Value) }
```


未知變體表面為 `*VariantNameUnknown{ Raw json.RawMessage }`
所以未來的伺服器可以說一种未知的語言而不會破壞
現有的用戶端。reducer將它們視為無操作。

### 位元集列舉

`SessionStatus` 是目前唯一的位元集列舉。它被發射為
`type SessionStatus uint32` 帶有命名標誌常數加上
`(SessionStatus).Has(SessionStatus) bool` 和
`(SessionStatus).Or(SessionStatus) SessionStatus` 助手。未知
未來的比特自然會往返。

### `omitempty` 政策

只有**可選指標欄位**攜帶`,omitempty`。必填欄位
（包括所需的切片、映射和標量）不得攜帶
`omitempty` — Go 的 omitempty 省略空切片、零整數和 `false`，
這會破壞線路奇偶校驗（例如 `ActionEnvelope` 上的 `serverSeq: 0`，
需要空 `responseParts: []` 陣列）。

## 庫結構

- `ahptypes/common.go` — 手寫原語 (`URI`, `StringOrMarkdown`,
  `JSONObject`，標記介面）。
- `ahptypes/*.generated.go` — 協定規格中的線路類型。
- `ahp/client.go` — 非同步 `Client`，請求關聯，訂閱
  扇出，`dispatchAction` 預寫。
- `ahp/transport.go` — `Transport` 接口，`TransportMessage`
  變體，`BoxedTransport` 用於異質儲存。
- `ahp/reducers.go` — 純 `Apply*` reducer移植自
  `types/channels-*/reducer.ts`。每個接受 `state *State` 和一個
  操作並傳回 `ReduceOutcome`。
- `ahp/error.go` — `ClientError`、`TransportError` 類型實作
  Go的`error`介面；使用 `errors.Is` / `errors.As` 來區分。
- `ahp/hosts/` — `MultiHostClient`，`HostHandle`，`HostClientHandle`，
  `ReconnectPolicy`、`ClientIDStore` 等
- `ahpws/transport.go` — WebSocket 傳輸，包裝
  `github.com/coder/websocket`連線。

## reducer

reducer會就地改變 `*State` 以匹配 Rust 用戶端的
`apply_action_to_*` 語意。相同的裝置來自
`types/test-cases/reducers/*.json` 透過以下方式鍛鍊 Go reducer
`ahp/reducers_fixture_test.go` 因此強制執行跨語言奇偶校驗。

## 標籤命名空間（發佈）

Go 要求子模組版本的標籤以前綴
儲存庫內的子模組目錄。所以發布標籤是
**`clients/go/vX.Y.Z`** （不是 `go/vX.Y.Z` 也不是裸露的 `vX.Y.Z`
為Swift保留）。 Go 模組代理程式將擷取標籤
自動。

## 超出範圍（故意）

目前的 Go 模組提供 ** 線路類型、reducer、單線和多線
主機用戶端運行時和 WebSocket 傳輸**。以下是
延後：

- 除了小 `examples/` 片段之外的範例應用程式。
- Kotlin 多平台風格的跨目標建構。