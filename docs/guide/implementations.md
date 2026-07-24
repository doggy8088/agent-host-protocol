# 實作

這些專案實作或使用代理主機協定。

## 用戶端

從此儲存庫發貨的五個用戶端被發佈到
每個生態系的包註冊表慣用語。請參閱 [用戶端](/guide/clients)
用於安裝片段和每種語言的入口點。

- **Rust** — crates.io 上的三個crate（`ahp-types`、`ahp`、`ahp-ws`）。請參閱[Rust 用戶端 crate](https://github.com/microsoft/agent-host-protocol/tree/main/clients/rust)。
- **TypeScript** — `npm install @microsoft/agent-host-protocol` 表示線路類型、reducer、`AhpClient`、`MultiHostClient` 和 `WebSocketTransport`。請參閱[TypeScript 用戶端](https://github.com/microsoft/agent-host-protocol/tree/main/clients/typescript)。瀏覽器友善；適用於任何公開全域 `WebSocket` 的環境。
- **Kotlin / JVM** — Maven 中心上的 `com.microsoft.agenthostprotocol:agent-host-protocol`。純 Kotlin/JVM（Java 8 位元組碼），因此它可以在 Android、伺服器端 JVM 和 KMP/JVM 目標上保持不變。請參閱[Kotlin 用戶端](https://github.com/microsoft/agent-host-protocol/tree/main/clients/kotlin)。
- **Swift** — 新增 `https://github.com/microsoft/agent-host-protocol` 作為 `AgentHostProtocol` 和 `AgentHostProtocolClient` 庫的 Swift 程式包管理器相依性。有關 iOS 用戶端的範例，請參閱 [Swift 用戶端](https://github.com/microsoft/agent-host-protocol/tree/main/clients/swift)。 `Package.swift` 清單位於儲存庫根目錄，因為 SwiftPM 僅解析遠端 git 儲存庫根目錄的清單；實際的 Swift 來源位於 `clients/swift/AgentHostProtocol/` 下。
- **Go** — `go get github.com/microsoft/agent-host-protocol/clients/go@latest` 用於 `ahptypes`、`ahp` 和 `ahpws` 軟體包，鏡像 Rust 三箱分割。請參閱[Go 用戶端](https://github.com/microsoft/agent-host-protocol/tree/main/clients/go)。
- **[AHPX](https://github.com/TylerLeonhardt/ahpx)** — 命令列和 Node.js 用戶端，用於連線到 AHP 伺服器、管理工作階段和發送提示。
- **[VS Code](https://github.com/microsoft/vscode)** — VS Code 包含用於處理 AHP 主機的代理程式工作階段用戶端程式碼。

## 伺服器

- **[VS Code 代理主機](https://github.com/microsoft/vscode)** — 參考 AHP 伺服器實作。瀏覽儲存庫時從 [`src/vs/platform/agentHost/node/`](https://github.com/microsoft/vscode/tree/main/src/vs/platform/agentHost/node) 開始。