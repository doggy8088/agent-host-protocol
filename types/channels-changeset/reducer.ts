/**
 * 變更集通道 Reducer — `ChangesetState` 的純 reducer。
 *
 * @module channels-changeset/reducer
 */

import { ActionType } from '../common/actions.js';
import type { ChangesetState, ChangesetFile, ChangesetOperation } from './state.js';
import { ChangesetStatus, ChangesetOperationStatus } from './state.js';
import type { ChangesetAction } from '../action-origin.generated.js';
import { softAssertNever } from '../common/reducer-helpers.js';

/**
 * 變更集狀態的純 reducer。處理所有 {@link ChangesetAction} 變體。
 *
 * reducer 透過在識別碼未知時以 {@link ActionType.ChangesetFileSet} 附加
 * 新檔案、在符合既有項目時就地取代的方式，保留穩定的檔案順序。每檔案
 * 的審核存於 {@link ChangesetFile.reviewed}，並由用戶端可分派的
 * {@link ActionType.ChangesetFilesReviewChanged}（逐檔、批次地）切換。
 */
export function changesetReducer(state: ChangesetState, action: ChangesetAction, log?: (msg: string) => void): ChangesetState {
  switch (action.type) {
    case ActionType.ChangesetStatusChanged: {
      // Carry `error` only when the new status is `Error` so we don't
      // leave a stale error sitting on a recovered changeset.
      if (action.status === ChangesetStatus.Error) {
        return { ...state, status: action.status, error: action.error };
      }
      const { error: _ignored, ...rest } = state;
      return { ...rest, status: action.status };
    }

    case ActionType.ChangesetFileSet: {
      const idx = state.files.findIndex(f => f.id === action.file.id);
      if (idx < 0) {
        return { ...state, files: [...state.files, action.file] };
      }
      const next: ChangesetFile[] = [...state.files];
      next[idx] = action.file;
      return { ...state, files: next };
    }

    case ActionType.ChangesetFileRemoved: {
      const idx = state.files.findIndex(f => f.id === action.fileId);
      if (idx < 0) {
        return state;
      }
      const next: ChangesetFile[] = [...state.files];
      next.splice(idx, 1);
      return { ...state, files: next };
    }

    case ActionType.ChangesetFilesReviewChanged: {
      let changed = false;
      const ids = new Set(action.files);
      const next: ChangesetFile[] = state.files.map(f => {
        if (!ids.has(f.id) || f.reviewed === action.reviewed) {
          return f;
        }
        changed = true;
        return { ...f, reviewed: action.reviewed };
      });
      return changed ? { ...state, files: next } : state;
    }

    case ActionType.ChangesetContentChanged: {
      const next = action.operations === undefined
        ? { ...state, files: action.files }
        : { ...state, files: action.files, operations: action.operations };
      if (action.error === undefined) {
        const { error: _ignored, ...rest } = next;
        return rest;
      }
      return { ...next, error: action.error };
    }

    case ActionType.ChangesetOperationsChanged: {
      if (action.operations === undefined) {
        const { operations: _ignored, ...rest } = state;
        return rest;
      }
      return { ...state, operations: action.operations };
    }

    case ActionType.ChangesetOperationStatusChanged: {
      if (state.operations === undefined) {
        return state;
      }
      const idx = state.operations.findIndex(o => o.id === action.operationId);
      if (idx < 0) {
        return state;
      }
      const current = state.operations[idx];
      // Carry `error` only when the new status is `Error` so we don't leave
      // a stale error on an operation that recovered or started running.
      let nextOp: ChangesetOperation;
      if (action.status === ChangesetOperationStatus.Error) {
        nextOp = { ...current, status: action.status, error: action.error };
      } else {
        const { error: _ignored, ...rest } = current;
        nextOp = { ...rest, status: action.status };
      }
      const next: ChangesetOperation[] = [...state.operations];
      next[idx] = nextOp;
      return { ...state, operations: next };
    }

    case ActionType.ChangesetCleared:
      if (state.files.length === 0) {
        return state;
      }
      return { ...state, files: [] };

    default:
      softAssertNever(action, log);
      return state;
  }
}
