# 為代理主機協定做出貢獻

感謝您有興趣為 AHP 做出貢獻。本文件涵蓋
作為貢獻者在此儲存庫中工作的機制 - 對於
協定設計原理請參考 [規格](docs/specification/) 和
[版本控制策略](docs/specification/versioning.md)，以及
削減版本的機制請參閱 [`RELEASING.md`](RELEASING.md)。

> **行為準則：** 參與受
> [微軟開源行為準則](CODE_OF_CONDUCT.md)。

## 儲存庫佈局

這是一個多語言倉庫。 `types/` 下的 TypeScript 類型是規範的
真理的來源；其他一切都是由它們產生或手動維護的
反對他們。

|路徑|這裡住著什麼 |
| --- | --- |
| `types/` |規格 TypeScript 協定類型、reducer、版本登錄。 |
| `schema/` |從 `types/` 產生的 JSON 架構檔。 |
| `docs/` | VitePress 文件來源。 |
| `scripts/` | TypeScript 程式碼產生腳本（每種目標語言一個 + 共用幫助程式）。 |
| `clients/rust/` | `ahp-types`、`ahp`、`ahp-ws` 貨物工作區。 |
| `clients/kotlin/` | Kotlin/JVM 函式庫 (`com.microsoft.agenthostprotocol:agent-host-protocol`)。 |
| `clients/swift/` | Swift 套件（由儲存庫根目錄中的 SwiftPM 使用）。 |
| `clients/typescript/` | npm 套件 `@microsoft/agent-host-protocol`。 |
| `.github/workflows/` | CI 和每個工件的發布管道。 |

## 本機開發循環





```bash
npm install                      # install root tooling
npm run generate                 # regenerate every client + schemas
npm test                         # typecheck + lint + release/changelog verification + reducer tests
```


Per-用戶端建置（僅執行與您的變更相關的內容）：





```bash
cd clients/typescript && npm ci && npm test && npm run build
cd clients/rust && cargo test --workspace
cd clients/kotlin && ./gradlew build
swift build && swift test        # Swift uses the root Package.swift
```


## 發布

發布機制 - 標籤約定、每用戶端發布流程、CI 防護、
以及每個環境的一次性管理設定 - 居住在
[`RELEASING.md`](RELEASING.md)。對於協定層級的版本控制策略，
請參閱[`docs/specification/versioning.md`](docs/specification/versioning.md)。

## 新增變更日誌片段

此儲存庫提供了六個獨立版本的工件（規格 + 五個用戶端），
每個在 [保留變更日誌](https://keepachangelog.com/en/1.1.0/) 中都有自己的 `CHANGELOG.md`
格式。發布工作流程拒絕發布匹配的標籤
`## [X.Y.Z]` 標題缺少。正常的PR不應編輯那些共享的
直接更改日誌檔；在 `docs/.changes/` 下新增 JSON 變更日誌片段
相反。版本 PR 將這些片段折疊成六個變更日誌。

**當您進行更改時新增一行片段**
使用者可見：新的/刪除的/重新命名的/行為改變的操作，
指令、狀態欄位、錯誤、通知、版本常數或公共用戶端
應用程式介面；一個可觀察到的錯誤修復；或任何與安全相關的內容。 **跳過
產生程式碼 (`**/generated/**`)、文件、測試、CI、lint 的片段**
配置、格式化或內部重構，沒有明顯的效果。

片段直接位於 `docs/.changes/` 下方並使用以下形狀：





```json
{
  "type": "added",
  "message": "`session/cancelTurn` action for client-initiated turn cancellation.",
  "issues": [123]
}
```


`type` 必須是 `added`、`changed`、`deprecated`、`removed`、`fixed` 之一，或
`security`。 `message` 是不帶前導 `-` 的變更日誌項目符號文字。
`issues` 是可選的。

當條目適用於規格和所有用戶端（常見的
協定新增的情況）。新增 `targets` 將條目範圍限定為子集：





```json
{
  "type": "fixed",
  "message": "`AhpClient.connect` now rejects with `AhpProtocolError` on negotiation failure.",
  "targets": ["typescript"]
}
```


路徑→片段目標圖：

|觸及源碼路徑|片段目標 |
| --- | --- |
| `types/**`（協定表面）|除非故意縮小範圍，否則省略 `targets`（規格 + 所有用戶端）。 |
| `clients/<lang>/**`（非生成）|僅限用戶端，例如`["rust"]`。 |
| `schema/**` | `["spec"]` |
| `scripts/generate*.ts` 更改任何用戶端產生的輸出 |省略 `targets` 或列出每個受影響的目標。 |

運行 `npm run verify:change-fragments` 以驗證片段。不要發明一個
`## [X.Y.Z]` 標題或直接編輯正常 PR 的變更日誌 - 這就是
根據 [`RELEASING.md`](RELEASING.md) 保留發佈時間。

此規則也被編碼在 [`AGENTS.md`](AGENTS.md) 中，因此 AI 編碼代理
在儲存庫協定中工作遵循相同的約定。

## 程式碼風格和審查

Editor / lint / typecheck 配置位於此儲存庫的 `eslint.config.mjs` 中，
`tsconfig.json` 和（根據-用戶端）等效文件。之前執行 `npm test`
開啟一個PR； CI 執行相同的檢查以及每種語言的建置。

在 `types/` 中的協定表面上進行迭代時，請參閱
[`.github/instructions/general-instructions.instructions.md`](.github/instructions/general-instructions.instructions.md)
專案的編輯規則對型別的修改。

有關語言特定的程式碼產生約定，請參閱每個語言中的 `AGENTS.md` 文件
用戶端目錄（`clients/kotlin/AGENTS.md`、`clients/swift/AGENTS.md`）。