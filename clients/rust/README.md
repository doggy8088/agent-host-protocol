# Rust SDK 用於代理主機協定

[AHP](../../README.md) 與傳輸無關的 Rust 用戶端。

## crate

- **`ahp-types`** — 從 TypeScript 來源產生的線路類型
  `types/` 中的真相。使用 `npm run generate:rust` 重新生成
  儲存庫根。
- **`ahp`** — 非同步用戶端，純 reducer，可插入 `Transport`
  特徵和 [`ahp::hosts`](https://docs.rs/ahp/latest/ahp/hosts/)
  用於多主機註冊/重新連線/扇入的模組。無網路
  依賴項－帶上你自己的交通工具。
- **`ahp-ws`** — WebSocket 傳輸適配器建構於
  `tokio-tungstenite`。

## 快速開始





```rust
use ahp::{Client, ClientConfig, SubscriptionEvent};

let transport = ahp_ws::WebSocketTransport::connect("ws://localhost:12345").await?;
let client = Client::connect(transport, ClientConfig::default()).await?;

let init = client
    .initialize("my-client".into(), vec![ahp_types::PROTOCOL_VERSION.to_string()], vec![ahp_types::ROOT_RESOURCE_URI.to_string()])
    .await?;

let mut sub = client.attach_subscription(ahp_types::ROOT_RESOURCE_URI).await;
while let Some(SubscriptionEvent::Action(a)) = sub.recv().await {
    println!("seq={} {:?}", a.server_seq, a.action);
}
```


## 使用自訂傳輸

為任何幀位元組流實作 `ahp::Transport` — stdio，一個 Unix
套接字，記憶體中的通道對，與您自己的 TCP 連線
框架等。特徵表面是三個非同步方法：





```rust
pub trait Transport: Send + 'static {
    fn send(&mut self, msg: TransportMessage)
        -> impl Future<Output = Result<(), TransportError>> + Send;
    fn recv(&mut self)
        -> impl Future<Output = Result<Option<TransportMessage>, TransportError>> + Send;
    fn close(&mut self)
        -> impl Future<Output = Result<(), TransportError>> + Send { async { Ok(()) } }
}
```


請參閱 `crates/ahp/tests/client_roundtrip.rs` 以了解記憶體中工作
整合測試使用的傳輸。

## 協定版本映射

該crate公開了兩個協定版本常數：

- `ahp_types::PROTOCOL_VERSION` — 版本的 SemVer 字串
  crate 的 `0.x.y` 原始碼樹實作。
- `ahp_types::SUPPORTED_PROTOCOL_VERSIONS` — 此crate的每個版本
  願意洽談，首選優先。傳遞切片（或
  導出 `Vec<String>`) 作為 `InitializeParams.protocol_versions`。

相同的訊息以機器可讀的形式鏡像在
[`clients/rust/release-metadata.json`](release-metadata.json) 並且，在
人類可讀的形式，在 [`CHANGELOG.md`](CHANGELOG.md) 中。

## 再生類型





```sh
npm run generate:rust
```


生成器 (`scripts/generate-rust.ts`) 將 `types/*.ts` 解析為
`ts-morph` 並在 `crates/ahp-types/src/` 下發出 Rust 模組。不
手動編輯產生的文件。

## 運行測試





```sh
cargo test --workspace
```


## 多主機用戶端

請參閱 [MULTI_HOST.md](MULTI_HOST.md)，以了解 Rust SDK 的多主機註冊表、重新連線監管、扇入事件、聚合視圖和單主機便捷 API。