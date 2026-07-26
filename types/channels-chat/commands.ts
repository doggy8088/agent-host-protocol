/**
 * 聊天通道指令 — `createChat` 與 `disposeChat`。
 *
 * @module channels-chat/commands
 */

import type { URI } from '../common/state.js';
import type { BaseParams } from '../common/commands.js';
import type { Message, SideChatSelection } from './state.js';

// ─── createChat ──────────────────────────────────────────────────────────────

/**
 * 新聊天如何使用其來源聊天與回合。
 */
export const enum ChatSourceKind {
  /** 將通過所參照回合的來源歷史複製到新聊天。 */
  Fork = 'fork',
  /** 提供來源上下文而不將其複製到新聊天的可見歷史。 */
  SideChat = 'sideChat',
}

/**
 * 將通過已完成回合的來源歷史複製到新聊天。
 */
export interface ForkChatSource {
  /** 判別欄位 */
  kind: ChatSourceKind.Fork;
  /** 現有來源聊天的 URI。 */
  chat: URI;
  /**
   * 來源聊天中已完成回合的識別碼。
   *
   * 通過此回合的內容會被複製到新聊天的可見 `turns`。
   */
  turnId: string;
}

/**
 * 將來源上下文提供給新的側邊聊天，而不將其複製到側邊聊天的可見歷史。
 */
export interface SideChatSource {
  /** 判別欄位 */
  kind: ChatSourceKind.SideChat;
  /** 現有來源聊天的 URI。 */
  chat: URI;
  /**
   * 來源聊天中穩定的來源回合識別碼。
   *
   * 主機在接受 `createChat` 時，會將此識別碼對照來源聊天目前的 `activeTurn` 或其保留的 `turns` 來解析。若它命名的是目前的活動回合，主機會對來源聊天保留的歷史加上該回合目前的使用者訊息，以及任何已可用的部分助理回應進行快照。一旦該回合稍後成為歷史回合，仍會以這個相同的識別碼參照。
   */
  turnId: string;
  /**
   * 選用的不可變選取文字快照，帶入所建立側邊聊天的起源。
   *
   * 若存在，主機 MUST 在接受 `createChat` 時對此確切的選取範圍進行快照並保留；之後的來源回合差異不會改變它。
   */
  selection?: SideChatSelection;
}

/**
 * 識別新聊天的來源聊天。
 */
export type ChatSource =
  | ForkChatSource
  | SideChatSource;

/**
 * 在工作階段中建立新聊天。
 *
 * @category Commands
 * @method createChat
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 */
export interface CreateChatParams extends BaseParams {
  /** 包含新聊天的工作階段 URI。 */
  channel: URI;
  /** 聊天 URI（由用戶端選擇，例如 `ahp-chat:/<uuid>`）。 */
  chat: URI;
  /** 新聊天的選用初始訊息。 */
  initialMessage?: Message;
  /**
   * 選用的來源聊天與來源回合。
   *
   * 來源聊天 MUST 屬於此工作階段。用戶端 MUST 僅在所選代理程式公告
   * `capabilities.multipleChats.fork` 時請求 `kind: "fork"`，並僅在所選代理程式公告
   * `capabilities.multipleChats.sideChat` 時請求 `kind: "sideChat"`。兩種來源形式都帶有穩定的頂層 `turnId`。分叉的目標為已完成回合。側邊聊天也帶有穩定的 `turnId`，由主機對照來源聊天目前的活動回合或保留的歷史來解析。若它解析為活動回合，主機在接受 `createChat` 時會對目前可用的部分回應進行快照。當 `source.kind === "sideChat"` 且 `source.selection` 存在時，主機也會在所建立聊天的起源中對該確切選取文字進行快照並保留；其中的任何 `responsePartId` 僅作為出處，並非即時範圍。
   */
  source?: ChatSource;
  /**
   * 此聊天的初始工作目錄子集。每個項目 MUST 存在於所屬工作階段的 `workingDirectories` 中；伺服器 MUST 拒絕任何不存在的項目。若省略，聊天會繼承完整的工作階段集合。分叉聊天（`source.kind` 為 `"fork"` 的聊天）會繼承來源聊天的 `workingDirectories`；此欄位對分叉會被忽略。
   *
   * 除非代理程式公告 {@link AgentCapabilities.multipleWorkingDirectories}，否則用戶端 MUST NOT 提供此欄位。
   */
  workingDirectories?: URI[];
  /**
   * 聊天的主工作目錄 — 此聊天所置中的顯著根目錄。設定時，它 MUST 是聊天的有效工作目錄之一（{@link workingDirectories}，或省略時的工作階段集合）。當代理程式公告 {@link MultipleWorkingDirectoriesCapability.requiresPrimary} 時，用戶端 SHOULD 提供此項；主機 MAY 拒絕省略它的建立，或退回聊天的第一個目錄。建立時固定，並在 {@link ChatState.primaryWorkingDirectory} 上回報（唯讀）。對分叉會被忽略（`source.kind` 為 `"fork"` 的聊天會繼承來源聊天的主工作目錄）。
   */
  primaryWorkingDirectory?: URI;
}

// ─── disposeChat ─────────────────────────────────────────────────────────────

/**
 * 處置聊天並清理伺服器端資源。
 *
 * @category Commands
 * @method disposeChat
 * @direction 用戶端 → 伺服器
 * @messageType Request
 * @version 1
 */
export interface DisposeChatParams extends BaseParams {}
