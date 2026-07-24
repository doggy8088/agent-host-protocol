# 變更集

**變更集**是一個命名的、可單獨訂閱的檔案變更視圖
與工作階段關聯。變更集概括了 v0.1.0
`SessionSummary.diffs` 欄位：工作階段可以公開任意數量的
變更集 - 未提交的工作樹編輯，兩輪之間的差異，
整個工作階段的累積變化、階段索引等——
每個都有自己的 URI、生命週期和更新流。

## 概念

### 變更集目錄

每個工作階段的 `SessionState` 通告一組變更集
伺服器可以產生。目錄條目有意輕量化——
足以渲染晶片或列表行而無需訂閱 - 並且
透過 URI 引用完整的可訂閱 `ChangesetState`。





```typescript
SessionState {
  // ...existing fields...
  changesets?: Changeset[]
}

Changeset {
  /** Human-readable label, e.g. `"Uncommitted Changes"`. */
  label: string
  /** RFC 6570 URI template; expand to obtain a subscribable URI. */
  uriTemplate: string
  description?: string
  /**
   * Advisory hint: one of `'session'`, `'branch'`, `'uncommitted'`,
   * `'turn'`, or `'compare-turns'`. Other values allowed.
   */
  changeKind: string
  /** Optional capability declarations (presence-flag objects). */
  capabilities?: {
    /** Present ⇒ this changeset supports the per-file review workflow. */
    review?: {}
  }
}
```


### URI 模板和變數

`uriTemplate` 是 [RFC 6570](https://www.rfc-editor.org/rfc/rfc6570)
URI 模板。用戶端用具體值展開它以獲得
可訂閱變更集 URI。僅以下變數名
本協定定義的；用戶端應忽略包含以下內容的模板
未知的變數。

|模板中的變數 |意義|
|---------------------------------------------------------------- |-------------------------------------------------------------------------------- |
| _（無）_ |靜態、工作階段范圍的變更集。模板本身就是一個可訂閱的 URI。 |
| `{turnId}` |每轉切片。使用工作階段的聊天中的 `Turn.id` 展開。     |
| `{originalTurnId}` 和 `{modifiedTurnId}` |兩圈之間的差異。兩者都必須在場。                                |

### 多根工作階段

變更集的範圍不限於單一工作目錄－每輪或
工作階段範圍的變更集會自然會跨越代理觸及的每個目錄。一個
想要呈現按目錄分組的變更的用戶端會自行執行此操作，方法是
將每個檔案的 URI 與工作階段的 URI 進行匹配
[`workingDirectories`](/guide/state-model#multiroot-sessions)（列表
用戶端已經有了）；不關心的用戶端只是渲染一棵樹。

主機「還」可以廣告專用的每個目錄變更集－一個目錄
每個工作目錄的項目 - 對於更喜歡伺服器範圍視圖的用戶端。這個
不需要額外的欄位：`changesets`目錄已經是列表，因此主機
將每個目錄的一個條目與跨目錄一起列出。

### 變更集狀態

每個具體（擴展）變更集 URI 都是自己的可訂閱資源。





```typescript
ChangesetState {
  status: 'computing' | 'ready' | 'error'
  error?: ErrorInfo
  files: ChangesetFile[]
  operations?: ChangesetOperation[]
}

ChangesetFile {
  id: string                               // typically `after.uri` (or `before.uri` for deletions)
  edit: FileEdit                           // reuses the existing FileEdit shape
  reviewed?: boolean                       // GitHub-style "Viewed" flag; absent ⇒ not reviewed
  _meta?: Record<string, unknown>
}
```


更新串流透過變更集範圍內的操作，廣播給訂閱者
變更集 URI 的：

| 型別 | 用戶端-可調度？ |當 |
| ----------------------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| `changeset/statusChanged` |沒有 | `status` 已轉換（例如 `computing → ready`）。                            |
| `changeset/fileSet` |沒有 |更新插入 `ChangesetFile`（新的或用 `id` 取代現有的）。                |
| `changeset/fileRemoved` |沒有 |檔案不再位於變更集中。                                        |
| `changeset/filesReviewChanged` |是的 |審閱者在一個或多個文件上切換了 `reviewed` 標誌。                 |
| `changeset/contentChanged` |沒有 |完全取代文件，可選擇包含操作或錯誤詳細資料。      || `changeset/operationsChanged` |沒有 |可用的`operations`集合發生了變化。                                   |
| `changeset/operationStatusChanged` |沒有 |單一運算的 `status` 已轉換（例如 `idle → running → error`）。  |
| `changeset/cleared` |沒有 |所有檔案都已刪除（例如分支切換，或所屬的工作階段結束）。       |

### 文件審查

**審查是變更集的功能。 **變更集宣傳對以下內容的支援：
其目錄 `Changeset` 條目的審核工作流程透過
`capabilities.review`（存在標記物件）。用戶端請預先在
工作階段的變更集列表，以便他們可以決定是否顯示審核 UI
無需先訂閱。當能力不存在時，變更集不存在
可審查。

對於可審查的變更集，每個 `ChangesetFile` 都帶有一個可選的 `reviewed`
flag — 相當於 GitHub 的每個檔案 **「已檢視」** 複選框。一個失蹤的
值被視為**未審查**。

與 `changeset/*` 家族的其他成員不同，
`changeset/filesReviewChanged` 操作是 **用戶端-可分派**：審閱者
直接切換檔案的審核狀態，透過樂觀地應用它
預寫 reducer 並讓伺服器在正常的 `action` 上回顯它
包絡流。伺服器也可以發起它（例如，代理標記自己的
審查輸出）。該操作是**批次的** — 它帶有一個檔案 ID 列表，
全部移到相同的 `reviewed` 值。





```typescript
// dispatched by a client (or the server)
{
  type: 'changeset/filesReviewChanged'
  files: string[]       // ChangesetFile.id values
  reviewed: boolean     // true marks the files reviewed, false clears them
}
```


reducer 在每個列出的檔案上設定 `reviewed`
更改集，保持每個檔案的 `edit` 和 `_meta` 不變。沒有的 ID
匹配當前文件被忽略；當沒有匹配時，該操作是無操作。

**編輯時重置。 ** 該協定沒有每個文件的內容版本，因此審核是
當文件內容在穩定 ID 下發生變更時，**不**自動重設。的
伺服器，即更改內容的權威，明確重置審核 -
透過重新發出檔案（透過 `changeset/fileSet` 或
`changeset/contentChanged`) 沒有 `reviewed: true`，或透過調度
`changeset/filesReviewChanged` 與 `reviewed: false`。

### 變更集操作

**變更集操作**是一個伺服器宣告的可呼叫動詞用戶端
可以針對變更集、檔案或範圍運作—「復原」和類似的
文件級操作。更豐富的 SCM 工作流程，例如分段變更或
建立拉取請求最好表達為專用命令或
技能按鈕而不是變更集操作。





```typescript
ChangesetOperation {
  id: string
  label: string
  description?: string
  scopes: ChangesetOperationScope[]   // 'changeset' | 'resource' | 'range'
  /**
   * When set, the client should prompt the user for confirmation before
   * invoking the operation, using this text as the prompt body.
   */
  confirmation?: StringOrMarkdown
  icon?: string
  /**
   * Execution status of the operation. The server sets `'running'` while
   * an invocation is in flight, `'error'` (with `error`) when the most
   * recent invocation failed, `'disabled'` when the operation cannot
   * currently be invoked, and `'idle'` otherwise.
   */
  status: 'idle' | 'running' | 'error' | 'disabled'
  /** Present iff `status === 'error'`. */
  error?: ErrorInfo
}
```


因為 `invokeChangesetOperation` 是一個請求/回應命令，
操作的進度和結果反映回變更集狀態
透過 `changeset/operationStatusChanged` 操作，以便每個訂閱者
觀察一致的視圖（例如「建立拉取請求」上的旋轉器
按鈕，或「恢復」失敗後出現內聯錯誤）。該行動的目標是
`operationId` 的單一操作，如果沒有操作，則為無操作
id 當前存在。

操作透過 `invokeChangesetOperation` JSON-RPC 呼叫
命令（不是通過調度的操作，因為它們傳回資料並且可能
每次呼叫都會失敗）。狀態操作流回所導致的變化
透過正常的 `changeset/*` 操作流。





```typescript
invokeChangesetOperation(params: {
  channel: URI
  operationId: string
  target?:
    | { kind: ChangesetOperationTargetKind.Resource; resource: URI; side?: 'before' | 'after' }
    | { kind: ChangesetOperationTargetKind.Range; resource: URI; side?: 'before' | 'after'; range: TextRange }
}) → {
  message?: StringOrMarkdown
  followUp?: {
    content: ContentRef
    /** When true, open in an external handler (e.g. browser) rather than inline. */
    external?: boolean
  }
}
```


伺服器驗證變更集中存在 `operationId`
目前的 `operations` 列表，而請求的目標的 `kind` 是
包含在操作的 `scopes` 中。無效組合會導致
JSON-RPC 錯誤。

## 生命週期

1. 伺服器在 `SessionState.changesets` 上發佈目錄。
   更新依賴於 `session/changesetsChanged` 操作。
2. 用戶端選擇其範本變數可以的目錄項目
   滿足並訂閱生成的 URI。
3. 伺服器回傳一個 `ChangesetState` 快照 (`status: 'computing'`
   如果掃描是非同步的，則允許）並且可以推送 `changeset/contentChanged`
   對於初始批次檔快照，可選地包括操作或
   錯誤詳細資訊，後跟更窄的 `changeset/*` 操作（如文件或
   操作發生變化。
4. 使用者呼叫`ChangesetOperation`。用戶端呼叫
   `invokeChangesetOperation`。伺服器應用操作並
   發出任何產生的變更集更新。
5. 當工作階段結束時，其所有變更集隱式變為
   不可訂閱。現有訂閱接收 `changeset/cleared`
   伺服器取消訂閱它們。

## 從 v0.1.0 遷移

`summary.diffs` 欄位和 `session/diffsChanged` 操作是
在 v0.2.0 中刪除。先前填入 `summary.diffs` 的伺服器
應該公開一個等效的帶有靜態的伺服器端變更集
`uriTemplate` 以 `/changeset/session` 結尾並顯示其
新的 `summary.changes` 欄位的聚合計數。用戶端那
想要一個“工作階段-wide”差異視圖訂閱該視圖
變更集 URI。