/**
 * 版本登錄 — 將操作類型與功能對應至協定版本。
 *
 * @module version/registry
 */

import type { StateAction } from '../actions.js';
import { ActionType } from '../actions.js';
import type { ServerNotificationMap } from '../messages.js';

// ─── Protocol Version Constants ──────────────────────────────────────────────

/**
 * 新程式碼所使用的目前協定版本。
 *
 * 格式為 [SemVer](https://semver.org) `MAJOR.MINOR.PATCH` 字串。
 */
export const PROTOCOL_VERSION = '0.7.0';

/**
 * 從此原始碼樹建置的用戶端願意透過 `initialize` 握手協商的
 * 每個協定版本。依**最偏好者在前**排序，讓挑選第一個可接受
 * 項目的伺服器能遵循用戶端的偏好（見
 * [versioning](../../docs/specification/versioning.md)）。
 *
 * 第一個項目 MUST 等於 {@link PROTOCOL_VERSION}——「新程式碼
 * 所使用」的版本依定義即為最偏好者。若用戶端保留回退至舊
 * 版本的能力，則可附加舊版本；目前僅公告一個版本。
 *
 * 每個產生的用戶端（Rust、Kotlin、Swift）原樣重新匯出此常數。
 * TypeScript 用戶端直接取用它。各用戶端的
 * `release-metadata.json` 檔案由 `scripts/verify-release-metadata.ts`
 * 對照此清單驗證。
 */
export const SUPPORTED_PROTOCOL_VERSIONS: readonly string[] = Object.freeze([
  '0.7.0',
  '0.6.0',
  '0.5.2',
  '0.5.1',
]);

// ─── SemVer Comparison ───────────────────────────────────────────────────────

/**
 * 將 `MAJOR.MINOR.PATCH` SemVer 字串解析為其三個數值組成。
 * 不支援 pre-release 與 build metadata，且 MUST NOT 出現於協定
 * 版本字串中。
 *
 * 若 `version` 不是格式正確的 `MAJOR.MINOR.PATCH` 字串則擲回。
 */
function parseSemver(version: string): readonly [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Invalid protocol version: ${version}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])] as const;
}

/**
 * 比較兩個 `MAJOR.MINOR.PATCH` SemVer 字串。
 *
 * 若 `a < b` 則回傳負數，若 `a === b` 則回傳零，若 `a > b` 則
 * 回傳正數。
 */
export function compareProtocolVersions(a: string, b: string): number {
  const [aMajor, aMinor, aPatch] = parseSemver(a);
  const [bMajor, bMinor, bPatch] = parseSemver(b);
  return (aMajor - bMajor) || (aMinor - bMinor) || (aPatch - bPatch);
}

// ─── Exhaustive Action → Version Map ─────────────────────────────────────────

/**
 * 將每個操作類型對應至引入它的協定版本。
 * 將新操作加入 `StateAction` 但未加入此處是編譯錯誤。
 *
 * 版本為 SemVer `MAJOR.MINOR.PATCH` 字串（見 `PROTOCOL_VERSION`）。
 */
export const ACTION_INTRODUCED_IN: { readonly [K in StateAction['type']]: string } = {
  [ActionType.RootAgentsChanged]: '0.1.0',
  [ActionType.RootActiveSessionsChanged]: '0.1.0',
  [ActionType.SessionReady]: '0.1.0',
  [ActionType.SessionCreationFailed]: '0.1.0',
  [ActionType.SessionChatAdded]: '0.4.0',
  [ActionType.SessionChatRemoved]: '0.4.0',
  [ActionType.SessionChatUpdated]: '0.4.0',
  [ActionType.SessionDefaultChatChanged]: '0.4.0',
  [ActionType.SessionTitleChanged]: '0.1.0',
  [ActionType.SessionServerToolsChanged]: '0.1.0',
  [ActionType.SessionActiveClientSet]: '0.5.0',
  [ActionType.SessionActiveClientRemoved]: '0.5.0',
  [ActionType.SessionWorkingDirectorySet]: '0.7.0',
  [ActionType.SessionWorkingDirectoryRemoved]: '0.7.0',
  [ActionType.SessionInputNeededSet]: '0.5.1',
  [ActionType.SessionInputNeededRemoved]: '0.5.1',
  [ActionType.SessionCustomizationsChanged]: '0.1.0',
  [ActionType.SessionCustomizationToggled]: '0.1.0',
  [ActionType.SessionCustomizationUpdated]: '0.1.0',
  [ActionType.SessionCustomizationRemoved]: '0.2.0',
  [ActionType.SessionMcpServerStateChanged]: '0.3.0',
  [ActionType.SessionMcpServerStartRequested]: '0.5.2',
  [ActionType.SessionMcpServerStopRequested]: '0.5.2',
  [ActionType.SessionIsReadChanged]: '0.1.0',
  [ActionType.SessionIsArchivedChanged]: '0.1.0',
  [ActionType.SessionActivityChanged]: '0.1.0',
  [ActionType.SessionChangesetsChanged]: '0.2.0',
  [ActionType.SessionConfigChanged]: '0.1.0',
  [ActionType.SessionMetaChanged]: '0.1.0',
  [ActionType.ChatTurnStarted]: '0.4.0',
  [ActionType.ChatDelta]: '0.4.0',
  [ActionType.ChatResponsePart]: '0.4.0',
  [ActionType.ChatToolCallStart]: '0.4.0',
  [ActionType.ChatToolCallDelta]: '0.4.0',
  [ActionType.ChatToolCallReady]: '0.4.0',
  [ActionType.ChatToolCallConfirmed]: '0.4.0',
  [ActionType.ChatToolCallComplete]: '0.4.0',
  [ActionType.ChatToolCallResultConfirmed]: '0.4.0',
  [ActionType.ChatToolCallContentChanged]: '0.4.0',
  [ActionType.ChatToolCallAuthRequired]: '0.6.0',
  [ActionType.ChatToolCallAuthResolved]: '0.6.0',
  [ActionType.ChatTurnComplete]: '0.4.0',
  [ActionType.ChatTurnCancelled]: '0.4.0',
  [ActionType.ChatError]: '0.4.0',
  [ActionType.ChatActivityChanged]: '0.5.0',
  [ActionType.ChatWorkingDirectorySet]: '0.7.0',
  [ActionType.ChatWorkingDirectoryRemoved]: '0.7.0',
  [ActionType.ChatUsage]: '0.4.0',
  [ActionType.ChatReasoning]: '0.4.0',
  [ActionType.ChatPendingMessageSet]: '0.4.0',
  [ActionType.ChatPendingMessageRemoved]: '0.4.0',
  [ActionType.ChatQueuedMessagesReordered]: '0.4.0',
  [ActionType.ChatDraftChanged]: '0.5.0',
  [ActionType.ChatInputRequested]: '0.4.0',
  [ActionType.ChatInputAnswerChanged]: '0.4.0',
  [ActionType.ChatInputCompleted]: '0.4.0',
  [ActionType.ChatTruncated]: '0.4.0',
  [ActionType.ChatTurnsLoaded]: '0.5.1',
  [ActionType.ChangesetStatusChanged]: '0.2.0',
  [ActionType.ChangesetFileSet]: '0.2.0',
  [ActionType.ChangesetFileRemoved]: '0.2.0',
  [ActionType.ChangesetFilesReviewChanged]: '0.6.0',
  [ActionType.ChangesetContentChanged]: '0.4.0',
  [ActionType.ChangesetOperationsChanged]: '0.2.0',
  [ActionType.ChangesetOperationStatusChanged]: '0.3.0',
  [ActionType.ChangesetCleared]: '0.2.0',
  [ActionType.AnnotationsSet]: '0.4.0',
  [ActionType.AnnotationsUpdated]: '0.4.0',
  [ActionType.AnnotationsRemoved]: '0.4.0',
  [ActionType.AnnotationsEntrySet]: '0.4.0',
  [ActionType.AnnotationsEntryRemoved]: '0.4.0',
  [ActionType.RootTerminalsChanged]: '0.1.0',
  [ActionType.RootConfigChanged]: '0.1.0',
  [ActionType.TerminalData]: '0.1.0',
  [ActionType.TerminalInput]: '0.1.0',
  [ActionType.TerminalResized]: '0.1.0',
  [ActionType.TerminalClaimed]: '0.1.0',
  [ActionType.TerminalTitleChanged]: '0.1.0',
  [ActionType.TerminalCwdChanged]: '0.1.0',
  [ActionType.TerminalExited]: '0.1.0',
  [ActionType.TerminalCleared]: '0.1.0',
  [ActionType.TerminalCommandDetectionAvailable]: '0.1.0',
  [ActionType.TerminalCommandExecuted]: '0.1.0',
  [ActionType.TerminalCommandFinished]: '0.1.0',
  [ActionType.ResourceWatchChanged]: '0.2.0',
};

/**
 * 回傳給定的操作類型是否為指定的協定版本所知。
 */
export function isActionKnownToVersion(action: StateAction, clientVersion: string): boolean {
  return compareProtocolVersions(ACTION_INTRODUCED_IN[action.type], clientVersion) <= 0;
}

// ─── Exhaustive Notification Method → Version Map ──────────────────────────

/**
 * 屬於 AHP 協定表面的伺服器 → 用戶端通知方法名稱。此集合為
 * {@link ServerNotificationMap} 鍵的子集，排除 `action`（操作
 * 信封），因為操作版本透過 {@link ACTION_INTRODUCED_IN} 追蹤。
 */
export type ProtocolNotificationMethod = Exclude<keyof ServerNotificationMap, 'action'>;

/**
 * 將每個伺服器 → 用戶端協定通知方法對應至引入它的協定版本。
 * 將新通知方法加入 {@link ServerNotificationMap} 但未加入此處
 * 是編譯錯誤。
 *
 * 版本為 SemVer `MAJOR.MINOR.PATCH` 字串（見 `PROTOCOL_VERSION`）。
 */
export const NOTIFICATION_INTRODUCED_IN: { readonly [K in ProtocolNotificationMethod]: string } = {
  'root/sessionAdded': '0.1.0',
  'root/sessionRemoved': '0.1.0',
  'root/sessionSummaryChanged': '0.1.0',
  'root/progress': '0.5.0',
  'auth/required': '0.1.0',
  'otlp/exportLogs': '0.2.0',
  'otlp/exportTraces': '0.2.0',
  'otlp/exportMetrics': '0.2.0',
};

/**
 * 回傳給定的通知方法是否為指定的協定版本所知。
 */
export function isNotificationKnownToVersion(method: ProtocolNotificationMethod, clientVersion: string): boolean {
  return compareProtocolVersions(NOTIFICATION_INTRODUCED_IN[method], clientVersion) <= 0;
}
