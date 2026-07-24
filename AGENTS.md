# 代理指南 — 代理主機協定儲存庫

在此儲存庫中工作的 AI 編碼代理的橫切規則。每-用戶端
codegen 約定位於 `clients/kotlin/AGENTS.md` 中，
`clients/swift/AGENTS.md`和`clients/go/AGENTS.md`。編輯規則
協定類型位於
`.github/instructions/general-instructions.instructions.md`。釋放機制
位於 [`RELEASING.md`](RELEASING.md) 中。

## 新增變更日誌片段

該儲存庫附帶了六個獨立版本的工件（規格加上
Rust / Kotlin / Swift / TypeScript / Go 用戶端），每個都有其
擁有 Keep-a-Changelog 格式的 `CHANGELOG.md`。發布工作流程
拒絕發布匹配 `## [X.Y.Z]` 標題的標籤
失蹤了。為了避免共享 `CHANGELOG.md` 檔案中的合併衝突，
正常的 PR 在 `docs/.changes/` 下新增 JSON 變更日誌片段
直接編輯變更日誌。 Release PR 折疊那些片段
使用 `npm run changelog:release` 進入六個變更日誌。

### 何時新增條目

每當您進行更改時新增一行片段
**使用者可見**：

- 新的、刪除的、重新命名的或行為改變的操作、指令，狀態
  `types/` 中的欄位、錯誤、通知或版本常數。
- 其中一個新的、刪除的或行為改變的公共 API
  `clients/<lang>/` 來源樹（建構函式簽名，導出
  功能/類型、傳輸選項、reducer 輸出等）。
- 修正了更改規格或消費者的可觀察行為的錯誤
  任何用戶端。
- 與安全相關的變更（使用 `"type": "security"`）。

**當純粹的更改時，跳過該片段**：

- 在 `**/generated/**` 下進行編輯（這些內容反映了 `types/` 的更改，應
  有自己的條目）。
- `docs/`、`README.md`、評論、AGENTS.md、CONTRIBUTING.md 中的文件。
- 測試、CI、lint 配置、格式化、內部重構，沒有可觀察的
  效果。

### 以哪個工件為目標

每個片段可以指定一個 `targets` 陣列。相同時省略 `targets`
條目適用於規格和所有用戶端（協定的常見情況
表面變化）。當變更僅可見時，將 `targets` 設為子集
到特定的工件。

將來源路徑映射到片段目標：

|觸及源碼路徑|片段目標 |
| --- | --- |
| `types/**`（協定表面）|省略 `targets`（規格 + 所有用戶端），除非故意縮小可見範圍。 |
| `clients/rust/**`（非生成）| `"targets": ["rust"]` |
| `clients/kotlin/**`（非生成）| `"targets": ["kotlin"]` |
| `clients/swift/**`（非生成）| `"targets": ["swift"]` |
| `clients/typescript/**`（非生成）| `"targets": ["typescript"]` |
| `clients/go/**`（非生成）| `"targets": ["go"]` |
| `schema/**` | `"targets": ["spec"]` |
| `scripts/generate*.ts` 更改任何用戶端產生的輸出 |省略 `targets` 或列出每個受影響的目標。 |

### 格式

在`docs/.changes/`下建立一個唯一命名的JSON文件，通常
`docs/.changes/YYYYMMDD-short-slug.json`。使用小寫的 Keep-a-Changelog
類型：`added`、`changed`、`deprecated`、`removed`、`fixed`、`security`。
不要在 `message` 中包含主要的 Markdown 項目符號。





```json
{
  "type": "added",
  "message": "`session/cancelTurn` action for client-initiated turn cancellation.",
  "issues": [123]
}
```


僅限範圍用戶端的範例：





```json
{
  "type": "fixed",
  "message": "`AhpClient.connect` now rejects with `AhpProtocolError` on negotiation failure.",
  "targets": ["typescript"]
}
```


**不要**編輯 `CHANGELOG.md` 檔案以取得正常功能/修復 PR 並執行
不要發明 `## [X.Y.Z]` 標題。變更日誌由版本更新
根據 [`RELEASING.md`](RELEASING.md) 的維護者。運行
`npm run verify:change-fragments` 驗證片段 JSON。