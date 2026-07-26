/**
 * 變更集狀態類型 — 在 `ahp-changeset:` 通道上公開的檔案變更檢視之
 * 目錄與每個變更集的狀態。
 *
 * @module channels-changeset/state
 */

import type { StringOrMarkdown, FileEdit, ErrorInfo } from '../common/state.js';

// ─── Changesets ──────────────────────────────────────────────────────────────

/**
 * 目錄項目，描述伺服器可為工作階段產生的單一變更集。
 *
 * 目錄項目刻意保持輕量 — 僅足以在未訂閱的情況下呈現晶片或清單列。
 * 完整的每個變更集詳情（{@link ChangesetState}）位於可透過展開
 * {@link uriTemplate} 取得的可訂閱 URI 上。
 *
 * @category Changesets
 */
export interface Changeset {
  /** 人類可讀的標籤，例如 `"Uncommitted Changes"`。 */
  label: string;
  /**
   * RFC 6570 URI 樣板。用戶端使用標準的 `{name}` 語法直接從樣板中
   * 解析變數 — 變數不在此重新宣告。
   *
   * 本協定僅定義以下樣板形式；任何其他變數名稱 MUST 被用戶端忽略
   * （沒有協定定義的方式可取得未知變數的值）：
   *
   * | 樣板中的變數                                 | 意義                                                                                |
   * | ------------------------------------------- | ------------------------------------------------------------------------------------ |
   * | _(無)_                                      | 靜態的、整個工作階段範圍的變更集。樣板本身即為可訂閱的 URI。                          |
   * | `{turnId}`                                  | 每回合切片。以工作階段中的 `Turn.id` 展開。                                          |
   * | `{originalTurnId}` 與 `{modifiedTurnId}`    | 兩個回合間的差異。兩個變數 MUST 同時存在。                                            |
   *
   * 未來的協定版本 MAY 新增新的已知變數。
   */
  uriTemplate: string;
  /** 選用的較長描述。 */
  description?: string;
  /**
   * 建議性提示，描述此變更集的種類，讓用戶端可以在不解析
   * {@link uriTemplate} 的情況下分組、排序或呈現適當的圖示。已知的值包含：
   *
   * - `'session'`：靜態的、整個工作階段範圍的變更集，涵蓋代理程式
   *   在此工作階段中產生的所有變更。
   * - `'branch'`：相對於基準分支的變更（例如將功能分支與 `main` 做
   *   差異比對）。
   * - `'uncommitted'`：工作區當前未提交的變更。
   * - `'turn'`：由單一回合產生的變更。通常與 {@link uriTemplate} 中的
   *   `{turnId}` 變數搭配。
   * - `'compare-turns'`：兩個回合間的差異。通常與 {@link uriTemplate} 中的
   *   `{originalTurnId}` 與 `{modifiedTurnId}` 變數搭配。
   *
   * 實作 MAY 提供額外的值；當遇到未知值時，用戶端 SHOULD 退回到
   * 合理的預設值。
   */
  changeKind: string;
  /**
   * 此變更集的選用能力宣告。不存在（或為空物件）表示此變更集未公告任何
   * 選用能力。
   *
   * 由於目錄項目會預先隨 {@link ChangesetState | 工作階段的變更集清單}
   * 傳遞，用戶端可在未先訂閱變更集 URI 的情況下決定是否呈現受能力閘控的
   * UI（例如審核勾選框）。這反映了 `ClientCapabilities` 的
   * 存在旗標慣例。
   */
  capabilities?: ChangesetCapabilities;
}

/**
 * 變更集在其目錄 {@link Changeset} 項目上公告的選用能力。
 *
 * 每個欄位都是一個存在旗標：空物件 `{}` 表示「支援」，
 * 不存在表示「不支援」。個別能力上的子欄位保留供未來的個別能力選項使用。
 *
 * @category Changesets
 */
export interface ChangesetCapabilities {
  /**
   * 此變更集支援每檔案的 **審核** 工作流程。宣告後，用戶端 MAY 對每個檔案
   * 呈現 GitHub 風格的 "Viewed" 切換器，並分派
   * {@link ChangesetFilesReviewChangedAction | `changeset/filesReviewChanged`}
   * 來設定每個檔案的 {@link ChangesetFile.reviewed} 旗標。未處理此項的
   * 用戶端 MUST 將此變更集視為不可審核。
   */
  review?: Record<string, never>;
}

/**
 * {@link ChangesetState} 的運算生命週期。
 *
 * @category Changesets
 */
export const enum ChangesetStatus {
  /** 伺服器仍在運算此變更集的內容。 */
  Computing = 'computing',
  /** 此變更集已完整運算且為最新狀態。 */
  Ready = 'ready',
  /**
   * 運算失敗。原因由
   * {@link ChangesetState.error} 描述。
   */
  Error = 'error',
}

/**
 * 單一變更集的完整狀態，於用戶端訂閱展開後的變更集 URI 時回傳。
 *
 * 用戶端已知其訂閱的 URI，因此此狀態不會冗餘地攜帶它（或目錄的
 * `id`、`label` 等）。彙總計數（`additions`、`deletions`、`files`）
 * 也同樣省略：用戶端可輕易地從 `files[].edit.diff` 計算它們。
 *
 * @category Changesets
 */
export interface ChangesetState {
  /** 運算生命週期。 */
  status: ChangesetStatus;
  /** 若且唯若 `status === ChangesetStatus.Error` 時存在。 */
  error?: ErrorInfo;
  /** 此變更集中的檔案，以 {@link ChangesetFile.id} 為鍵。 */
  files: ChangesetFile[];
  /**
   * 用戶端可對此變更集叫用的操作。當沒有可用操作時省略。
   */
  operations?: ChangesetOperation[];
}

/**
 * {@link ChangesetState} 內的單一檔案項目。
 *
 * @category Changesets
 */
export interface ChangesetFile {
  /**
   * 變更集內的穩定識別碼。通常為 `after.uri`
   * （刪除時則為 `before.uri`）。
   */
  id: string;
  /**
   * 重用既有的 {@link FileEdit} 形狀。用戶端從中推導出新增行、刪除行，
   * 以及重新命名/建立/刪除的語意。
   */
  edit: FileEdit;
  /**
   * 審核者是否已將此檔案標記為已審核（GitHub 風格的 "Viewed" 勾選框）。
   * 不存在等同於 `false` — 用戶端 MUST 將缺少的值視為尚未審核。
   *
   * 需要變更集公告 {@link ChangesetCapabilities.review}。用戶端透過分派
   * {@link ChangesetFilesReviewChangedAction | `changeset/filesReviewChanged`}
   * 來切換它；伺服器 MAY 也自行產生它（例如代理程式自我審核其自身的
   * 輸出）。
   *
   * 協定中沒有內容版本，因此當檔案內容在穩定識別碼下變更時，審核 **不會**
   * 自動重設。伺服器是變更內容的權威者，會明確地重設審核 — 作法是
   * 重新發出檔案（透過 {@link ChangesetFileSetAction} 或
   * {@link ChangesetContentChangedAction}）而不帶 `reviewed: true`，或是
   * 分派 `changeset/filesReviewChanged` 並帶 `reviewed: false`。
   */
  reviewed?: boolean;
  /**
   * 伺服器定義的不透明中繼資料，會呈現給操作與工具，
   * 但不會由協定詮釋。
   */
  _meta?: Record<string, unknown>;
}

/**
 * {@link ChangesetOperation} 的執行生命週期。
 *
 * 操作是透過 `invokeChangesetOperation` 命令式地叫用，但其進度與結果
 * 會反映回變更集狀態，讓每個訂閱者都觀察到一致的檢視（例如
 * "Create Pull Request" 按鈕上的旋轉圖示，或失敗 "revert" 後的內嵌錯誤）。
 *
 * @category Changesets
 */
export const enum ChangesetOperationStatus {
  /**
   * 此操作已就緒可被叫用。當 {@link ChangesetOperation.status} 省略時，
   * 這是預設值。
   */
  Idle = 'idle',
  /** 此操作的叫用目前正在進行中。 */
  Running = 'running',
  /**
   * 最近一次叫用失敗。原因由
   * {@link ChangesetOperation.error} 描述。
   */
  Error = 'error',
  /**
   * 此操作目前已停用且無法被叫用。
   */
  Disabled = 'disabled',
}

/**
 * {@link ChangesetOperation} 可被叫用的位置。
 *
 * @category Changesets
 */
export const enum ChangesetOperationScope {
  /** 套用至整個變更集。 */
  Changeset = 'changeset',
  /** 套用至變更集內的單一檔案。 */
  Resource = 'resource',
  /** 套用至單一檔案內的行範圍。 */
  Range = 'range',
}

/**
 * 伺服器宣告、用戶端可對變更集、檔案或範圍執行的可叫用動詞 —
 * `"stage"`、`"revert"`、`"create-pr"` 等等。
 *
 * 刻意使用「操作」一詞，以避免與協定層級中變動狀態的
 * [操作](/guide/actions) 衝突。
 *
 * @category Changesets
 */
export interface ChangesetOperation {
  /** 穩定識別碼，在此變更集內唯一。 */
  id: string;
  /** 人類可讀的按鈕/選單標籤。 */
  label: string;
  /** 選用的較長描述，於滑鼠停留或工具提示時顯示。 */
  description?: string;
  /** 此操作可被叫用的位置。 */
  scopes: ChangesetOperationScope[];
  /**
   * 叫用前顯示的選用確認提示。存在時，用戶端 MUST 將此訊息顯示給
   * 使用者（通常在確認對話框中），且僅在使用者接受後才叫用此操作。
   * 此欄位的存在也表示此操作具破壞性 — 用戶端 SHOULD 據此為確認
   * 按鈕套用樣式（例如使用警告色彩）。
   */
  confirmation?: StringOrMarkdown;
  /** 選用的通用圖示提示，例如 `"check"`、`"trash"`。 */
  icon?: string;
  /** 選用的群組識別碼，用於將相關操作分組在一起。 */
  group?: string;
  /**
   * 目前的執行狀態。當叫用正在進行時，伺服器會設定為
   * {@link ChangesetOperationStatus.Running | Running}；當最近一次叫用
   * 失敗時設為 {@link ChangesetOperationStatus.Error | Error}；其餘情況
   * 設為 {@link ChangesetOperationStatus.Idle | Idle}。
   *
   * 用戶端 SHOULD 在 UI 中反映此狀態 — 例如在 `Running` 時停用控制項
   * 或顯示旋轉圖示，並在 `Error` 時呈現 {@link error}。
   */
  status: ChangesetOperationStatus;
  /**
   * 失敗原因。若且唯若
   * `status === ChangesetOperationStatus.Error` 時存在；否則省略。
   */
  error?: ErrorInfo;
}
