# 代理主機協定 — Go 用戶端

[代理主機協定](https://microsoft.github.io/agent-host-protocol/) 的 Go 模組。

本模組分為三個包，鏡像 Rust 用戶端的
三箱分割：

|套件 |用它來 |
| -------- | ---------- |
| [`ahptypes`](./ahptypes) |僅線路協定類型－沒有 I/O，沒有 goroutine。如果您只需要解析或建構 AHP JSON-RPC 訊息，請將其引入。 |
| [`ahp`](./ahp) |透過可插入的 `Transport`、純 reducer和 [`ahp/hosts`](./ahp/hosts) 下的多主機執行時間非同步 `Client`。 |
| [`ahpws`](./ahpws) |基於 [`github.com/coder/websocket`](https://github.com/coder/websocket) 建構的 WebSocket 傳輸。 |

## 安裝





```bash
go get github.com/microsoft/agent-host-protocol/clients/go@latest
```


然後匯入您需要的套件：





```go
import (
    "github.com/microsoft/agent-host-protocol/clients/go/ahp"
    "github.com/microsoft/agent-host-protocol/clients/go/ahptypes"
    "github.com/microsoft/agent-host-protocol/clients/go/ahpws"
)
```


## 快速入門（WebSocket）





```go
ctx := context.Background()

transport, err := ahpws.Connect(ctx, "ws://localhost:12345")
if err != nil {
    log.Fatal(err)
}

client, err := ahp.Connect(ctx, transport, ahp.DefaultConfig())
if err != nil {
    log.Fatal(err)
}
defer client.Shutdown(ctx)

if _, err := client.Initialize(ctx, "my-client", ahptypes.SupportedProtocolVersions(), nil); err != nil {
    log.Fatal(err)
}

snap, sub, err := client.Subscribe(ctx, "ahp-session:/s1")
if err != nil {
    log.Fatal(err)
}
_ = snap

for evt := range sub.Events() {
    if action, ok := evt.(ahp.SubscriptionEventAction); ok {
        fmt.Printf("seq=%d action=%T\n", action.Envelope.ServerSeq, action.Envelope.Action.Value)
    }
}
```


## 程式碼生成

`ahptypes/*.go` 的內容（`common.go` 除外）是自動產生的
來自 `../../types/` 中的 TypeScript 定義。協定更改後重新生成：





```bash
npm run generate:go        # from the repo root
```


CI 驗證提交的生成檔案與生成器輸出匹配，並且
漂移失敗。

## 釋放

請參閱 [`../../RELEASING.md`](../../RELEASING.md) 以了解完整的發布流程。
摘要，範圍為 Go：

1. 修改 `clients/go/VERSION` 中的裸語意版本。
2. 執行 `npm run generate:metadata` 並提交 `clients/go/release-metadata.json`。
3. 旋轉`clients/go/CHANGELOG.md` 的`## [Unreleased]` 部分。
4. 合併到`main`。
5. 使用模組路徑前綴 Go 標記合併提交
   子模組發佈：`git tag clients/go/v0.X.Y && git push origin clients/go/v0.X.Y`。

Go模組代理自動索引標記版本；不
需要註冊表推送步驟。

## 授權

MIT－參見[`../../LICENSE`](../../LICENSE)。