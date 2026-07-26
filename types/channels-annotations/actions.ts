/**
 * 註解通道操作 — 對 `ahp-session:/<uuid>/annotations`
 * 通道狀態的變動。
 *
 * 每個註解操作皆為用戶端可分派：用戶端不發出命令式 RPC 指令，
 * 而是直接分派這些操作來驅動變動——自行指派
 * {@link Annotation.id}／{@link AnnotationEntry.id}，
 * 透過預寫入 reducer 樂觀地套用該操作，並讓伺服器在正常的
 * `action` 信封串流上回應。伺服器 MAY 也可以是發起者
 * （例如代理程式留下自己的註解）。映射 `changeset/*` 操作
 * 家族的形狀。
 *
 * @module channels-annotations/actions
 */

import { ActionType } from '../common/actions.js';
import type { URI, TextRange } from '../common/state.js';
import type { AnnotationEntry, Annotation } from './state.js';

// ─── Annotations Actions ─────────────────────────────────────────────────────

/**
 * 在註解通道中 upsert 一個 {@link Annotation}——新增註解，
 * 或替換由 {@link Annotation.id} 識別的現有註解。
 *
 * 由用戶端分派以建立註解（連同其必要的第一個條目），
 * 或重新錨定／解決現有註解；分派的用戶端指派
 * {@link Annotation.id} 與任何新條目的 id。替換時，完整的註解
 * 有效負載（包含其 {@link Annotation.entries | entries} 清單）會被
 * 取代；產生者 SHOULD 偏好使用 {@link AnnotationsEntrySetAction}
 * 進行每條目編輯，並使用 {@link AnnotationsUpdatedAction} 來
 * 解決／重新錨定現有註解，以保持網路傳輸更新精簡。
 *
 * @category Annotations Actions
 * @version 3
 * @clientDispatchable
 */
export interface AnnotationsSetAction {
  type: ActionType.AnnotationsSet;
  /** 新增或替換用的註解。MUST 至少包含一個條目。 */
  annotation: Annotation;
}

/**
 * 部分更新現有 {@link Annotation} 的自身屬性——
 * {@link AnnotationsSetAction} 的窄替代方案，適用於在不重新傳送
 * {@link Annotation.entries | entries} 的情況下解決／重新開啟
 * 或重新錨定註解的常見情境。
 *
 * 依其 {@link annotationId} 鎖定單一註解。僅寫入操作上出現的
 * 欄位；省略的欄位會讓對應的 {@link Annotation} 屬性保持不變。
 * 註解的 {@link Annotation.entries | entries}、
 * {@link Annotation.id | id} 與 {@link Annotation._meta | _meta}
 * 絕不會被觸及——請分派 {@link AnnotationsSetAction} 來取代它們、
 * 清除 {@link range}（重新錨定至整個檔案），或使用
 * {@link AnnotationsEntrySetAction}／
 * {@link AnnotationsEntryRemovedAction} 編輯個別條目。
 *
 * 若 {@link annotationId} 不符任何現有註解，則此操作為 no-op。
 *
 * @category Annotations Actions
 * @version 4
 * @clientDispatchable
 */
export interface AnnotationsUpdatedAction {
  type: ActionType.AnnotationsUpdated;
  /** 要更新之註解的 {@link Annotation.id}。 */
  annotationId: string;
  /**
   * 將註解重新錨定至此回合產生的檔案版本。
   * 與擁有工作階段上的 {@link Turn.id} 相符。省略以保持
   * 現有的 {@link Annotation.turnId} 不變。
   */
  turnId?: string;
  /**
   * 將註解重新錨定至此檔案。省略以保持現有的
   * {@link Annotation.resource} 不變。
   */
  resource?: URI;
  /**
   * 將註解縮小至 {@link resource} 內的此範圍。省略以保持
   * 現有的 {@link Annotation.range} 不變；此操作無法清除現有
   * 範圍——請分派 {@link AnnotationsSetAction} 重新錨定至
   * 整個檔案。
   */
  range?: TextRange;
  /**
   * 將註解標記為已解決（`true`）或重新開啟（`false`）。省略以
   * 保持現有的 {@link Annotation.resolved} 狀態不變。
   */
  resolved?: boolean;
}

/**
 * 依 id 從通道移除 {@link Annotation}。
 *
 * 分派以刪除整個註解及其包含的每個條目。因為協定禁止空註解，
 * 想要移除最後一個剩餘條目的用戶端會分派此操作——摺疊該
 * 註解——而非 {@link AnnotationsEntryRemovedAction}。
 *
 * @category Annotations Actions
 * @version 3
 * @clientDispatchable
 */
export interface AnnotationsRemovedAction {
  type: ActionType.AnnotationsRemoved;
  /** 要移除之註解的 {@link Annotation.id}。 */
  annotationId: string;
}

/**
 * 在現有註解中 upsert 一個 {@link AnnotationEntry}——新增條目，
 * 或替換由 {@link AnnotationEntry.id} 識別的條目。分派的用戶端
 * 指派新條目的 {@link AnnotationEntry.id}。若 {@link annotationId}
 * 不符任何現有註解，則此操作為 no-op。
 *
 * @category Annotations Actions
 * @version 3
 * @clientDispatchable
 */
export interface AnnotationsEntrySetAction {
  type: ActionType.AnnotationsEntrySet;
  /** 該條目所屬註解的 {@link Annotation.id}。 */
  annotationId: string;
  /** 新增或替換用的條目。 */
  entry: AnnotationEntry;
}

/**
 * 從註解移除單一 {@link AnnotationEntry} 而不摺疊註解本身。
 * 用於剩餘多個條目時——要移除最後一個條目，用戶端應改分派
 * {@link AnnotationsRemovedAction}，因為協定禁止空註解。
 *
 * 若 {@link annotationId} 或 {@link entryId} 不符目前狀態，
 * 則此操作為 no-op。
 *
 * @category Annotations Actions
 * @version 3
 * @clientDispatchable
 */
export interface AnnotationsEntryRemovedAction {
  type: ActionType.AnnotationsEntryRemoved;
  /** 該條目所屬註解的 {@link Annotation.id}。 */
  annotationId: string;
  /** 要移除的 {@link AnnotationEntry.id}。 */
  entryId: string;
}
