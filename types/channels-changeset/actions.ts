/**
 * 變更集通道操作 — 對 `ahp-changeset:` 通道狀態的變動。
 *
 * @module channels-changeset/actions
 */

import { ActionType } from '../common/actions.js';
import type { ErrorInfo } from '../common/state.js';
import type { ChangesetFile, ChangesetOperation } from './state.js';
import { ChangesetStatus } from './state.js';
import type { ChangesetOperationStatus } from './state.js';

// ─── Changeset Actions ───────────────────────────────────────────────────────

/**
 * 此變更集的 {@link ChangesetState.status} 已轉換（例如
 * `computing → ready`）。每當轉換為 {@link ChangesetStatus.Error | Error}
 * 時，錯誤有效負載會與 `status` 一併設定。
 *
 * @category Changeset Actions
 * @version 2
 */
export interface ChangesetStatusChangedAction {
  type: ActionType.ChangesetStatusChanged;
  /** 新的運算生命週期狀態。 */
  status: ChangesetStatus;
  /** 當 `status === ChangesetStatus.Error` 時的原因；否則省略。 */
  error?: ErrorInfo;
}

/**
 * 在變更集中插入或更新 {@link ChangesetFile} — 新增新項目，或
 * 取代由 {@link ChangesetFile.id} 識別的既有項目。
 *
 * @category Changeset Actions
 * @version 2
 */
export interface ChangesetFileSetAction {
  type: ActionType.ChangesetFileSet;
  /** 新增或用來取代的檔案項目。 */
  file: ChangesetFile;
}

/**
 * 依識別碼從變更集中移除 {@link ChangesetFile}。
 *
 * 通常於檔案被還原、暫存移出，或因其他原因不再屬於範圍時分派
 * （例如重新命名的檔案被新項目取代）。
 *
 * @category Changeset Actions
 * @version 2
 */
export interface ChangesetFileRemovedAction {
  type: ActionType.ChangesetFileRemoved;
  /** 要移除之檔案的 {@link ChangesetFile.id}。 */
  fileId: string;
}

/**
 * 為一個或多個檔案設定 {@link ChangesetFile.reviewed} 旗標 — GitHub
 * 風格的 "Viewed" 切換器，於單一批次中套用。
 *
 * 依檔案的 {@link ChangesetFile.id} 為目標。{@link files} 中與變更集內
 * 目前存在之檔案不符的識別碼會被忽略；若無相符者，此操作為 no-op。
 * 僅每個相符檔案的 {@link ChangesetFile.reviewed} 欄位會受影響；檔案的
 * {@link ChangesetFile.edit | edit} 與 {@link ChangesetFile._meta | _meta}
 * 則保持不變。
 *
 * 僅對公告 {@link ChangesetCapabilities.review} 的變更集有意義。與其他
 * 所有 `changeset/*` 操作不同，此操作是 **用戶端可分派** 的：審核者直接
 * 切換審核狀態，透過預寫入 reducer 樂觀地套用它，並讓伺服器在正常的
 * `action` 信封串流上回應它。伺服器 MAY 也自行產生它（例如代理程式將
 * 其自身的輸出標記為已審核）。
 *
 * 協定層級沒有內容版本，因此當檔案內容在穩定識別碼下變更時，審核不會
 * 自動重設。伺服器是變更內容的權威者，會明確地重設審核 — 作法是
 * 重新發出檔案而不帶 `reviewed: true`，或是分派此操作並帶 `reviewed: false`。
 *
 * @category Changeset Actions
 * @version 1
 * @clientDispatchable
 */
export interface ChangesetFilesReviewChangedAction {
  type: ActionType.ChangesetFilesReviewChanged;
  /** 審核狀態已變更之檔案的 {@link ChangesetFile.id | ids}。 */
  files: string[];
  /** 套用至每個列出檔案的新審核狀態：已審核時為 `true`，清除時為 `false`。 */
  reviewed: boolean;
}

/**
 * 變更集的完整內容已變更。完整取代語意：`files` 取代先前的檔案清單，
 * 而 `operations` 存在時取代先前的操作清單。
 *
 * 產生者 SHOULD 將此操作用於初始快照與大量重新整理；至於增量更新，
 * 請使用 {@link ChangesetFileSetAction}、{@link ChangesetFileRemovedAction}
 * 與 {@link ChangesetOperationsChangedAction}。
 *
 * @category Changeset Actions
 * @version 4
 */
export interface ChangesetContentChangedAction {
  type: ActionType.ChangesetContentChanged;
  /** 完整取代的檔案清單。 */
  files: ChangesetFile[];
  /** 完整取代的操作清單。當操作未變更時省略。 */
  operations?: ChangesetOperation[];
  /** 錯誤資訊（若變更集內容變更失敗）。 */
  error?: ErrorInfo;
}

/**
 * 此變更集上可用操作的集合已變更。完整取代語意：`operations` 取代先前
 * 的清單（或當 `operations` 為 `undefined` 時將其完全移除）。
 *
 * @category Changeset Actions
 * @version 2
 */
export interface ChangesetOperationsChangedAction {
  type: ActionType.ChangesetOperationsChanged;
  /** 更新後的操作清單。傳入 `undefined` 以清除所有操作。 */
  operations: ChangesetOperation[] | undefined;
}

/**
 * 單一操作的 {@link ChangesetOperation.status} 已轉換（例如
 * `idle → running → idle`，或 `running → error`）。每當轉換為
 * {@link ChangesetOperationStatus.Error | Error} 時，錯誤有效負載會與
 * `status` 一併設定，並在任何其他轉換時清除。
 *
 * 依其 {@link ChangesetOperation.id} 為單一操作的目標。若變更集中目前
 * 沒有該識別碼的操作，此操作為 no-op。請使用
 * {@link ChangesetOperationsChangedAction} 來新增、移除或以其他方式
 * 取代操作清單本身。
 *
 * @category Changeset Actions
 * @version 3
 */
export interface ChangesetOperationStatusChangedAction {
  type: ActionType.ChangesetOperationStatusChanged;
  /** 狀態已變更之操作的 {@link ChangesetOperation.id}。 */
  operationId: string;
  /** 新的執行狀態。 */
  status: ChangesetOperationStatus;
  /** 當 `status === ChangesetOperationStatus.Error` 時的原因；否則省略。 */
  error?: ErrorInfo;
}

/**
 * 從變更集中捨棄所有檔案。
 *
 * 有兩種情況會用到此操作：
 * 1. 底層來源已變動（分支切換、分叉點失效等等），而伺服器正從頭重新
 *    運算 — 後續的 {@link ChangesetFileSetAction} 項目會重新填入它。
 * 2. 擁有它的工作階段已結束，而 URI 正變為不可訂閱 — 伺服器會在
 *    分派此操作後不久取消所有用戶端的訂閱。
 *
 * 用戶端 SHOULD 在收到時釋放任何參照，且 SHOULD NOT 僅從此操作就區分
 * 這兩種情況 — 請改為對「即將消失」的情況反應對應的工作階段層級生命
 * 週期信號（例如 `root/sessionRemoved`）。
 *
 * @category Changeset Actions
 * @version 2
 */
export interface ChangesetClearedAction {
  type: ActionType.ChangesetCleared;
}
