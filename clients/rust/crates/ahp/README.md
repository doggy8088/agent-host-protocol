#啊啊

[代理主機協定 (AHP)](https://github.com/microsoft/agent-host-protocol) 的非同步 Rust 用戶端。

[![crates.io](https://img.shields.io/crates/v/ahp.svg)](https://crates.io/crates/ahp)
[![docs.rs](https://img.shields.io/docsrs/ahp)](https://docs.rs/ahp)

建構於 [`ahp-types`](https://crates.io/crates/ahp-types) 之上的與傳輸無關的 SDK。帶上您自己的傳輸 - WebSocket、stdio、TCP 或記憶體中通道對進行測試。

## 特徵

- **[`Client`](https://docs.rs/ahp/latest/ahp/client/struct.Client.html)** — 具有操作訂閱、預寫調度和後台 I/O 任務的非同步 JSON-RPC 用戶端
- **[`reducers`](https://docs.rs/ahp/latest/ahp/reducers/)** — 純狀態 reducer；將 `StateAction` 應用於 `RootState` / `SessionState` / 終端機狀態
- **[`Transport`](https://docs.rs/ahp/latest/ahp/transport/trait.Transport.html)** — 任何框架訊息流的可插入特徵

## 用法





```toml
[dependencies]
ahp = "0.1"
ahp-ws = "0.1"   # or bring your own transport
tokio = { version = "1", features = ["full"] }
```







```rust
use ahp::{Client, ClientConfig, SubscriptionEvent};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let transport = ahp_ws::WebSocketTransport::connect("ws://localhost:12345").await?;
    let client = Client::connect(transport, ClientConfig::default()).await?;

    client.initialize("my-client".into(), vec![ahp_types::PROTOCOL_VERSION.to_string()], vec![ahp_types::ROOT_RESOURCE_URI.to_string()]).await?;

    let mut sub = client.attach_subscription(ahp_types::ROOT_RESOURCE_URI).await;
    while let Some(SubscriptionEvent::Action(a)) = sub.recv().await {
        println!("seq={} action={:?}", a.server_seq, a.action);
    }

    client.shutdown().await;
    Ok(())
}
```


## 自訂運輸

為任何幀位元組流實作 `ahp::Transport`：





```rust
use ahp::{Transport, TransportError, TransportMessage};
use std::future::Future;

struct MyTransport { /* ... */ }

impl Transport for MyTransport {
    fn send(&mut self, msg: TransportMessage)
        -> impl Future<Output = Result<(), TransportError>> + Send
    { async { todo!() } }

    fn recv(&mut self)
        -> impl Future<Output = Result<Option<TransportMessage>, TransportError>> + Send
    { async { todo!() } }
}
```


有關完整的記憶體中範例，請參閱 `tests/client_roundtrip.rs`。

## 另請參閱

- [`ahp-types`](https://crates.io/crates/ahp-types) — 僅線路類型（無 I/O）
- [`ahp-ws`](https://crates.io/crates/ahp-ws) — WebSocket 傳輸
- [連線到多個主機](https://github.com/microsoft/agent-host-protocol/blob/main/clients/rust/MULTI_HOST.md) — [`hosts`](https://docs.rs/ahp/latest/ahp/hosts/) 模組包裝多主機註冊表、重新連線、扇入和聚合視圖；單主機消費者使用 `MultiHostClient::single`
- [協定文件](https://microsoft.github.io/agent-host-protocol/)