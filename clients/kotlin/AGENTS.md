# Kotlin 用戶端 — 代理指南

## 概述

此目錄包含代理主機協定 (AHP) 的 **Kotlin/JVM** 用戶端函式庫，透過 Maven Central 作為 `com.microsoft.agenthostprotocol:agent-host-protocol` 分發。

本函式庫以純 Kotlin/JVM（Java 8 位元組碼、JDK 17 工具鏈）為目標，因此適用於 Android 使用者、伺服器端 JVM 使用者和 KMP/JVM 目標使用者，無需任何 Android 特定的依賴項。運行時只有 `kotlinx-serialization-json` 位於類別路徑中。

## 程式碼生成

`src/main/kotlin/com/microsoft/agenthostprotocol/generated/` 中的類型是根據 `types/` 中的 TypeScript 定義**自動產生**的。不要直接編輯這些文件。生成的檔案提交給原始程式碼管理，因此可以透過 Maven Central 使用該套件，而無需程式碼生成工具鏈。

協定更改後重新生成：





```bash
npm run generate:kotlin    # runs: tsx scripts/generate.ts --kotlin
```


產生的檔案：`State`、`Commands`、`Actions`、`Errors`、`Messages`、`Notifications` — 全部後綴為 `.generated.kt`。

CI 驗證提交的產生檔案是否與 `npm run generate:kotlin` 的輸出匹配，但在漂移時失敗。

## 庫結構

- `src/main/kotlin/com/microsoft/agenthostprotocol/Ahp.kt` — 手動維護的入口點。公開消費者必須用來編碼/解碼協定訊息的配置的 `kotlinx.serialization.json.Json` 實例 (`Ahp.json`)。判別聯集的自訂 `KSerializer` 需要 JSON 感知的編碼器/解碼器，因此通用 `Json` 實例可能不起作用。
- `src/main/kotlin/com/microsoft/agenthostprotocol/Reducers.kt` - 從 `types/channels-*/reducer.ts` 移植的手寫純reducer（`rootReducer`、`sessionReducer`、`chatReducer`、`terminalReducer`、`changesetReducer`、`annotationsReducer`、`resourceWatchReducer`），加上一個小的 `Reducer<S, A>` 介面和每個通道 `object` 包裝器。請參閱下面的[Reducers](#reducers)。
- `src/main/kotlin/com/microsoft/agenthostprotocol/generated/` — 自動產生的線路類型。
- `build.gradle.kts` — Gradle 建置配置。使用 JDK 17 工具鏈設定 `jvmTarget = JVM_1_8`（Android 友善）。配置 Vanniktech `maven-publish` 插件以進行 Sonatype Central Portal 發布。也將 `types/test-cases/reducers/` 的絕對路徑作為 `ahp.reducerFixturesDir` 系統屬性連線到測試 JVM，以便 `FixtureDrivenReducerTest` 可以載入夾具，而不管 cwd。
- `gradle.properties` — 工件的 Maven 座標（`GROUP`、`VERSION_NAME`）和 POM 元資料的真實來源。- `gradle/libs.versions.toml` — 版本目錄（Kotlin、kotlinx.serialization、JUnit、Vanniktech 外掛程式）。

## 型別映射（TS → Kotlin）

| TypeScript | Kotlin |
| -------------------------------------- |---------------------------------------------------------------- |
| `string` | `String` |
| `number` | `Long`（TS 合約：64 位元整數）|
| `number` 與 `@format float` | `Double` |
| `boolean` | `Boolean` |
| `unknown` / `object` | `kotlinx.serialization.json.JsonElement` |
| `T \| null` | `T?` |
| `T?` 欄位 / `T \| undefined` | `T? = null` || `T[]` / `Array<T>` | `List<T>` |
| `Record<string, T>` | `Map<String, T>` |
| `Partial<T>` | `PartialT` 所有欄位都可為空的資料類別 |
| `enum E { A = "a" }` | `@Serializable enum class E { @SerialName("a") A }` |
| Bitset 列舉（JSDoc“Bitset”）| `@JvmInline value class` 優於 `Int`，帶伴生物件常數 |
|介面結構| `@Serializable data class` |
|判別聯集|密封介面+自訂`KSerializer`（鏡子Swift）|
| `URI` | `typealias URI = String` |
| `StringOrMarkdown` |具有自訂序列化器的密封介面|
|遞歸結構|資料類別（預設是堆分配的）|| `_meta` 欄位 | Kotlin `meta` + `@SerialName("_meta")` |
| `snake_case` 線路欄位 |駝峰式命名法 + `@SerialName("snake_case")` |

### 為什麼要使用自訂聯集序列化器（而不是 `@JsonClassDiscriminator`）

`@JsonClassDiscriminator` 是對判別聯集進行建模的慣用 kotlinx 序列化方法，但它禁止判別器欄位存在於變體資料類別上。由於我們的 TS 變體介面包括其鑑別器（例如 `MarkdownResponsePart.kind = 'markdown'`），因此產生基於 `@JsonClassDiscriminator` 的聯集將需要在這些介面出現的所有地方進行橫切欄位過濾。鏡像 Swift 的手動密封聯集序列化器可使變體資料類別與其 TS 對應項保持 1:1 的關係。

結果：**在編碼/解碼時始終使用 `Ahp.json`（或將 `classDiscriminator` 設定為哨兵值的 `Json` 實例）**。預設的 kotlinx `"type"` 鑑別器與我們模式中真實的 `type` 欄位發生衝突。

### 通知透過 JSON-RPC 方法路由，而不是透過嵌入式鑑別器路由

自 v0.2 通道重組以來，伺服器 → 用戶端通知將在 JSON-RPC `method` 名稱（例如 `root/sessionAdded`、`auth/required`、`otlp/exportLogs`）上調度，而不是在 `type` 鑑別器欄位上調度。因此，生成器將每個通知有效負載作為普通的 `*Params` 資料類別（無密封聯集包裝器）發出。消費者自己從 JSON-RPC 信封中提取 `method` 並解碼匹配的參數型別。 `action` 通知是特殊情況：它的參數總是 `ActionEnvelope`。

### 多值判別器

`SessionInputQuestion` 是一個並集，其中兩條線 `kind` 值對應到同一 Kotlin 資料類：

- `kind: "number"` → `SessionInputQuestionNumber(SessionInputNumberQuestion(kind = NUMBER, ...))`
- `kind: "integer"` → `SessionInputQuestionNumber(SessionInputNumberQuestion(kind = INTEGER, ...))`

自訂序列化器在解碼期間處理兩個連線值；編碼保留在資料類別上設定的任何鑑別器。 `DiscriminatedUnionTest.kt` 中的測試涵蓋了這種情況。

###手捲`ChangesetOperationTarget`聯集

TS 源將 `ChangesetOperationTarget` 建模為兩個內聯變體形狀的可辨別聯集，這兩個內聯變體形狀不會導出為其自己的接口。生成器從 `generateChangesetOperationTargetKotlin()` 手動發出整個子圖 - 密封的 `ChangesetOperationTarget`、兩個變體資料類別（`ChangesetOperationResourceTarget` 和 `ChangesetOperationRangeTarget`）、`ChangesetOperationTargetRange` 幫助器和自訂序列化器，以便 Kotlin 線路介面與 Swift 和 Rust 用戶端保持對齊。

### 位元集列舉

`SessionStatus` 是目前協定中唯一的位元集列舉。它作為 `@JvmInline value class` over `Int` 發出，以便**未知的未來標誌在解碼/編碼往返中倖存下來**而不會被默默丟棄。使用 `or`/`and`/`in` 進行組合器/包含操作：





```kotlin
val combined = SessionStatus.IDLE or SessionStatus.IS_READ
SessionStatus.IDLE in combined   // true
```


## 分配

工件透過 `kotlin/v*` git 標籤上的 Microsoft ESRP 支援的 `vscode-engineering` `maven-package` 管道範本發佈到 Maven Central（Sonatype Central Portal）。 [`gradle-maven-publish-plugin`](https://github.com/vanniktech/gradle-maven-publish-plugin) (v0.36+) 用於將工件暫存並進行 GPG 簽章到本機 Maven 儲存庫佈局中，然後由 ESRP 上傳。

發布管道 ([`clients/kotlin/pipeline.yml`](pipeline.yml)) 是一個 Azure DevOps 管道（GitHub Actions 無法在此儲存庫中觸發 ADO — 不允許使用 PAT）。其特定於儲存庫的 `buildSteps` 涵蓋驗證和建置； **暫存 + GPG 簽章由 `maven-package` 範本擁有**（通用基礎架構 - Maven Central 始終需要 PGP 簽章）：

1. **標籤驗證** (buildStep) — 驗證 `kotlin/vX.Y.Z` 標籤與 `gradle.properties` `VERSION_NAME` 匹配，版本不是 `-SNAPSHOT`，並且 `CHANGELOG.md` 具有匹配的 `## [X.Y.Z]` 標題。
2. **生成器 + Gradle 檢查** (buildSteps) — 重新運行 `npm run generate:kotlin`（差異失敗）和 `./gradlew check`。
3. **取得 GPG 金鑰**（範本）— `AzureKeyVault@2` 從 `vscode` Key Vault 擷取 `maven-gpg-private-key` 和 `maven-gpg-passphrase`（範本的 `signingKeyVault*` / `gpg*SecretName` 預設值）。
4. **階段與簽章**（範本）- 預設的 `mavenStagingCommand` (`./gradlew publishAllPublicationsToStagingRepository …`) 將 Maven 佈局寫入 `build/maven-staging/`，使用記憶體中的 GPG 金鑰 (`ORG_GRADLE_PROJECT_signingInMemoryKey*`) 對每個工件 (`.asc`) 進行簽章並發出 `.md5`/`.sha1` 校驗和。 `build.gradle.kts` 預設符號（`ahp.signPublications` 預設為 true）。 Maven Central 需要這些 PGP 簽名，而 ESRP 版本 `maven` 內容型別不會**生成它們 - 因此模板在此處簽名。
5.**ESRP 發佈**（範本）— 已簽署的暫存資料夾將交給 ESRP (`contenttype: maven`)，ESRP 透過 Sonatype Central Portal 將其上傳到 Maven Central。

不需要 GitHub 端的機密 - ESRP 憑證和 GPG 簽章金鑰都位於 Microsoft ADO 租用戶內（後者位於 `vscode` Key Vault 中）。相符的 GPG **公鑰** 金鑰必須發佈到金鑰伺服器，以便 Maven Central 可以驗證簽章。

### 刪減版本

請參閱 [`RELEASING.md`](../../RELEASING.md) 以了解完整的發布流程。
摘要，範圍為 Kotlin：

1. 在 `clients/kotlin/gradle.properties` 中提升 `VERSION_NAME`（公開發佈時刪除 `-SNAPSHOT`；當發布協定一致的 drop 時，該版本應與 `types/version/registry.ts` 中的 `PROTOCOL_VERSION` 匹配，例如 `0.2.0`）。
2. 執行`npm run generate:metadata`並提交重新產生的`clients/kotlin/release-metadata.json`。
3. 使用 `Implements AHP <version>` 線將 `clients/kotlin/CHANGELOG.md` 的 `## [Unreleased]` 部分旋轉到 `## [X.Y.Z] — YYYY-MM-DD`。如果標籤版本不存在 `## [X.Y.Z]` 標題，則發佈工作流程將會失敗。
4. 提交，合併到`main`。
5. 使用 `kotlin/v` + 相同版本（例如 `git tag kotlin/v0.2.0 && git push origin kotlin/v0.2.0`）標記合併提交。 ADO 發布管道拒絕標記與 `VERSION_NAME` 之間的任何不匹配，並完全拒絕 `*-SNAPSHOT` 標記。
6. ADO 管線運作、暫存 Maven 工件，並將它們交給 ESRP 進行簽署並上傳到 Maven Central。透過在 `mavenPublishing { ... }` 中設定 `automaticRelease = true` 並且 ESRP 處理發布，不需要手動 Sonatype UI 互動。
7. 將 `VERSION_NAME` 傳回下一個 `-SNAPSHOT` 以進行持續開發。

## 本機建置與測試





```bash
cd clients/kotlin
./gradlew build           # compile + tests + assemble
./gradlew test            # tests only
./gradlew publishToMavenLocal   # smoke-test publishing (skips signing if no key configured)
```


`JAVA_HOME` 需要 JDK 17+。 Gradle 包裝器處理其他所有事情。

## 超出範圍（故意）

該套件目前提供**線路類型和純 reducer**。以下內容延後到後續 PR：

- Android 應用程式範例（類似 Swift 的 `AHPClient`）
- WebSocket 傳輸/非同步用戶端
- Kotlin 多平台 (KMP) 建置 — JVM 目標足以滿足當前 Android 消費者的需求

## reducer

`Reducers.kt` 公開純 reducer 函式及其符合 `Reducer<S, A>` fun 介面的 `object` 包裝的等效項：





```kotlin
public fun rootReducer(state: RootState, action: StateAction): RootState
public fun sessionReducer(state: SessionState, action: StateAction): SessionState
public fun chatReducer(state: ChatState, action: StateAction): ChatState
public fun terminalReducer(state: TerminalState, action: StateAction): TerminalState
public fun changesetReducer(state: ChangesetState, action: StateAction): ChangesetState
public fun annotationsReducer(state: AnnotationsState, action: StateAction): AnnotationsState
public fun resourceWatchReducer(state: ResourceWatchState, action: StateAction): ResourceWatchState

public fun interface Reducer<S, A> { public fun reduce(state: S, action: A): S }
public object RootReducer : Reducer<RootState, StateAction>      // delegates to rootReducer
public object SessionReducer : Reducer<SessionState, StateAction>
public object ChatReducer : Reducer<ChatState, StateAction>
public object TerminalReducer : Reducer<TerminalState, StateAction>
public object ChangesetReducer : Reducer<ChangesetState, StateAction>
public object AnnotationsReducer : Reducer<AnnotationsState, StateAction>
public object ResourceWatchReducer : Reducer<ResourceWatchState, StateAction>
```


每個 reducer 在 [`StateAction`] 密封介面上分派並處理屬於其通道的操作變體。屬於其他通道的操作（或當伺服器發送比該版本的用戶端所知的更新的操作型別時，線路類型解碼器傳回的未知 `StateActionUnknown` 變體）會陷入 `else -> state` 無操作 — 這與規範的 TypeScript 和 Swift reducer相匹配。

在動作內部解碼的狀態通道聯集遵循相同的原則：當伺服器發出此用戶端無法識別的鑑別器時（例如未來的 `ResponsePart` 類型、`ToolCallState`、`Customization` 型別等），解碼器會將原始 JSON 變體，而不是原始。 `StateActionUnknown` 對未知的操作類型使用相同的形狀。reducer保守地對待這些變體 - `customizationId` 傳回 `null`，因此未知容器不能錯誤匹配真實的 id，當有效負載未知時，`SessionCustomizationUpdated` 會短路到 NoOp，取消會將未知工具呼叫折疊為空已取消的狀態。這些行為完全反映了 Rust reducer。

### 從 TypeScript 手動移植

每個 reducer 都是 `types/channels-*/reducer.ts` 中對應檔案的直接移植。值得注意的機械翻譯：

| TypeScript | Kotlin |
|------------------------------------------------------------------------------------- |------------------------------------------------------------------------------------------------ |
| `{ ...state, foo: bar }` | `state.copy(foo = bar)`|
| `delete next.inputRequests` | `next.copy(inputRequests = null)`（經由 `explicitNulls = false` 折疊到線路消失）|
| `arr.findIndex(...)` + 拼接到位 | `arr.indexOfFirst { ... }` + `toMutableList().also { it[idx] = ... }` |
|條件物件的傳播：`...(opt ? { selectedOption: opt } : {})` |可空白欄位賦值：`selectedOption = opt` |
| `status & ~STATUS_ACTIVITY_MASK | activity` | `SessionStatus((status.rawValue and STATUS_ACTIVITY_MASK.inv()) or activity.rawValue)`|
| `if (action.confirmed)`（對可選列舉進行真實檢查）| `if (action.confirmed != null)` |

Kotlin 連接埠保留了 PR #115 中已記錄的 Swift 奇偶校驗警告：

1. **`T | null` 與 `T?`** — 都折疊為可為空的 Kotlin 欄位。對於 `explicitNulls = false`，兩者都編碼為不存在。
2. **鑑別器驗證** — 沒有執行時間檢查，例如 `MarkdownResponsePart` 的 `kind` 是否符合 `MARKDOWN`。鏡子Swift。對於前向相容聯集，*無法識別的*鑑別器解碼為 `XUnknown(val raw: JsonObject)` 變體（鏡像 Rust 的 `Unknown(serde_json::Value)`）並在重新編碼時往返其原始負載。
3. **`StateActionUnknown`** — 捕捉未知操作的完整原始 JSON 物件（與狀態通道 `XUnknown` 變體的形狀相同）。 reducer 將其視為無操作。重新編碼將原始有效負載往返傳回線路。

### 可注入時間戳

每當工作階段 reducer 改變在語意上提前工作階段修改時間的欄位（回合生命週期、標題變更、代理程式變更、自訂更新、輸入請求變更等）時，它就會標記 `summary.modifiedAt`。這張郵票來自頂`var`：





```kotlin
public var currentTimestampProvider: () -> Long = { System.currentTimeMillis() }
```


測試用常數覆蓋它以產生確定性輸出，然後恢復 `@AfterEach` 中的預設值。提供者是全域可變的狀態；如果您跨 JVM 執行緒並行化測試，請先將一個值插入到 `ThreadLocal` 中。

### 跨語言奇偶校驗測試

`FixtureDrivenReducerTest` 載入 `types/test-cases/reducers/*.json` 下的每個夾具，並驗證 Kotlin reducer 的輸出是否與夾具的 `expected` 狀態相符。夾具與 TypeScript、Swift 和 Rust reducer 實作共享，因此此測試是主要的跨語言奇偶校驗門。

夾具路徑透過 `build.gradle.kts` 中的 `ahp.reducerFixturesDir` 系統屬性連線到測試 JVM，因此測試在 `./gradlew test` 下工作，IDE 執行該委託給 Gradle（IntelliJ 預設值）或 CI，而不依賴目前工作目錄。當 Gradle 和委託執行程式都沒有設定該屬性時，測試會回退到從 `user.dir` 向上尋找 `types/test-cases/reducers/`，因此直接從儲存庫內部執行 IDE JUnit 仍然有效。

一個小的 `SKIPPED_FIXTURES` 集合包含有意跳過的任何裝置，因為它們執行此包尚不支援的線型別解碼行為。 `coverageReport().decodable-fixture-budget` 斷言限制了跳過集合大小，因此迴歸出現在 CI 中。目前覆蓋了完整的 reducer 固定語料庫（`SKIPPED_FIXTURES` 為空，`MAX_SKIPPED_FIXTURES = 0`）。狀態通道聯集（`ResponsePart`、`ToolCallState`、`Customization`、...）上未知判別器的前向相容覆蓋由 `103-delta-skips-parts-without-id.json` 和 `DiscriminatedUnionTest` 中的專用往返測試執行。

### `ReducersTest`

`ReducersTest` 涵蓋了一些受益於明確本地覆蓋的行為：委託給自由函式的 `Reducer<S, A>` `object` 包裝器、`terminal/input` 為無操作（傳回相同實例）、排隊訊息重新排序演算法（保留 `order` 中未提及的訊息；忽略重複項和未知 id）、掛起義、透過排隊人插入更新444} 字詞通過。