/**
 * 註解通道 Reducer — `AnnotationsState` 的純 reducer。
 *
 * @module channels-annotations/reducer
 */

import { ActionType } from '../common/actions.js';
import type { AnnotationEntry, Annotation, AnnotationsState } from './state.js';
import type { AnnotationsAction } from '../action-origin.generated.js';
import { softAssertNever } from '../common/reducer-helpers.js';

/**
 * 註解狀態的純 reducer。處理每個 {@link AnnotationsAction}
 * 變體。
 *
 * 依據規格，每個註解操作皆為用戶端可分派；reducer 在用戶端
 * （樂觀、預寫入）與伺服器上執行方式完全相同。它保留註解
 * （以及註解內條目）的分派順序：新條目會被附加；具有相符 id
 * 的 `*Set` 操作會原地替換，而目標 id 未知的操作為 no-op
 * （映射 `changeset/fileRemoved` 語意）。單條目最小不變式由
 * 產生者強制執行，而非 reducer——透過
 * {@link AnnotationsEntryRemovedAction}（而非
 * {@link AnnotationsRemovedAction}）移除註解的最後一個條目會
 * 留下空註解，這是可觀察的但不致災。
 */
export function annotationsReducer(state: AnnotationsState, action: AnnotationsAction, log?: (msg: string) => void): AnnotationsState {
  switch (action.type) {
    case ActionType.AnnotationsSet: {
      const idx = state.annotations.findIndex(t => t.id === action.annotation.id);
      if (idx < 0) {
        return { ...state, annotations: [...state.annotations, action.annotation] };
      }
      const next: Annotation[] = [...state.annotations];
      next[idx] = action.annotation;
      return { ...state, annotations: next };
    }

    case ActionType.AnnotationsUpdated: {
      const idx = state.annotations.findIndex(t => t.id === action.annotationId);
      if (idx < 0) {
        return state;
      }
      const annotation = state.annotations[idx];
      const updated: Annotation = { ...annotation };
      if (action.turnId !== undefined) {
        updated.turnId = action.turnId;
      }
      if (action.resource !== undefined) {
        updated.resource = action.resource;
      }
      if (action.range !== undefined) {
        updated.range = action.range;
      }
      if (action.resolved !== undefined) {
        updated.resolved = action.resolved;
      }
      const next: Annotation[] = [...state.annotations];
      next[idx] = updated;
      return { ...state, annotations: next };
    }

    case ActionType.AnnotationsRemoved: {
      const idx = state.annotations.findIndex(t => t.id === action.annotationId);
      if (idx < 0) {
        return state;
      }
      const next: Annotation[] = [...state.annotations];
      next.splice(idx, 1);
      return { ...state, annotations: next };
    }

    case ActionType.AnnotationsEntrySet: {
      const tIdx = state.annotations.findIndex(t => t.id === action.annotationId);
      if (tIdx < 0) {
        return state;
      }
      const annotation = state.annotations[tIdx];
      const cIdx = annotation.entries.findIndex(c => c.id === action.entry.id);
      let nextEntries: AnnotationEntry[];
      if (cIdx < 0) {
        nextEntries = [...annotation.entries, action.entry];
      } else {
        nextEntries = [...annotation.entries];
        nextEntries[cIdx] = action.entry;
      }
      const nextAnnotations: Annotation[] = [...state.annotations];
      nextAnnotations[tIdx] = { ...annotation, entries: nextEntries };
      return { ...state, annotations: nextAnnotations };
    }

    case ActionType.AnnotationsEntryRemoved: {
      const tIdx = state.annotations.findIndex(t => t.id === action.annotationId);
      if (tIdx < 0) {
        return state;
      }
      const annotation = state.annotations[tIdx];
      const cIdx = annotation.entries.findIndex(c => c.id === action.entryId);
      if (cIdx < 0) {
        return state;
      }
      const nextEntries: AnnotationEntry[] = [...annotation.entries];
      nextEntries.splice(cIdx, 1);
      const nextAnnotations: Annotation[] = [...state.annotations];
      nextAnnotations[tIdx] = { ...annotation, entries: nextEntries };
      return { ...state, annotations: nextAnnotations };
    }

    default:
      softAssertNever(action, log);
      return state;
  }
}
