/**
 * 變更集通道指令 — `invokeChangesetOperation`。
 *
 * @module channels-changeset/commands
 */

import type { URI, ContentRef, StringOrMarkdown, TextRange } from '../common/state.js';
import type { BaseParams } from '../common/commands.js';

// ─── invokeChangesetOperation ────────────────────────────────────────────────

/**
 * {@link ChangesetOperationTarget} 的判別欄位。反映
 * {@link ChangesetOperationScope} 中非 `Changeset` 的成員 —
 * `Changeset` 範圍沒有目標。
 *
 * @category Commands
 */
export const enum ChangesetOperationTargetKind {
  /** 操作作用於單一檔案。 */
  Resource = 'resource',
  /** 操作作用於單一檔案內的行範圍。 */
  Range = 'range',
}

/**
 * 識別 {@link ChangesetOperation} 應作用於的檔案或範圍。
 *
 * `kind` MUST 與操作所宣告的 {@link ChangesetOperation.scopes} 其中之一
 * 相符。
 *
 * @category Commands
 */
export type ChangesetOperationTarget =
  | { kind: ChangesetOperationTargetKind.Resource; resource: URI; side?: 'before' | 'after' }
  | { kind: ChangesetOperationTargetKind.Range; resource: URI; side?: 'before' | 'after'; range: TextRange };

/**
 * 操作完成後由伺服器呈現的選用後續 — 用戶端可擷取並顯示的
 * {@link ContentRef}。
 *
 * 將 `external` 設為 `true` 以在使用者偏好的外部處理器（例如瀏覽器）
 * 中開啟內容；否則用戶端應將其內嵌呈現。
 *
 * @category Commands
 */
export interface ChangesetOperationFollowUp {
  content: ContentRef;
  /** 當值為 `true` 時，於外部處理器而非內嵌開啟。 */
  external?: boolean;
}

/**
 * 對變更集、單一檔案或行範圍叫用伺服器定義的 {@link ChangesetOperation}。
 *
 * 伺服器會驗證 `operationId` 存在於變更集目前的 `operations` 清單中，
 * 且請求的 `target.kind` 包含在操作的 `scopes` 內。無效的組合會產生
 * JSON-RPC 錯誤。
 *
 * 叫用所產生的狀態變更會透過相關變更集 URI 上正常的 `changeset/*` 操作
 * 串流流回。除非伺服器透過未來的能力明確加入，否則用戶端 SHOULD NOT
 * 為叫用合成在地的樂觀變更。
 *
 * @category Commands
 * @method invokeChangesetOperation
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 2
 */
export interface InvokeChangesetOperationParams extends BaseParams {
  /** 展開後的變更集 URI。 */
  channel: URI;
  /** 與變更集 `operations` 清單中的 {@link ChangesetOperation.id} 相符。 */
  operationId: string;
  /**
   * 操作的目標。若且唯若所選範圍為 `'resource'` 或 `'range'` 時為必要。
   * 變更集範圍的操作請省略。
   */
  target?: ChangesetOperationTarget;
}

/**
 * {@link InvokeChangesetOperationParams | `invokeChangesetOperation`}
 * 指令的結果。
 *
 * 成功是隱含的：伺服器在接受操作時回傳此結果。失敗則是透過以適當的錯誤
 * 代碼拒絕 JSON-RPC 請求來表示，而非由此結果上的任何欄位表示。此操作
 * MAY 仍透過 {@link ChangesetStatusChangedAction | `changeset/statusChanged`}
 * 串流產生後續的失敗回饋。
 *
 * @category Commands
 */
export interface InvokeChangesetOperationResult {
  /** 描述結果的選用人類可讀訊息。 */
  message?: StringOrMarkdown;
  /** 選用的後續：要開啟的 URI（例如 PR）、內容參照等等。 */
  followUp?: ChangesetOperationFollowUp;
}
