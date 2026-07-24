# ahp-ws

[代理主機協定 (AHP)](https://github.com/microsoft/agent-host-protocol) Rust SDK 的 WebSocket 傳送。

[![crates.io](https://img.shields.io/crates/v/ahp-ws.svg)](https://crates.io/crates/ahp-ws)
[![docs.rs](https://img.shields.io/docsrs/ahp-ws)](https://docs.rs/ahp-ws)

使用 [`tokio-tungstenite`](https://crates.io/crates/tokio-tungstenite) 實作 [`ahp::Transport`](https://docs.rs/ahp/latest/ahp/transport/trait.Transport.html)，同時支援 `ws://` 和 `wss://`。

## 用法





```toml
[dependencies]
ahp = "0.1"
ahp-ws = "0.1"
tokio = { version = "1", features = ["full"] }
```







```rust
use ahp::{Client, ClientConfig, SubscriptionEvent};
use ahp_ws::WebSocketTransport;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let transport = WebSocketTransport::connect("ws://localhost:12345").await?;
    let client = Client::connect(transport, ClientConfig::default()).await?;

    client.initialize("my-client".into(), vec![ahp_types::PROTOCOL_VERSION.to_string()], vec![ahp_types::ROOT_RESOURCE_URI.to_string()]).await?;

    let mut sub = client.attach_subscription(ahp_types::ROOT_RESOURCE_URI).await;
    while let Some(SubscriptionEvent::Action(a)) = sub.recv().await {
        println!("{:?}", a.action);
    }

    client.shutdown().await;
    Ok(())
}
```


## API

- **[`WebSocketTransport::connect(url)`](https://docs.rs/ahp-ws/latest/ahp_ws/struct.WebSocketTransport.html#method.connect)** — 開啟一個新連線
- **[`WebSocketTransport::from_stream(stream)`](https://docs.rs/ahp-ws/latest/ahp_ws/struct.WebSocketTransport.html#method.from_stream)** — 包裝現有的 `tokio-tungstenite` 流以實作自訂 TLS 或連線選項

## TLS 後端

`wss://` 支援由 Cargo 功能選擇。預設值為 `rustls-tls-native-roots`：純 Rust TLS 堆疊（Linux 上無 OpenSSL），其根從作業系統信任儲存區加載，因此透過 TLS 攔截出口代理程式進行撥號可以繼續工作。使用 `default-features = false` 覆蓋它並選擇一個：

|特色| TLS 堆疊 |信任根源 |
| --- | --- | --- |
| `rustls-tls-native-roots`（預設）| rustls（純Rust）|作業系統信任儲存 |
| `rustls-tls-webpki-roots` | rustls（純Rust）|捆綁 Mozilla 根 |
| `native-tls` |平台（SChannel / 安全傳輸 / OpenSSL） |作業系統信任儲存 |

在未啟用 TLS 功能的情況下，只有 `ws://` 有效； `wss://` 在連線時失敗。 rustls 後端使用 `ring` 加密提供者。如果最終啟用了多個後端（例如，透過跨依賴關係圖的 Cargo 功能統一），則 `native-tls` 優先，因為 `tokio-tungstenite` 的自動連線器更喜歡它。

## 另請參閱

- [`ahp`](https://crates.io/crates/ahp) — 主用戶端 crate
- [`ahp-types`](https://crates.io/crates/ahp-types) — 僅限線路型
- [協定文件](https://microsoft.github.io/agent-host-protocol/)