# ahp 類型

[代理主機協定 (AHP)](https://github.com/microsoft/agent-host-protocol) 的線路協定類型。

[![crates.io](https://img.shields.io/crates/v/ahp-types.svg)](https://crates.io/crates/ahp-types)
[![docs.rs](https://img.shields.io/docsrs/ahp-types)](https://docs.rs/ahp-types)

每個訊息、操作、指令和 [AHP 規格](https://microsoft.github.io/agent-host-protocol/) 定義的狀態物件的 Rust 類型。所有類型都實作 `Serialize + Deserialize` 並使用相同的 JSON 欄位名稱作為傳輸格式。

## 模組

|模組|內容 |
|---|---|
| [`state`](https://docs.rs/ahp-types/latest/ahp_types/state/) | `RootState`、`SessionState`、工具呼叫生命週期、終端機狀態 |
| [`actions`](https://docs.rs/ahp-types/latest/ahp_types/actions/) | `StateAction` 判別聯集與 `ActionEnvelope` |
| [`commands`](https://docs.rs/ahp-types/latest/ahp_types/commands/) |指令參數與結果型別 |
| [`notifications`](https://docs.rs/ahp-types/latest/ahp_types/notifications/) |協定通知 |
| [`messages`](https://docs.rs/ahp-types/latest/ahp_types/messages/) | JSON-RPC 線路信封 |
| [`errors`](https://docs.rs/ahp-types/latest/ahp_types/errors/) | AHP 與 JSON-RPC 錯誤代碼 |
| [`version`](https://docs.rs/ahp-types/latest/ahp_types/version/) |協定版本常數 |

## 用法





```toml
[dependencies]
ahp-types = "0.1"
serde_json = "1"
```







```rust
use ahp_types::actions::{ActionEnvelope, StateAction};

let json = r#"{
  "channel": "ahp-session:/s1",
  "action": { "type": "session/titleChanged", "title": "Hi" },
  "serverSeq": 7,
  "origin": null
}"#;
let env: ActionEnvelope = serde_json::from_str(json).unwrap();
match env.action {
    StateAction::SessionTitleChanged(a) => println!("title: {}", a.title),
    _ => {}
}
```


## 另請參閱

- [`ahp`](https://crates.io/crates/ahp) — 非同步用戶端、reducer 與傳輸特徵
- [`ahp-ws`](https://crates.io/crates/ahp-ws) — WebSocket 傳輸
- [協定文件](https://microsoft.github.io/agent-host-protocol/)