---
name: release-ahp
description: 協調發布 AHP（規格與全部 5 個用戶端）版本，更新每份清單、補上 CHANGELOG 日期、建立含自動合併的版本 PR，並推送每個工件的標籤。使用者提及 release AHP X.Y.Z、publish AHP、cut a release、tag the release 等時，請使用此技能。當發佈工作流程未觸發標籤時，也會引導恢復流程。
---

# 釋放 AHP

此技能為 [`RELEASING.md`](../../RELEASING.md) 的操作對應技能
和橫切 [`AGENTS.md`](../../AGENTS.md)。 `RELEASING.md` 是
每個工件要做什麼的規格參考；這個技能捕捉到了
**操作順序**以及在多神器中咬傷的腳槍
釋放。

該儲存庫提供了六個獨立版本的工件，但它們已發布
依照慣例，將相同的 `X.Y.Z` 固定在所有五個用戶端上
清單和每個版本的規格除非使用者明確要求
否則。

## 什麼時候使用這個技能

使用者想要釋放AHP。典型詢問：

- “發布 AHP 0.3.0”
- “標記發布”、“推送發布標籤”、“運行發布工作流程”
- 「下一個版本將是 X.Y.Z」（意味著發布後的碰撞）
- “發布工作流程沒有在標籤 T 上觸發，您可以重新觸發它嗎”

如果使用者要求**單-用戶端**版本（例如「只需碰撞Rust」），
更喜歡 `.github/prompts/publish-*.prompt.md` 文件 - 這項技能
用於協調跨工件發布。

## 心理模型

一個版本是**一次 PR** 中的兩次提交，加上**第一次推送的六個標籤
合併後提交的 SHA**：

1. **釋放提交** — 將 `docs/.changes/*.json` 片段消耗到
   日期為 `## [X.Y.Z]` CHANGELOG 的部分，會碰撞每個用戶端清單
   之前的版本 → `X.Y.Z`，並重新產生 `release-metadata.json`
   對於每個用戶端。 **所有六個標籤必須指向此提交的 SHA。 **
2. **發布後提交** — 增加 `PROTOCOL_VERSION`
   `types/version/registry.ts` 到下一個計劃版本，將其加入到
   `SUPPORTED_PROTOCOL_VERSIONS`，重新生成每個
   `Version.generated.{rs,kt,swift,go}`，並且加上一個
   根規格 `CHANGELOG.md` 中的 `## [X.Y+1.0] — Unreleased` 佔位符。

## 一步一步

### 0. 擷取輸入

在觸摸任何東西之前，請先與使用者確認：

- **發佈版本** (`X.Y.Z`) — 使用時所使用的版本
  `docs/.changes/*.json` 到六個變更日誌。
- **下一個開發版本**（預設：凹凸次要，即`X.(Y+1).0`）。
- **發布範圍**（預設：所有六個工件；很少發布一個
  隔離）。

### 1.分支+提交1（發布提交）

從 `main` 建立 `release/ahp-<version>`。然後在一次提交中：

- **變更日誌** — 運行
  `npm run changelog:release -- --version X.Y.Z --date <today YYYY-MM-DD>`
  將 `docs/.changes/*.json` 折疊到六個變更日誌中。這創造了
  或替換每個 `## [X.Y.Z] — <today YYYY-MM-DD>` 部分並新增
  `Spec version` / `Implements AHP X.Y.Z.` 自動行。
- **清單** — 將每個本機版本檔案升級為 `X.Y.Z`：
  - `clients/rust/Cargo.toml` `[workspace.package].version` **和**
    `version = "X.Y.Z"` 固定在 `ahp-types`/`ahp` 內部
    `[workspace.dependencies]`。
  - `clients/kotlin/gradle.properties` `VERSION_NAME`。
  - `clients/typescript/package.json` `version`。
  - `clients/swift/VERSION`（裸語意版本，無 `v` 前綴，尾隨換行符）。
  - `clients/go/VERSION`（裸語意版本，無 `v` 前綴，尾隨換行符）。
- **鎖定檔案** — 清單碰撞後刷新：
  - 在 `clients/typescript/` 中：`npm install --no-audit --no-fund`（如果
    已經是最新的，但將版本寫入 `package-lock.json`）。
  - 在`clients/rust/`：`cargo update -w`（僅重寫工作區
    `Cargo.lock` 中的crate - 外面的crate保持固定）。
- **元資料** — 位於儲存庫根目錄：`npm run generate:metadata`。
- **驗證** — 在儲存庫根目錄：`npm test`。這運行
  `verify:change-fragments`、`verify:release-metadata` 和
  `verify:changelog`，它們一起控制釋放：格式錯誤的片段，元資料漂移或缺少 CHANGELOG 標題將在此處失敗，而不是在
  標籤推送時間。

> **不要**在此提交中碰撞 `PROTOCOL_VERSION`。標籤推送
> 工作流程驗證註冊表版本是否與標籤的版本匹配，
> 因此提交 1 仍必須有 `PROTOCOL_VERSION = X.Y.Z`。

提交訊息：





```
release: AHP X.Y.Z
```


**記錄此提交的 SHA。 ** 每個發布標籤都指向它。

### 2. 提交 2（發布後衝擊）

在同一分支上的第二次提交中：

- `types/version/registry.ts`：
  - `PROTOCOL_VERSION = 'X.(Y+1).0'`。
  - `SUPPORTED_PROTOCOL_VERSIONS = ['X.(Y+1).0', 'X.Y.Z', ...]`（最新
    第一；保留先前清單中的所有舊條目）。
- 在儲存庫根目錄執行 `npm run generate` — 這會重新產生每個用戶端
  `Version.generated.*` 和每個 `release-metadata.json`。
- 在根規格 `CHANGELOG.md`中，加入
  `## [X.(Y+1).0] — Unreleased` 佔位符（帶有
  `Spec version: \`X.(Y+1).0\`` 行）低於現有的
  `## [Unreleased]` 部分。 Per-用戶端變更日誌已經保留了
  片段消耗後清空 `## [Unreleased]` 部分。
- 再次執行`npm test`。

提交訊息：





```
chore: bump PROTOCOL_VERSION to X.(Y+1).0 for ongoing development
```


### 3. 開啟具有自動合併功能的PR





```sh
git push -u origin release/ahp-X.Y.Z
gh pr create --base main --head release/ahp-X.Y.Z \
  --title "release: AHP X.Y.Z" \
  --body-file <(...)
gh pr merge <num> --auto --merge
```


**使用 `--merge`，而不是 `--squash`** - 標籤需要提交 1 的 SHA
在合併中倖存。擠壓將兩個提交折疊到新的 SHA 中
`main`，工作流程的 `PROTOCOL_VERSION` 檢查會失敗
因為合併後 HEAD 位於下一個開發版本。合併提交
將兩個原始提交保留為可到達的父項。

如果儲存庫的分支保護強制擠壓，請回退到以下任一方法：

- 在擠壓合併完成之前**標記 SHA（提交保持不變）
  一旦標記就保留），或
- 使用「變基並合併」策略（也保留兩個 SHA）。

在合併之前始終確認哪個策略保留提交 1 的 SHA
`main`，並解決與使用者的任何歧義。

PR 主體應包括：

- 在可複製貼上的變數賦值中釋放 SHA。
- 六個標籤推送指令（請參閱下方的步驟 5）。
- Kotlin 和 TypeScript 透過 Azure DevOps 管道發佈的註釋
  （它們出現在 [agent-host-protocol pipelines 中
  vscode-engineering](https://dev.azure.com/vscode/VSCode/_build))，不是
  GitHub 操作。

### 4. 合併後 — 驗證發布 SHA 是否可達





```sh
git checkout main
git pull --ff-only origin main
git cat-file -t <RELEASE_SHA>   # must print "commit"
```


如果它不存在（儘管有意，但還是發生了），請打開一個後續
在標記之前與使用者進行討論。 **不要**標記被壓扁的東西
在 `main` 上提交 — 其註冊表顯示發布後版本，並且
每個發布工作流程都會拒絕該標籤。

### 5.推送六個標籤





```sh
RELEASE_SHA=<sha from step 1>
git tag spec/v<X.Y.Z>        $RELEASE_SHA
git tag rust/v<X.Y.Z>        $RELEASE_SHA
git tag kotlin/v<X.Y.Z>      $RELEASE_SHA
git tag typescript/v<X.Y.Z>  $RELEASE_SHA
git tag v<X.Y.Z>             $RELEASE_SHA   # Swift — bare per RELEASING.md
git tag clients/go/v<X.Y.Z>  $RELEASE_SHA
git push origin \
  spec/v<X.Y.Z> rust/v<X.Y.Z> kotlin/v<X.Y.Z> \
  typescript/v<X.Y.Z> v<X.Y.Z> clients/go/v<X.Y.Z>
```


六個標籤方案是經過深思熟慮且不可互換的。裸露
`vX.Y.Z` 為 Swift 保留（SwiftPM 僅解析根級標籤）；
Go 模組代理的子模組需要 `clients/go/vX.Y.Z`
分辨率。

### 6. 確認發布運行已開始

對於每個標籤，驗證相應的工作流程運行是否已排隊或在
進展：





```sh
GH_PAGER=cat gh run list --limit 10 \
  --json databaseId,event,headBranch,status,conclusion,workflowName,displayTitle
```


預計在幾秒鐘內看到四個 GH 操作運行（下面每個標籤一個）：

|標籤 |工作流程|發佈到 |
| -------------------- | -------------------- | ------------ |
| `spec/vX.Y.Z` | `Publish Spec` | GitHub 發布（架構資產）|
| `rust/vX.Y.Z` | `Publish Rust Crates` | crates.io (`ahp-types`, `ahp`, `ahp-ws`) |
| `vX.Y.Z` | `Publish Swift Package` | SwiftPM（標籤解析）|
| `clients/go/vX.Y.Z` | `Publish Go Module` | Go 模組代理程式（標記解析）|

其餘兩個標籤觸發未出現的 Azure DevOps 管道
在`gh run list`中：

|標籤 | ADO 管道 |發佈到 |
| -------------------- | ------------------------------------------------ | ------------ |
| `kotlin/vX.Y.Z` | `clients/kotlin/pipeline.yml` |經過 ESRP 的 Maven Central |
| `typescript/vX.Y.Z` | `clients/typescript/pipeline.yml` |透過 ESRP 進行 npm |

對於 Kotlin/TypeScript，將使用者連結到 ADO 中的 AHP 管道
（`vscode-engineering` 租戶）以確認運行已開始。兩者都
管道也可以作為修補程式從 ADO UI 手動觸發
逃生艙口－每個管道內的驗證步驟是相同的
到標籤觸發的路徑。

## 恢復 — 已推送標籤但未觸發發布運行

這已經發生了。症狀：`origin` 上有標籤，但 `gh run list` 上有標籤
顯示沒有對應的工作流程運作。

目前，四個 GH Actions 發布工作流程均未聲明
`workflow_dispatch`，因此手動調度不可用。復甦
是**刪除遠端標籤並在相同的 SHA 處重新推送它** - 這
發出新的推送事件而不更改標記的提交：





```sh
git push origin --delete <tag>
git push origin <tag>
```


**不要**在與下列內容相同的 `git push` 指令中包含 `--delete`d 標記
重新推送 — 將它們推送到單獨的 `git push` 呼叫中，以便每個標籤
發出自己的推播事件。在單一命令中重新推送多個標籤
有時會合併為一個事件，並且僅觸發一個工作流程。

驗證恢復後，建議後續新增 PR
`workflow_dispatch:` 到四個發布工作流程，因此下一個錯過了
觸發器可以從操作 UI 重新運行，而無需標記抖動。

## 常見的步槍

- **`git commit`** 期間的 GPG 簽章鎖定 — 如果您看到
  `gpg: keydb_search failed: Operation timed out`，運行
  `gpgconf --kill all && rm -f ~/.gnupg/public-keys.d/pubring.db.lock`
  並重試提交。
- **在提交 1 中碰撞 `PROTOCOL_VERSION` ** — 發布工作流程
  根據標記的提交的 `PROTOCOL_VERSION` 重新驗證標記，
  因此，指向發布後提交的發布標籤無法通過「驗證
  標記匹配”步驟。始終將碰撞保持在提交 2 中。
- **忘記 Rust `[workspace.dependencies]` 腳** - 只是碰撞
  `[workspace.package].version` 離開交叉crate `ahp-types`/`ahp`
  固定在舊版上。 `verify-release-metadata` 沒有捕捉到這一點
  但 `cargo publish --dry-run` 會的。
- **忘記 `cargo update -w`** — 沒有它，`Cargo.lock` 會保留
  ahp-types/ahp/ahp-ws 的舊版本，結果提交是
  部分碰撞。 CI 的每種語言的偏差檢定可以捕捉它。
- **忘記 `VERSION`** 中的 Swift/Go 尾隨換行符 —
  `read*PackageVersion` 輔助修剪，所以功能上沒問題，但是
  約定是`0.3.0\n`。- **混合 Swift 標記命名空間** - Swift 使用**裸** `vX.Y.Z`
  （無前綴）。所有其他工件都有一個前綴。推桿`swift/vX.Y.Z`
  Swift 的標籤上的 SwiftPM 解析度會默默地破壞。
