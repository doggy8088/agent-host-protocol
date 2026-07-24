# Kotlin 用戶端用於代理主機協定

[![Maven 中心](https://img.shields.io/maven-central/v/com.microsoft.agenthostprotocol/agent-host-protocol)](https://central.sonatype.com/artifact/com.microsoft.agenthostprotocol/agent-host-protocol)

純 Kotlin/JVM 用戶端庫為
[代理主機協定](https://microsoft.github.io/agent-host-protocol/)。設計用於
不加修改地從 Android 應用程式、伺服器端 JVM 服務使用，以及
KMP/JVM 目標消費者。

- **純 Kotlin/JVM** — 無 Android SDK 相依性；目標 Java 8 位元組碼
  （使用 JDK 17 工具鏈建置）因此沒有 AGP 版本要求，沒有核心庫
  脫糖，沒有最低 Android API 等級超出 kotlinx.serialization
  已經需要了。
- **根據規範的 TypeScript 協定定義自動產生**
  父倉庫。產生的資源已提交，因此消費者不需要
  TypeScript 或 `tsx` 工具鏈。
- **`kotlinx.serialization`-native** 具有慣用的密封接口
  每個判別聯集、`value class` 位元集列舉和可為 null 的型別
  對於可選欄位。

## 安裝

將相依性新增至您的 Android 或 JVM 專案：

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


該庫傳遞依賴於 `org.jetbrains.kotlinx:kotlinx-serialization-json`
(`api` 範圍) — 您不需要單獨聲明它。您確實需要申請
[kotlin-序列化 Gradle 插件](https://kotlinlang.org/docs/serialization.html#example-json-serialization)
在與此庫一起定義自己的 `@Serializable` 類別的任何模組中，但是
您**不需要**僅需要它來使用生成的 AHP 類型。

## 用法

始終使用預先配置的 `Ahp.json` 實例（或 `kotlinx.serialization.json.Json`
具有相同設定的實例）。 AHP 判別聯集的自訂序列化器
需要 JSON 感知的編碼器/解碼器。





```kotlin
import com.microsoft.agenthostprotocol.Ahp
import com.microsoft.agenthostprotocol.generated.ActionEnvelope
import com.microsoft.agenthostprotocol.generated.StateAction
import com.microsoft.agenthostprotocol.generated.StateActionUnknown

// Decode a server-sent action envelope from the wire. Since the v0.2 channels
// reorg, every action carries the `channel` URI it belongs to; per-session
// actions like `session/titleChanged` no longer include the session URI in
// their payload.
val envelope: ActionEnvelope = Ahp.json.decodeFromString(
    ActionEnvelope.serializer(),
    """{"channel":"ahp-session:/abc","action":{"type":"session/titleChanged","title":"new"},"serverSeq":42}""",
)

println(envelope.channel)           // ahp-session:/abc
println(envelope.serverSeq)         // 42
when (val action = envelope.action) {
    is StateActionUnknown -> {
        // Future protocol versions: a no-op fall-through is required so
        // older clients can keep applying actions they DO understand.
    }
    else -> { /* handle each action subtype as needed */ }
}
```


### 盒子裡有什麼

- **`com.microsoft.agenthostprotocol.Ahp`** — `Ahp.json` 配置的 `Json` 實例。
- **`com.microsoft.agenthostprotocol.generated.*`** — 線路類型：`RootState`，
  `SessionState`、`ChangesetState`、`TerminalState`、`AgentInfo`、`AgentSelection`、
  `ActionEnvelope`（帶有 `channel` URI），所有指令參數/結果
  (`InitializeParams`、`CreateSessionParams`、`SubscribeParams`、
  `InvokeChangesetOperationParams` 等），每個通道操作型別
  (`session/*`、`root/*`、`terminal/*`、`changeset/*`) 和判別聯集
  密封介面（`StateAction`、`ResponsePart`、`ToolCallState`、
  `ToolResultContent`，`MessageAttachment`，`SnapshotState`，
  `ChangesetOperationTarget`、`ReconnectResult` 等）。
- **純 reducer** - 頂 `rootReducer`、`sessionReducer`、
  `terminalReducer` 和 `changesetReducer` 函式（加上
  `Reducer<S, A>` 有趣的介面包裝為 `RootReducer` / `SessionReducer`
  / `TerminalReducer` / `ChangesetReducer` 物件）產生下一個
  來自目前狀態的狀態和已套用的操作。行為與
  規範的 TypeScript reducer根據共用進行驗證
  `types/test-cases/reducers/` 固定語料庫。
- **通道範圍的通知參數** - `SessionAddedParams`，
  `SessionRemovedParams`、`SessionSummaryChangedParams`、`AuthRequiredParams`、
  `OtlpExportLogsParams` 等。通知透過其 JSON-RPC 路由
  `method` 名稱（例如 `root/sessionAdded`、`auth/required`、`otlp/exportLogs`) — 沒有嵌入的 `type` 鑑別器聯集。
- **JSON-RPC 信封類型**（`JsonRpcRequest<P>`、`JsonRpcResponse` 等）和
  助手（`AhpCommands.initialize(id, params)`）。

### 盒子裡還沒有什麼

- WebSocket /網路傳輸－自備（例如OkHttp、Ktor）。
- Android 用戶端範例 — 請參閱 Swift `AHPClient` 範例以了解架構
  圖案；計劃在後續版本中推出 Kotlin/Android 等效版本。

## 協定版本映射

`com.microsoft.agenthostprotocol.generated` 中的兩個常數追蹤哪一個
該庫實作的協定版本：

- `PROTOCOL_VERSION` — SemVer 該函式庫版本的字串
  源樹實作。
- `SUPPORTED_PROTOCOL_VERSIONS` — 這個函式庫願意的每個版本
  進行談判（最優先優先）。將其作為 `protocolVersions` 傳遞
  `InitializeParams`。

相同的訊息以機器可讀的形式鏡像在
[`release-metadata.json`](release-metadata.json) 並且，以人類可讀的形式
形式，在 [`CHANGELOG.md`](CHANGELOG.md) 中。 CI 驗證所有三個來源
同意每個PR。

## 從原始碼構建

`JAVA_HOME` 上需要 JDK 17+。 Gradle 包裝器處理其他所有事情。





```bash
cd clients/kotlin
./gradlew build
```


從 TypeScript 協定定義重新產生線路類型
（生成器需要 Node.js）：





```bash
# from the repo root
npm install
npm run generate:kotlin
```


CI 驗證提交的來源是否與生成器輸出相符 - 請參閱
[`AGENTS.md`](AGENTS.md) 以了解有關生成器和發布管道的詳細資訊。

## 授權

MIT－參見[`LICENSE`](../../LICENSE)。