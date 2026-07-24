# 釋放 AHP

本文件涵蓋了切割任何可交付版本的機制
這個倉庫中的工件。對於協定級版本控制策略 (SemVer
規格本身的規則、支援的版本視窗等）請參閱
[`docs/specification/versioning.md`](docs/specification/versioning.md)。

## 發布模型

此儲存庫中的每個可交付工件均使用其獨立版本
生態系的原生SemVer。協定規格是第五個工件
有自己的發布節奏。每個用戶端版本都會宣傳哪一個協定
它透過產生的 `SUPPORTED_PROTOCOL_VERSIONS` 常數支援的版本
和簽入的`clients/<lang>/release-metadata.json`。

## 變更日誌片段

正常功能/修復 PR 不會直接編輯 `CHANGELOG.md` 檔案。他們新增
`docs/.changes/` 下的一個或多個 JSON 片段；省略 `targets` 適用
規格和所有五個用戶端的條目，而 `targets` 可以決定條目的範圍
為 `spec`、`rust`、`kotlin`、`typescript`、`swift` 和 `go` 的任一子集。

在標記協調發布之前，將這些片段折疊成六個
保留更改日誌檔：





```sh
npm run changelog:release -- --version X.Y.Z --date YYYY-MM-DD
```


預設情況下，此指令針對所有工件。對於單一工件修補，請透過
`--targets rust`（或 `spec`、`kotlin`、`typescript`、`swift`、`go`；逗號分隔
子集的多個目標）。該命令建立或替換
每個選定工件變更日誌中的 `## [X.Y.Z] — YYYY-MM-DD` 部分都新增了
`Spec version` / `Implements AHP`行，在標準下將片段訊息分組
`Added` / `Changed` / `Fixed` 小節，並刪除消耗的片段檔。
如果片段也針對未包含在 `--targets` 中的工件，則該指令
用剩餘的目標重寫該片段，以便以後的版本仍然可以
消耗它。如果您只在發布前運行 `npm run verify:change-fragments`
想要驗證片段 JSON 而不消耗它。

## 標籤約定

|神器|標籤圖案|工作流程|註冊/發現|
| ---------- | ------------------- | --------------------------------- | -------------------- |
| 規格 | `spec/vX.Y.Z` | `.github/workflows/publish-spec.yml` |有架構資產的 GitHub 版本。 |
| Rust | `rust/vX.Y.Z` | `.github/workflows/publish-rust.yml` | crates.io（`ahp-types`、`ahp`、`ahp-ws`）。 |
| Kotlin | `kotlin/vX.Y.Z` | `clients/kotlin/pipeline.yml`（Azure DevOps）|透過 ESRP 的 Maven Central (`com.microsoft.agenthostprotocol:agent-host-protocol`)。 |
| TypeScript | `typescript/vX.Y.Z` | `clients/typescript/pipeline.yml`（Azure DevOps）| npm (`@microsoft/agent-host-protocol`) 經由 ESRP。 |
| Swift | `vX.Y.Z`（裸）| `.github/workflows/publish-swift.yml` | SwiftPM 直接解析標籤。 |
| Go | `clients/go/vX.Y.Z` | `.github/workflows/publish-go.yml` | Go模組代理直接解析標籤。 |

> **為什麼 Swift 取得裸 semver 標籤命名空間：** SwiftPM 僅解析
> 透過符合清單中的普通 `X.Y.Z` / `vX.Y.Z` git 標籤來打包
> 倉庫根目錄。像 `swift/v0.2.0` 這樣的路徑前綴標籤對它來說是不可見的。裸露
> 因此，此儲存庫根目錄中的 semver 標記是為 Swift 版本保留的。

> **為什麼 Go 使用 `clients/go/` 前綴：** Go 的模組版本解析
> 對於子模組路徑，需要標籤前綴與模組的匹配
> 儲存庫內的目錄（請參閱 [`go help mod` › 模組版本](https://go.dev/ref/mod#vcs-version)）。
> 沒有前綴，`go get github.com/microsoft/agent-host-protocol/clients/go@vX.Y.Z`
> 將無法找到符合的標籤。

> **為什麼 TypeScript 和 Kotlin 從 Azure DevOps 發佈：** npm
> `@microsoft/agent-host-protocol` 和 Maven 的註冊表發布
> 集中發布 `com.microsoft.agenthostprotocol:agent-host-protocol`
> 兩者都經過 Microsoft ESRP 支援的 `vscode-engineering` 管道
> 範本（1ES 託管代理、簽章發佈、保留策略）—
> 機器存在於 Azure DevOps 中。 GitHub Actions 無法觸發 ADO
> 此儲存庫中的管道（不允許 PAT），因此 ADO 管道
> 直接擁有 `typescript/vX.Y.Z` 和 `kotlin/vX.Y.Z` 標籤觸發器
> 並執行相同的驗證步驟（標籤 ↔ 清單匹配，CHANGELOG
> 條目、發布元資料、生成源新鮮度、完整的用戶端構建
> + 測試），然後再交給 ESRP。每個管道還可以
> 作為修補程式逃生艙口從 ADO UI 手動觸發。

## 每-用戶端發布流程

### Rust (`rust/vX.Y.Z`)

1. 在 `clients/rust/Cargo.toml` 中碰撞 `[workspace.package].version`（這
   將所有三個crate — `ahp-types`、`ahp`、`ahp-ws` — 碰撞在一起；的
   工作區有意進行版本鎖定）。
2. 更新跨crate`version = "0.X.Y"`引腳
   `[workspace.dependencies]` 和任何每個crate的依賴聲明。
3.運行`npm run generate:metadata`並提交重新生成的
   `clients/rust/release-metadata.json`。
4. 折疊 Rust 範圍的變更日誌片段
   `npm run changelog:release -- --version X.Y.Z --targets rust`。
5. 合併到`main`。
6. 標籤：`git tag rust/v0.X.Y && git push origin rust/v0.X.Y`。
7. `publish-rust.yml` 驗證，然後發布 `ahp-types`、`ahp` 和
   依依賴順序將 `ahp-ws` 傳送到 crates.io。

### Kotlin (`kotlin/vX.Y.Z`)

1. 在 `clients/kotlin/gradle.properties` 中碰撞 `VERSION_NAME`。刪除任何
   `-SNAPSHOT` 後綴（發佈工作流程拒絕快照標籤）。
2.運行`npm run generate:metadata`並提交重新生成的
   `clients/kotlin/release-metadata.json`。
3. 折疊 Kotlin 範圍的變更日誌片段
   `npm run changelog:release -- --version X.Y.Z --targets kotlin`。
4. 合併到`main`。
5. 標籤：`git tag kotlin/v0.X.Y && git push origin kotlin/v0.X.Y`。
6. `clients/kotlin/pipeline.yml` (Azure DevOps) 驗證標籤，
   重新運行生成器 + Gradle `check`，取得 GPG 簽章金鑰
   從 `vscode` Key Vault，階段**和 GPG 簽章** Maven
   `clients/kotlin/build/maven-staging/` 下的儲存庫佈局，以及
   將其交給 ESRP (`contenttype: maven`)。 ESRP上傳簽章的
   透過 Sonatype Central Portal 將工件傳送到 Maven Central。無說明書
   需要 Sonatype UI 互動。
7. 將 `VERSION_NAME` 跳回下一個 `-SNAPSHOT` 進行持續開發。

### TypeScript (`typescript/vX.Y.Z`)

TypeScript 用戶端從 Azure DevOps 管道發布
(`clients/typescript/pipeline.yml`) 擴充了 Microsoft 的內部
`vscode-engineering` npm 套件模板。 ADO 擁有標籤觸發器
直接 - 沒有 GitHub Actions 橋 - 因為這個 repo 不能
使用 PAT 從 GHA 觸發 ADO。

1. 在 `clients/typescript/package.json` 中碰撞 `version`。
2. `cd clients/typescript && npm install` 刷新鎖定檔。
3. 從儲存庫根目錄執行 `npm run generate:metadata` 並提交
   再生`clients/typescript/release-metadata.json`。
4. 折疊 TypeScript 範圍的變更日誌片段
   `npm run changelog:release -- --version X.Y.Z --targets typescript`。
5. 合併到`main`。
6. 標籤：`git tag typescript/v0.X.Y && git push origin typescript/v0.X.Y`。
7. ADO 管道取得標籤，並根據
   `package.json`，運行`verify:release-metadata`，`verify:changelog`，
   以及再生+建置+測試序列，然後發布
   `@microsoft/agent-host-protocol` 到 npm，並以簽名出處
   vscode 工程模板。

ADO 管道也可以從 ADO UI 手動觸發
修補程式逃生艙口 - 手動運行也發布。兩條路徑都漏斗
通過管道的 `buildSteps` 中的相同驗證步驟，因此
無論哪種方式，發布工件都無法從損壞的狀態中發貨
觸發器開始運作。

### Swift（`vX.Y.Z`，裸）

1. 將 `clients/swift/VERSION` 更新為新的裸 semver 字串（無
   前導 `v`，無 `-SNAPSHOT`)。
2. 執行`npm run generate:metadata`並提交重新生成的
   `clients/swift/release-metadata.json`。
3. 折疊 Swift 範圍的變更日誌片段
   `npm run changelog:release -- --version X.Y.Z --targets swift`。
4. 合併到`main`。
5. 標籤：`git tag v0.X.Y && git push origin v0.X.Y`。 **注意沒有
   任何前綴** — 這是儲存庫中裸 semver 標記的一個位置
   是正確的。
6. `publish-swift.yml` 根據 `clients/swift/VERSION` 驗證標籤，
   在 macOS 上建置並測試 Swift 包，並發布 GitHub
   釋放。 SwiftPM消費者直接解析標籤；沒有註冊表推送
   發生。

### Go (`clients/go/vX.Y.Z`)

1. 將 `clients/go/VERSION` 更新為新的裸 semver 字串（無前導）
   `v`，沒有`-SNAPSHOT`）。
2.運行`npm run generate:metadata`並提交重新生成的
   `clients/go/release-metadata.json`。
3. 折疊 Go 範圍的變更日誌片段
   `npm run changelog:release -- --version X.Y.Z --targets go`。
4. 合併到`main`。
5. 標籤：`git tag clients/go/v0.X.Y && git push origin clients/go/v0.X.Y`。
   **需要 `clients/go/` 前綴** — 這是 Go 模組的內容
   代理程式需要子模組標籤解析。裸 semver 標籤是
   為Swift保留。
6. `publish-go.yml` 根據 `clients/go/VERSION` 驗證標籤，
   建置 + 審查 + 測試模組，使用以下命令預熱 Go 模組代理
   新版本，並使用 CHANGELOG 部分建立 GitHub Release
   對於標籤。 Go 消費者透過以下方式解析標籤
   `go get github.com/microsoft/agent-host-protocol/clients/go@vX.Y.Z`；
   沒有發生註冊表推送。

### 規格 (`spec/vX.Y.Z`)

1. 在 `types/version/registry.ts` 中碰撞 `PROTOCOL_VERSION`（並且，如果
   版本還將該版本新增到支援列表中，
   `SUPPORTED_PROTOCOL_VERSIONS`）。
2. 更新任意的 `ACTION_INTRODUCED_IN` / `NOTIFICATION_INTRODUCED_IN`
   新符號。
3.運行`npm run generate`刷新架構，產生用戶端來源，
   和元資料。
4. 折疊規格範圍的變更日誌片段
   `npm run changelog:release -- --version X.Y.Z --targets spec`。
5. 合併到`main`。
6. 標籤：`git tag spec/v0.X.Y && git push origin spec/v0.X.Y`。
7. `publish-spec.yml` 驗證並重新產生 JSON 模式
   帶標記的提交，捕獲引入的 `registry-snapshot.json`
   映射，並使用上述所有內容作為資產建立 GitHub 版本。

## CI 防範什麼

|漂移被|如何|
| --- | --- |
| `Version.generated.{rs,kt,swift,go}` ↔ `types/version/registry.ts` |每個語言的 CI 作業重新運行 `npm run generate:<lang>` 並在差異上失敗。 |
| `release-metadata.json` ↔ 本機清單 + 註冊表 | `npm run verify:release-metadata`（也對每個發布工作流程進行門控）。 |
| `docs/.changes/*.json` 形狀 | `npm run verify:change-fragments` 在發布崩潰之前驗證片段型別、訊息、目標和問題引用。 |
|本機套件版本 ↔ 符合 CHANGELOG 條目 | `npm run verify:changelog`（在 CI 中，並在 `publish-rust.yml` / `publish-swift.yml` / `publish-go.yml` / 兩個 ADO `pipeline.yml` 中重新執行）。 |
|標籤 ↔ 清單版本 |每個標記驅動的發布工作流程的「驗證標記符合」步驟。 |
|標籤派生版本 ↔ CHANGELOG 條目 |每個標記驅動的發布工作流程的 `grep -qE '^## \[<tag-version>\]'` 步驟（與 `verify:changelog` 一起進行深度防禦）。 |

## 所需的基礎設施（一次性設定）

發布工作流程需要這些環境和機密
功能。它們由具有管理員存取權限的維護者按儲存庫設定。

|環境/秘密 |使用者 |目的|
| --- | --- | --- |
| `crates-io` 環境，`CARGO_REGISTRY_TOKEN` 秘密 | `publish-rust.yml`|驗證 `ahp-types` / `ahp` / `ahp-ws` 的 `cargo publish`。 |
| Azure DevOps 服務連線到 ESRP + Maven 中央設定 | `clients/kotlin/pipeline.yml`（vscode-engineering `maven-package` 範本）|透過 Sonatype Central Portal 將 GPG 簽署的暫存 Maven 佈局上傳到 Maven Central。在 Microsoft ADO 租用戶內設定；不需要 GitHub 秘密。 |
| `vscode` Key Vault 機密 `maven-gpg-private-key` + `maven-gpg-passphrase` | vscode-engineering `maven-package` 模板 (`AzureKeyVault@2`)，由 `clients/kotlin/pipeline.yml` | 使用用於簽署 Kotlin Maven 工件 (`.asc`) 的 GPG RP |匹配的公鑰必鬚髮佈到密鑰伺服器。在 Microsoft ADO 租用戶內設定；不需要 GitHub 秘密。 || Azure DevOps 服務連線到 ESRP + npm 發佈信用 | `clients/typescript/pipeline.yml`（vscode-engineering `npm-package` 範本）|為 `@microsoft/agent-host-protocol` 驗證 `npm publish`。在 Microsoft ADO 租用戶內設定；不需要 GitHub 秘密。 |
|（無）| `publish-swift.yml`，`publish-spec.yml`，`publish-go.yml` |這三個都使用預設的 `GITHUB_TOKEN` 來建立 GitHub 版本。無需外部註冊表憑證 - 直接使用 SwiftPM 和 Go 模組代理程式索引標記。 |