/**
 * 資源監視通道 Reducer — `ResourceWatchState` 的純 reducer。
 *
 * @module channels-resource-watch/reducer
 */

import { ActionType } from '../common/actions.js';
import type { ResourceWatchState } from './state.js';
import type { ResourceWatchAction } from '../action-origin.generated.js';

/**
 * 資源監視狀態的純 reducer。處理每個
 * {@link ResourceWatchAction} 變體。
 *
 * 監視刻意為事件穿透：變更事件透過 `resourceWatch/changed`
 * 操作傳遞，但 reducer 不保留其歷史。因此狀態僅追蹤監視
 * 描述子，其在訂閱時設定，且在監視生命週期內從不變動。
 *
 * reducer 使用 `if`/else 形狀而非 `switch`/`softAssertNever`，
 * 因為 `ResourceWatchAction` 目前只有單一變體——TypeScript
 * 不會在單一分支後將單變體判別聯集窄化為 `never`，因此
 * 一般的窮盡模式無法編譯。未知操作類型會優雅降級（映射
 * `softAssertNever` 的執行期行為），因此若伺服器在未來版本
 * 新增 `resourceWatch/*` 操作，使用舊協定的用戶端仍保持正確。
 */
export function resourceWatchReducer(state: ResourceWatchState, action: ResourceWatchAction, log?: (msg: string) => void): ResourceWatchState {
  if (action.type === ActionType.ResourceWatchChanged) {
    return state;
  }

  (log ?? console.warn)(`Unhandled action type: ${JSON.stringify(action)}`);
  return state;
}
