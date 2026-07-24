# 代理主機協定

用於 AI 代理工作階段的同步多用戶端狀態協定。

**[閱讀文件 →](https://microsoft.github.io/agent-host-protocol/)**

## 概述

代理主機協定 (AHP) 定義可移植、獨立的工作階段伺服器如何與其用戶端進行通訊。多個用戶端可以連線到伺服器，並透過不可變的狀態、純 reducer和預寫入協調來查看 AI 代理程式工作階段的同步視圖。

## 用戶端庫

|語言 |套件 |版本 |來源 |
| --- | --- | --- | --- |
| **Rust** | [`ahp`](https://crates.io/crates/ahp) · [`ahp-types`](https://crates.io/crates/ahp-types) · [`ahp-ws`](https://crates.io/crates/ahp-ws) | [![crates.io](https://img.shields.io/crates/v/ahp.svg?logo=rust)](https://crates.io/crates/ahp) | [`clients/rust/`]({u}0) |
| **TypeScript** | [`@microsoft/agent-host-protocol`](https://www.npmjs.com/package/@microsoft/agent-host-protocol) | [![npm](https://img.shields.io/npm/v/@microsoft/agent-host-protocol.svg?logo=npm)](https://www.npmjs.com/package/@microsoft/agent-host-protocol) | [`clients/typescript/`](clients/typescript/) · [CHANGELOG](clients/typescript/CHANGELOG.md) |
| **Kotlin** | [`com.microsoft.agenthostprotocol:agent-host-protocol`](https://central.sonatype.com/artifact/com.microsoft.agenthostprotocol/agent-host-protocol) | [![Maven 中心](https://img.shields.io/maven-central/v/com.microsoft.agenthostprotocol/agent-host-protocol.svg?logo=apachemaven)](https://central.sonatype.com/artifact/com.microsoft.agenthostprotocol/agent-host-protocol) | [`clients/kotlin/`](clients/kotlin/) · [CHANGELOG](clients/kotlin/CHANGELOG.md) |
| **Go** | [`github.com/microsoft/agent-host-protocol/clients/go`](https://pkg.go.dev/github.com/microsoft/agent-host-protocol/clients/go) | [![Go 參考文獻](https://pkg.go.dev/badge/github.com/microsoft/agent-host-protocol/clients/go.svg)](https://pkg.go.dev/github.com/microsoft/agent-host-protocol/clients/go) | [`clients/go/`](clients/go/) · [CHANGELOG](clients/go/CHANGELOG.md) |
| **Swift** | [SwiftPM: `microsoft/agent-host-protocol`](https://github.com/microsoft/agent-host-protocol) | [![標籤](https://img.shields.io/github/v/tag/microsoft/agent-host-protocol?filter=v*&label=SwiftPM&logo=swift)](https://github.com/microsoft/agent-host-protocol/tags) | [套件 README](clients/swift/AgentHostProtocol/README.md) · [CHANGELOG](clients/swift/CHANGELOG.md) |

其他用戶端：[**AHPX**](https://github.com/TylerLeonhardt/ahpx) (CLI + Node.js 用戶端) 和 [**VS Code**](https://github.com/microsoft/vscode)（內建代理程式工作階段用戶端）。

Rust、Swift 和 Go SDK 附帶了一個 `MultiHostClient`，用於同時與兩個或多個主機通訊（單主機使用者透過 `MultiHostClient::single` / `.single(...)` / `hosts.Single(...)` 使用相同的 API）。請參閱[連線到多台主機](https://microsoft.github.io/agent-host-protocol/guide/clients-multi-host)。

## 伺服器

- **[VS Code 代理主機](https://github.com/microsoft/vscode)** — 參考 AHP 伺服器實作 ([`src/vs/platform/agentHost/node/`](https://github.com/microsoft/vscode/tree/main/src/vs/platform/agentHost/node))。

## 版本控制與發布

每種語言用戶端和規格本身都在自己的 SemVer 軌道上獨立發布。請參閱 [`docs/specification/versioning.md`](docs/specification/versioning.md) 以了解協定層級規則，並參考 [`RELEASING.md`](RELEASING.md) 以了解發布機制（標籤約定、CHANGELOG /元資料強制、所需的 CI 環境）。

## 發展





```bash
# Install dependencies
npm install

# Start local dev server
npm run docs:dev

# Build for production
npm run docs:build

# Preview production build
npm run docs:preview
```


## 授權

MIT