/**
 * 根狀態型別 — 在 `ahp-root://` 通道上公開的全域狀態。
 *
 * @module channels-root/state
 */

import type {
  ConfigSchema,
  JsonPrimitive,
  ProtectedResourceMetadata,
} from '../common/state.js';
import type { TerminalInfo } from '../channels-terminal/state.js';
import type { Customization } from '../channels-session/state.js';

// ─── Root State ──────────────────────────────────────────────────────────────

/**
 * 模型的策略組態狀態。
 *
 * @category Root State
 */
export const enum PolicyState {
  Enabled = 'enabled',
  Disabled = 'disabled',
  Unconfigured = 'unconfigured',
}

/**
 * 與每個訂閱 `ahp-root://` 的用戶端共享的全域狀態。
 *
 * @category Root State
 */
export interface RootState {
  /** 可用的代理程式後端及其模型 */
  agents: AgentInfo[];
  /** 伺服器上作用中（未處置）工作階段的數量 */
  activeSessions?: number;
  /** 伺服器上已知的終端機。訂閱個別終端機 URI 以取得完整狀態。 */
  terminals?: TerminalInfo[];
  /** 代理主機的組態結構描述與目前值 */
  config?: RootConfigState;
  /**
   * 關於代理主機本身的額外實作定義中繼資料。
   *
   * 用戶端 MAY 在此尋找公認的鍵以提供增強的 UI。
   */
  _meta?: Record<string, unknown>;
}

/**
 * @category Root State
 */
export interface AgentInfo {
  /** 代理程式提供者 ID（例如 `'copilot'`） */
  provider: string;
  /** 人類可讀名稱 */
  displayName: string;
  /** 描述字串 */
  description: string;
  /** 此代理程式可用的模型 */
  models: SessionModelInfo[];
  /**
   * 此代理程式要求驗證的受保護資源。
   *
   * 每個項目使用 [RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728)
   * 語意描述一個 OAuth 2.0 受保護資源。用戶端應從宣告的
   * `authorization_servers` 取得權杖，並在以此代理程式建立工作階段之前，
   * 透過 `authenticate` 指令推送這些權杖。
   *
   * @see {@link /specification/authentication | 驗證}
   */
  protectedResources?: ProtectedResourceMetadata[];
  /**
   * 與此代理程式相關聯的自訂項目。
   *
   * 可能是容器自訂項目 —— 即代理程式隨附的
   * {@link PluginCustomization | `PluginCustomization`} 項目，加上它在所使用的
   * 任何工作區中監視的 {@link DirectoryCustomization | `DirectoryCustomization`}
   * 項目 —— 或是代理主機直接宣告的頂層
   * {@link McpServerCustomization | `McpServerCustomization`} 項目。當以此代理程式
   * 建立工作階段時，這些項目會被增強（例如將目錄 URI 解析為相對於工作區、解析
   * 子項）並傳播至工作階段的 `customizations` 清單。
   */
  customizations?: Customization[];
  /**
   * 代理程式關於自身所宣告的靜態能力。用戶端使用這些能力來控制功能
   * （多聊天、分支）的啟用，而不是依提供者 id 切換。
   */
  capabilities?: AgentCapabilities;
}

/**
 * {@link AgentInfo} 所宣告的靜態能力。仿照 MCP 能力建模：每個欄位都是選用加入，
 * 其存在（一個空物件 `{}`）表示支援，而缺席表示不支援該功能且對應的用戶端指令
 * MUST NOT 被使用。子欄位承載各能力專屬的選項。
 *
 * @category Root State
 */
export interface AgentCapabilities {
  /**
   * 代理程式可在每個工作階段中託管多個並行聊天。缺席時，用戶端 MUST NOT 呼叫
   * `createChat` 來開啟工作階段啟動時所伴隨預設聊天以外的聊天。空物件 `{}`
   * 宣告多聊天但不支援基於來源的建立；設定
   * {@link MultipleChatsCapability.fork} 或
   * {@link MultipleChatsCapability.sideChat} 以允許對應的模式。
   */
  multipleChats?: MultipleChatsCapability;
  /**
   * 工作階段的代理程式可被授予對多個工作目錄的工具存取權。這些目錄被視為同等
   * 對等項目，除非代理程式宣告
   * {@link MultipleWorkingDirectoriesCapability.requiresPrimary}
   * （某些後端需要將一個目錄指定為主要根）。
   *
   * 缺席時，用戶端 MUST NOT 變動工作階段或聊天的工作目錄集合，且 MUST NOT 在
   * {@link CreateSessionParams.workingDirectories} 中設定多於一個項目。
   */
  multipleWorkingDirectories?: MultipleWorkingDirectoriesCapability;
}

/**
 * {@link AgentCapabilities.multipleChats} 能力的選項。
 *
 * @category Root State
 */
export interface MultipleChatsCapability {
  /**
   * 代理程式可從特定回合分支聊天。缺席或 `false` 時，用戶端 MUST NOT 將帶有
   * `kind: "fork"` 的 {@link ChatSource} 傳給 `createChat`。
   * 分支一律表示支援多聊天。
   */
  fork?: boolean;
  /**
   * 代理程式可從特定回合建立側邊聊天。缺席或 `false` 時，用戶端 MUST NOT 將帶有
   * `kind: "sideChat"` 的 {@link ChatSource} 傳給 `createChat`。
   *
   * 側邊聊天會以來源回合作為脈絡，而不會將來源對話記錄複製到自身可見的歷程中。
   * 來源由穩定的 `turnId` 識別，主機會將其解析為相對於來源聊天目前的
   * `activeTurn` 或保留的歷程。當其指名為目前作用中的回合時，主機會在建立時
   * 對可用的部分代理程式回應建立快照。側邊聊天支援一律表示支援多聊天。
   */
  sideChat?: boolean;
}

/**
 * {@link AgentCapabilities.multipleWorkingDirectories} 能力的選項。
 *
 * @category Root State
 */
export interface MultipleWorkingDirectoriesCapability {
  /**
   * 代理程式要求每個聊天將其工作目錄之一指定為 **主要** —— 即聊天所圍繞的
   * 區別根（例如該聊天代理程式的程序根、相對路徑的預設位置）。主要是一個
   * **每個聊天** 的概念，固定於聊天建立之時。為 `true` 時，用戶端 SHOULD
   * 提供 {@link CreateChatParams.primaryWorkingDirectory}（以及
   * {@link CreateSessionParams.primaryWorkingDirectory}，其為工作階段預設聊天
   * 播種）；主機 MAY 拒絕省略它的建立，或退回至聊天工作目錄的第一個項目。所選
   * 的主要目錄會在 {@link ChatState.primaryWorkingDirectory} 上（唯讀）回報。
   *
   * 缺席或 `false` 時，代理程式沒有主要目錄 —— 所有目錄皆為同等對等項目，
   * 用戶端無須指定。
   */
  requiresPrimary?: boolean;
}

/**
 * @category Root State
 */
export interface SessionModelInfo {
  /** 模型識別碼 */
  id: string;
  /** 此模型所屬的提供者 */
  provider: string;
  /** 人類可讀的模型名稱 */
  name: string;
  /** 上下文視窗大小上限 */
  maxContextWindow?: number;
  /** 模型可產生的輸出權杖數上限 */
  maxOutputTokens?: number;
  /** 模型接受的提示（輸入）權杖數上限 */
  maxPromptTokens?: number;
  /** 模型是否支援視覺 */
  supportsVision?: boolean;
  /** 策略組態狀態 */
  policyState?: PolicyState;
  /**
   * 描述模型專屬選項（例如思考等級）的組態結構描述。用戶端將此呈現為表單，
   * 並在建立或變更工作階段時，將解析後的值傳入
   * {@link ModelSelection.config}。
   */
  configSchema?: ConfigSchema;
  /**
   * 此模型的額外提供者專屬中繼資料。
   *
   * 用戶端 MAY 在此尋找公認的鍵以提供增強的 UI。
   * 例如，`pricing` 鍵可承載模型定價中繼資料。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 模型選擇：所選的模型 ID 連同任何模型專屬組態值，這些值的鍵對應於模型的
 * {@link SessionModelInfo.configSchema}。
 *
 * @category Root State
 */
export interface ModelSelection {
  /** 模型識別碼 */
  id: string;
  /**
   * 模型專屬組態值。值為 JSON 基本型別：大多數挑選器產生字串，但有些
   * （例如數值上下文大小挑選器）產生數字或布林值，這些會原樣傳遞。
   */
  config?: Record<string, JsonPrimitive>;
}

// ─── Root Config Types ───────────────────────────────────────────────────────

/**
 * 即時代理主機組態中繼資料。
 *
 * 結構描述描述可用的組態屬性，而值包含每個已解析屬性的目前值。
 *
 * @category Root State
 */
export interface RootConfigState {
  /** 描述可用組態屬性的 JSON Schema */
  schema: ConfigSchema;
  /** 目前的組態值 */
  values: Record<string, unknown>;
}
