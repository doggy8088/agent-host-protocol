/**
 * 根通道化簡器 — `RootState` 的純化簡器。
 *
 * @module channels-root/reducer
 */

import { ActionType } from '../common/actions.js';
import type { RootState } from './state.js';
import type { RootAction } from '../action-origin.generated.js';
import { softAssertNever } from '../common/reducer-helpers.js';

/**
 * 根狀態的純化簡器。處理所有 {@link RootAction} 變體。
 */
export function rootReducer(state: RootState, action: RootAction, log?: (msg: string) => void): RootState {
  switch (action.type) {
    case ActionType.RootAgentsChanged:
      return { ...state, agents: action.agents };

    case ActionType.RootActiveSessionsChanged:
      return { ...state, activeSessions: action.activeSessions };

    case ActionType.RootTerminalsChanged:
      return { ...state, terminals: action.terminals };

    case ActionType.RootConfigChanged:
      if (!state.config) {
        return state;
      }
      return {
        ...state,
        config: {
          ...state.config,
          values: action.replace ? { ...action.config } : { ...state.config.values, ...action.config },
        },
      };

    default:
      softAssertNever(action, log);
      return state;
  }
}
