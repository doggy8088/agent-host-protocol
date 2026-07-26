/**
 * 註解通道狀態類型 — 每個工作階段的內嵌檔案註解狀態，於
 * `ahp-session:/<uuid>/annotations` 通道公開。
 *
 * 每個工作階段最多擁有一個註解通道。通道 URI 是由工作階段
 * URI 附加 `/annotations` 衍生而來，並且也明確公開於
 * {@link AnnotationsSummary.resource} 供徽章 UI 使用。
 *
 * @module channels-annotations/state
 */

import type { URI, StringOrMarkdown, TextRange } from '../common/state.js';

// ─── Annotations Summary ─────────────────────────────────────────────────────

/**
 * 註解通道的輕量級每工作階段摘要，公開於
 * {@link SessionSummary.annotations}，讓徽章 UI 無需訂閱通道本身
 * 即可呈現註解／條目計數。
 *
 * @category Annotations
 */
export interface AnnotationsSummary {
  /**
   * 擁有工作階段的可訂閱註解通道 URI
   * （通常為 `ahp-session:/<uuid>/annotations`）。即使可從工作階段
   * URI 衍生而來也明確公開，讓徽章 UI 不需要知道衍生規則。
   */
  resource: URI;
  /** 通道中 {@link Annotation} 條目的總數。 */
  annotationCount: number;
  /** 跨所有註解的 {@link AnnotationEntry} 條目總數。 */
  entryCount: number;
}

// ─── Annotations State ───────────────────────────────────────────────────────

/**
 * 工作階段註解通道的完整狀態，於用戶端訂閱
 * `ahp-session:/<uuid>/annotations` URI 時回傳。
 *
 * @category Annotations
 */
export interface AnnotationsState {
  /** 此通道中的註解，以 {@link Annotation.id} 為鍵。 */
  annotations: Annotation[];
}

// ─── Annotation ──────────────────────────────────────────────────────────────

/**
 * 錨定於特定回合所產生之特定檔案的對話，
 * 可選擇縮小至該檔案內的某個範圍。
 *
 * {@link turnId} 將註解錨定至該回合所產生的檔案版本，
 * 如此一來，後續重寫同一檔案的回合不會悄悄使註解的錨點
 * 失效——用戶端可根據該回合的變更集解析 {@link resource} 與
 * {@link range}。省略 {@link range} 時，註解錨定至整個檔案。
 *
 * 每個註解 MUST 至少包含一個 {@link AnnotationEntry}。因此，
 * 建立註解的 {@link AnnotationsSetAction} 會攜帶其必要的第一個
 * 條目，而移除最後一個剩餘條目會透過 {@link AnnotationsRemovedAction}
 * 摺疊該註解，而非留下空的註解。
 *
 * @category Annotations
 */
export interface Annotation {
  /**
   * 註解通道內的穩定識別碼。由分派建立它的
   * {@link AnnotationsSetAction} 的用戶端指派。
   */
  id: string;
  /**
   * 產生此註解所錨定之檔案版本的回合。
   * 與擁有工作階段上的 {@link Turn.id} 相符。
   */
  turnId: string;
  /** 註解所錨定的檔案。 */
  resource: URI;
  /**
   * 註解所錨定 {@link resource} 內的範圍。省略時，
   * 註解錨定至整個檔案。
   */
  range?: TextRange;
  /**
   * 註解是否已解決。新建的註解一律為未解決
   * （`false`）；用戶端透過分派攜帶更新旗標的
   * {@link AnnotationsUpdatedAction} 將註解標記為已解決（或重新開啟），
   * 或在替換整個註解時使用 {@link AnnotationsSetAction}。
   */
  resolved: boolean;
  /**
   * 此註解中的條目，依分派順序排列（最舊者在前）。
   * MUST 至少包含一個條目。
   */
  entries: AnnotationEntry[];
  /**
   * 由產生者定義的不透明中繼資料，公開供工具使用，
   * 但不由協定解讀。
   */
  _meta?: Record<string, unknown>;
}

// ─── Annotation Entry ────────────────────────────────────────────────────────

/**
 * {@link Annotation} 內的單一條目。
 *
 * @category Annotations
 */
export interface AnnotationEntry {
  /**
   * 所屬註解內的穩定識別碼。由分派引入該條目之
   * {@link AnnotationsEntrySetAction}（或所屬
   * {@link AnnotationsSetAction}）的用戶端指派。
   */
  id: string;
  /**
   * 條目主體。裸 `string` 會以純文字呈現；傳入
   * `{ markdown: "…" }` 以選擇 Markdown 呈現。詳見
   * {@link StringOrMarkdown}。
   */
  text: StringOrMarkdown;
  /**
   * 由產生者定義的不透明中繼資料，公開供工具使用，
   * 但不由協定解讀。
   */
  _meta?: Record<string, unknown>;
}
