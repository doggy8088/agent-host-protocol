# 連線到多個主機

代理主機協定描述單一_client -> host_連線。真正的產品通常需要同時與 **兩個或多個主機通訊**：本地工作階段伺服器和隧道連線的遠端主機、個人主機和隊友的主機、桌面側邊欄中的多個專案主機等等。協定本身並沒有說明如何連線它；這是一個用戶端 SDK問題。

本頁涵蓋了 Rust SDK 的多主機層。

## 為什麼需要內建抽象？

如果沒有一個，每個消費者最終都會寫同樣的東西：

- N個獨立的`Client`實例及其生命週期
- N 個傳輸加上帶有退避和取消功能的重新連線主管
- 一個註冊表，用於為 UX 鍵入每個主機元資料（標籤、URL、連線狀態、最後一個錯誤、代理、`serverSeq`、訂閱、預設目錄）
- 入站事件的扇入，標記有產生事件的主機
- 資源 URI 的每個主機範圍（主機 A 上的 `ahp-session:/s1`！= 主機 B 上的 `ahp-session:/s1`）
- 每個主機保留 `clientId`，以便重新連線身分可以在重新啟動後繼續存在
- 每個主機根狀態鏡像加上工作階段摘要緩存，因此側邊欄和收件匣不會降級為“訂閱所有內容”

Rust SDK 附帶了一個包含所有這些的 `MultiHostClient`。 **單主機 = N=1 多主機**，因此相同的 API 可以以任何方式運作。

## 每主機 UX 介面

每個註冊的主機都顯示為 `HostHandle` 快照：

|領域|筆記|
|---|---|
| `id`，`label` |穩定的識別碼和人類可讀的顯示名稱 |
| `state` | `Disconnected`、`Connecting`、`Connected`、`Reconnecting { attempt }`、`Failed { reason }` |
| `last_error`，`last_connected_at` |狀態列/調試面板中的表面 |
| `protocol_version`，`default_directory`，`completion_trigger_characters` |來自 `InitializeResult` |
| `client_id` |實際在 `initialize`/`reconnect` 上傳送的 ID |
| `server_seq` |此主機的最高 `serverSeq` |
| `agents`，`active_sessions`，`terminals` |從主機的 `RootState` | 鏡像
| `subscriptions` |主管將在重新連線後重新訂閱的 URI |
| `session_summaries` |快取的 `SessionSummary[]` 透過 `listSessions` 加上根工作階段通知保持最新 |
| `generation` |每次重新連線時都會發生碰撞；用於使過時的用戶端句柄失效 |

快照是不可變的。若要觀察更改，請偵聽連線事件流 (`host_events`) 或在需要時拍攝新快照。

## 重新連線、產生和所有權

每個主機都在自己的內部任務 `HostRuntime` 中運行，該任務擁有當前的 `Client`，重試配置的 `ReconnectPolicy`，並在重新連線時重新訂閱已知的 URI。

每次成功的重新連線都會增加每個主機**代**計數器。您從上一連線獲得的任何 `HostClientHandle` 都拒絕在新連線上分派並傳回 `HostError::HostReconnected`；在這種情況下請求新的句柄。這可以防止出現微妙的錯誤，即重新連線時持有的句柄會默默地寫入不同的連線。

## 每個主機穩定的 `clientId`

該協定使用 `clientId` 來跨重新連線識別邏輯用戶端。每個主機都有自己的 `clientId`。 `HostConfig::new`預設產生一個工作階段穩定的id；生產應用程式應該保留一個並透過 `HostConfig::with_client_id` 傳回，以便在啟動後重新連線身分。

## Rust API

單主機優先：





```rust
use std::sync::Arc;
use ahp::hosts::{HostConfig, MultiHostClient};
use ahp::transport::BoxedTransport;
use ahp::TransportError;

async fn open_local(_id: ahp::hosts::HostId) -> Result<BoxedTransport, TransportError> {
    let transport = ahp_ws::WebSocketTransport::connect("ws://localhost:12345").await?;
    Ok(BoxedTransport::new(transport))
}

# async fn run() -> Result<(), Box<dyn std::error::Error>> {
let config = HostConfig::new("local", "Local sessions server", open_local);
let (multi, handle) = MultiHostClient::single(config).await?;
println!("connected to {}: {:?}", handle.label, handle.state);
# let _ = multi; Ok(()) }
```


多主機形狀。除了呼叫 `add_host` 之外，消費者永遠不會看到註冊表樣板：





```rust
use ahp::hosts::{HostConfig, MultiHostClient};

# async fn run() -> Result<(), Box<dyn std::error::Error>> {
let multi = MultiHostClient::new();
multi
    .add_host(HostConfig::new("local", "Local", open_local))
    .await?;
multi
    .add_host(HostConfig::new("remote", "Tunnel", open_remote))
    .await?;

let mut events = multi.events();
while let Some(event) = events.recv().await {
    println!(
        "[{}] resource={:?} event={:?}",
        event.host_id, event.resource, event.event
    );
}
# # async fn open_local(_: ahp::hosts::HostId) -> Result<ahp::transport::BoxedTransport, ahp::TransportError> { unimplemented!() }
# # async fn open_remote(_: ahp::hosts::HostId) -> Result<ahp::transport::BoxedTransport, ahp::TransportError> { unimplemented!() }
# Ok(()) }
```


綜合觀點是一流的。多主機層維護每主機工作階段-summary 緩存，因此這是快照讀取，而不是扇出訂閱：





```rust
# async fn run(multi: ahp::hosts::MultiHostClient) {
let inbox = multi.aggregated_sessions().await;
for hosted in inbox {
    println!(
        "[{}] {} ({})",
        hosted.host_label, hosted.summary.title, hosted.host_id
    );
}
# }
```


高級消費者可以透過一代檢查的 `HostClientHandle` 下降到底層的 `Client`：





```rust
# async fn run(multi: ahp::hosts::MultiHostClient) -> Result<(), ahp::hosts::HostError> {
let handle = multi
    .client(&"local".into())
    .await
    .expect("host registered");

handle.check_alive().await?;
# Ok(()) }
```


配置旋鈕位於 `HostConfig`（`with_client_id`、`with_initial_subscriptions`、`with_client_config`、`with_reconnect_policy`）和 `ReconnectPolicy::{disabled, immediate_forever, exponential}` 上。對於跨啟動的持久身份，請透過 `MultiHostClient::with_client_id_store(...)` 插入持久的 `ClientIdStore`（見下文）或自行載入 `clientId` 並透過 `HostConfig::with_client_id` 傳遞。

## 持久的 `clientId` — `ClientIdStore`

`HostConfig::client_id` 是 `Option<String>`。當您未明確設定時，多主機用戶端將在 `add_host` 時間解析 id：

1. `HostConfig::with_client_id(...)` 中的 `Some(explicit)` 始終獲勝，並且該值也會持久化到儲存中，以便後續啟動透明地重複使用它。
2. 否則，參考配置的`ClientIdStore`；儲存的值按原樣重複使用。
3. 否則，將產生並保留新的 UUID 形狀的 id。

`MultiHostClient::new()` 使用行程內的 `InMemoryClientIdStore` - 適合測試和短期 CLI，但 id 在重新啟動時會重設。對於交叉啟動身分（AHP `reconnect` 流程需要穩定的 `clientId` 才能跨行程工作），請使用持久性儲存建置用戶端：





```rust
use std::path::PathBuf;
use std::sync::Arc;
use ahp::hosts::{FileClientIdStore, HostConfig, MultiHostClient};

# async fn run() -> Result<(), Box<dyn std::error::Error>> {
// Pick a path that suits the platform (e.g. `$XDG_DATA_HOME/<app>/client-ids`
// on Linux, `Application Support/<app>/client-ids` on macOS).
let store = Arc::new(FileClientIdStore::new(PathBuf::from(
    "/tmp/my-app/client-ids",
)));
let multi = MultiHostClient::with_client_id_store(store);
# # async fn open(_: ahp::hosts::HostId) -> Result<ahp::transport::BoxedTransport, ahp::TransportError> { unimplemented!() }
multi.add_host(HostConfig::new("local", "Local", open)).await?;
# Ok(()) }
```


`FileClientIdStore` 為每個主機 ID 寫入一個檔案（原子暫存檔案 + 重新命名、Unix 上從一開始的 `0o600` 模式、URL 不安全 ID 的百分比編碼檔案名稱）。在行程內，並發寫入由內部互斥體序列化；跨行程寫入是最後寫入者獲勝（與 Swift SDK 的 `FileClientIdStore` 相符）。在需要 Keychain 語意的 Apple 平台上，包裝您自己的 `ClientIdStore` 特徵的實作。

持久性失敗會從 `add_host` 中以 `HostError::ClientIdStore { host, error }` 的形式出現－它們不會被默默地吞沒。

## 立即喚醒每個主機 — `reconnect_all_unavailable`

移動式使用者可以呼叫 `MultiHostClient::reconnect_all_unavailable().await` 手動重新連線尚未連線到 `Connected` 或 `Connecting` 的每個主機（因此：`Disconnected`、`Reconnecting` 和耗盡策略 `Failed` 主機都會同時喚醒）。此呼叫同時分派重新連線，從不拋出異常，並傳回每個主機失敗的 `HashMap<HostId, HostError>`。





```rust
# async fn run(multi: ahp::hosts::MultiHostClient) {
// Typical scene-phase pattern: when the app returns to the foreground,
// wake every host the user has been away from in one call.
let failures = multi.reconnect_all_unavailable().await;
for (host_id, err) in failures {
    eprintln!("[{host_id}] reconnect failed: {err}");
}
# }
```


## 主機感知 reducer 鏡像 — `MultiHostStateMirror`

對於需要跨多個主機追蹤 reducer 狀態的 UI（例如，一次從 N 個主機顯示工作階段的側邊欄），SDK 附帶 `MultiHostStateMirror`。它包裝了現有的 per-狀態 reducer，但透過 `(host_id, uri)` 封裝了鍵工作階段/終端機/changeset 狀態，因此兩個主機通告相同工作階段 URI 的常見情況不會出現問題。





```rust
use ahp::{HostedResourceKey, MultiHostStateMirror};
# async fn run(mut mirror: MultiHostStateMirror, host_id: ahp::hosts::HostId, mut events: ahp::hosts::HostSubscriptionStream) {
while let Some(event) = events.recv().await {
    mirror.apply_event(&event);
}
let session = mirror
    .sessions()
    .get(&HostedResourceKey::new(host_id, "ahp-session:/s1"));
# let _ = session;
# }
```


⚠ 今天，Rust SDK 中的兩個事件來源均由 `tokio::sync::broadcast` 支援，一旦緩衝區填滿，**就會向慢速消費者發送信封** — `MultiHostClient::events()` 和來自 `Client::subscribe` / `attach_subscription` 的每個通道 `SessionSubscription`。兩者都不會像 Swift SDK 的每個通道 `events(host:uri:)` 那樣在重新連線的重播包絡中倖存下來。遺失（或因重新連線而遺失）的信封會永久取消該 `(host, channel)` 的鏡像同步，直到透過 `apply_snapshot` 從新快照重新播種。請記住這一點 - 鏡子是多主機 UI 狀態的正確形狀，但 Rust SDK 尚未提供無損饋線。

## 選擇單主機還是多主機

你不選擇。單主機使用者使用 `MultiHostClient::single(...)` 並且永遠不會看到註冊表概念。除了單一管理程式任務之外，SDK 不會對每主機施加任何開銷，並且無需學習單獨的單主機 API。