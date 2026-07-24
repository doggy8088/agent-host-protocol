# 用戶端

該儲存庫提供了五種語言的官方用戶端庫。
每個用戶端的線路類型都是從規範的 TypeScript 產生的
來源在 [`types/`](https://github.com/microsoft/agent-host-protocol/tree/main/types) 中，
因此，每個協定都慣用地呈現相同的協定形狀
生態系。每個庫都有版本控制並獨立發布 - 請參閱
[`RELEASING.md`](https://github.com/microsoft/agent-host-protocol/blob/main/RELEASING.md)
對於每種語言的標籤方案。

選擇您想要整合的語言並從
它通常透過包註冊表進行傳送。

|語言 |套件 |註冊表 |
| -------------- | -------------------------------------------------------------------------------- |
| [Rust](#rust) | `ahp-types`，`ahp`，`ahp-ws`| crates.io |
| [TypeScript](#typescript) | `@microsoft/agent-host-protocol` | npm |
| [Kotlin / JVM](#kotlin) | `com.microsoft.agenthostprotocol:agent-host-protocol` | Maven 中心 |
| [Swift](#swift) | `AgentHostProtocol`，`AgentHostProtocolClient` | Swift 套件管理器 |
| [Go](#go) | `github.com/microsoft/agent-host-protocol/clients/go` | Go 模組代理程式 |

## Rust

[crates.io](https://crates.io) 上的三個crate，反映了分割情況
線路類型、傳輸無關的用戶端和 WebSocket 之間
適配器：

- [`ahp-types`](https://crates.io/crates/ahp-types) — 產生的連線
  類型，無 I/O。
- [`ahp`](https://crates.io/crates/ahp) — 非同步 `Client` 與純
  reducer、可插入的 `Transport` 特徵和多主機
  `ahp::hosts` 下的註冊表。
- [`ahp-ws`](https://crates.io/crates/ahp-ws) — WebSocket 傳輸
  建立在 `tokio-tungstenite` 之上。





```bash
cargo add ahp ahp-ws
# add `ahp-types` directly only if you need the wire types without
# the client runtime.
```


請參閱 [Rust 用戶端 README](https://github.com/microsoft/agent-host-protocol/tree/main/clients/rust)
了解快速入門、自訂傳輸和多主機詳細資訊。

## TypeScript

單一瀏覽器和節點友善的包
[npm](https://www.npmjs.com/package/@microsoft/agent-host-protocol)
具有四個子路徑入口點（線路類型、用戶端、多主機
編排、WebSocket 傳輸）：

[![npm](https://img.shields.io/npm/v/@microsoft/agent-host-protocol.svg)](https://www.npmjs.com/package/@microsoft/agent-host-protocol)





```bash
npm install @microsoft/agent-host-protocol
```







```ts
import { AhpClient } from '@microsoft/agent-host-protocol/client';
import { WebSocketTransport } from '@microsoft/agent-host-protocol/ws';
```


請參閱 [TypeScript 用戶端 README](https://github.com/microsoft/agent-host-protocol/tree/main/clients/typescript)
取得完整的子路徑表和完整的快速啟動。

## Kotlin

純 Kotlin/JVM 工件
[Maven 中心](https://central.sonatype.com/artifact/com.microsoft.agenthostprotocol/agent-host-protocol)。
以 Java 8 位元組碼為目標，因此可以直接使用
Android、伺服器端 JVM 服務和 KMP/JVM 目標。

[![Maven 中心](https://img.shields.io/maven-central/v/com.microsoft.agenthostprotocol/agent-host-protocol)](https://central.sonatype.com/artifact/com.microsoft.agenthostprotocol/agent-host-protocol)

### Gradle (Kotlin DSL)





```kotlin
dependencies {
    implementation("com.microsoft.agenthostprotocol:agent-host-protocol:0.2.0")
}
```


### Gradle（Groovy DSL）





```groovy
dependencies {
    implementation 'com.microsoft.agenthostprotocol:agent-host-protocol:0.2.0'
}
```


### Maven





```xml
<dependency>
    <groupId>com.microsoft.agenthostprotocol</groupId>
    <artifactId>agent-host-protocol</artifactId>
    <version>0.2.0</version>
</dependency>
```


該庫傳遞依賴於 `org.jetbrains.kotlinx:kotlinx-serialization-json`。
請參閱 [Kotlin 用戶端 README](https://github.com/microsoft/agent-host-protocol/tree/main/clients/kotlin)
對於用法，`Ahp.json` 序列化器實例，以及什麼是/不是
包含在盒子中（還沒有傳輸 - 帶上您自己的 OkHttp/Ktor）。

## Swift

透過 Swift 套件管理器分發。 `Package.swift` 清單
位於儲存庫根目錄，因為 SwiftPM 只解析清單
在遠端 git 儲存庫的根目錄下； Swift 來源本身已存在
在`clients/swift/AgentHostProtocol/`下。

### Package.swift 依賴項





```swift
.package(url: "https://github.com/microsoft/agent-host-protocol.git", from: "0.1.0")
```


### 目標依賴項





```swift
.target(
    name: "MyApp",
    dependencies: [
        .product(name: "AgentHostProtocol", package: "agent-host-protocol"),
        .product(name: "AgentHostProtocolClient", package: "agent-host-protocol"),
    ]
)
```


- `AgentHostProtocol` — 產生的線路類型、指令、通知、
  動作和純 reducer。
- `AgentHostProtocolClient` — 單主機 `AHPClient`、`MultiHostClient`、
  狀態鏡子，以及 `URLSessionWebSocketTransport` /
  `NWConnectionWebSocketTransport` 運輸。

請參閱 [Swift 用戶端 README](https://github.com/microsoft/agent-host-protocol/tree/main/clients/swift/AgentHostProtocol)
對於最小的單主機和多主機範例，傳輸
選擇，並重新連線分層指導。

## Go

透過公用 Go 模組代理程式解析單一 Go 模組。三
軟體包鏡像了 Rust 三箱分割：

- `ahptypes` — 僅線路協定類型。
- `ahp` — 透過可插入的 `Transport` 非同步 `Client`，純 reducer，
  以及 `ahp/hosts` 下的多主機執行時間。
- `ahpws` — WebSocket 傳輸建構於
  [`github.com/coder/websocket`](https://github.com/coder/websocket)。





```bash
go get github.com/microsoft/agent-host-protocol/clients/go@latest
```







```go
import (
    "github.com/microsoft/agent-host-protocol/clients/go/ahp"
    "github.com/microsoft/agent-host-protocol/clients/go/ahptypes"
    "github.com/microsoft/agent-host-protocol/clients/go/ahpws"
)
```


請參閱 [Go 用戶端 README](https://github.com/microsoft/agent-host-protocol/tree/main/clients/go)
WebSocket 快速入門。

## 選擇協定版本

每個用戶端公開兩個協定版本常數：

- `PROTOCOL_VERSION` — 版本的 SemVer 字串
  用戶端的目前版本實作了。
- `SUPPORTED_PROTOCOL_VERSIONS` — 用戶端的每個版本
  願意洽談，首選優先。透過它（或
  派生清單/陣列）作為 `InitializeParams` 上的 `protocolVersions`
  在握手過程中。

用戶端軟體包版本追蹤規格版本，但它們不是
需要完全匹配 - 僅補丁後發布的用戶端
用戶端修復可能位於比匹配的規格更高的補丁上
釋放。上面的兩個版本常數始終反映
用戶端建構的協定版本可以說話。參見
[版本控制](/specification/versioning) 用於完整協商
模型。