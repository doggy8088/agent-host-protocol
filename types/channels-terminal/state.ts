/**
 * 終端機狀態類型 — 在 `ahp-terminal:` 通道上公開的每個終端機狀態與內容片段。
 *
 * @module channels-terminal/state
 */

import type { URI } from '../common/state.js';

// ─── Terminal Types ──────────────────────────────────────────────────────────

/**
 * 在根狀態上公開的輕量終端機中繼資料。
 *
 * @category Terminal Types
 */
export interface TerminalInfo {
  /** 終端機 URI（可訂閱以取得完整終端機狀態） */
  resource: URI;
  /** 人類可讀的終端機標題 */
  title: string;
  /** 目前誰持有此終端機 */
  claim: TerminalClaim;
  /** 行程結束代碼（若終端機行程已結束） */
  exitCode?: number;
}

/**
 * 終端機聲明種類的判別欄位。
 *
 * @category Terminal Types
 */
export const enum TerminalClaimKind {
  Client = 'client',
  Session = 'session',
}

/**
 * 由已連線的用戶端聲明的終端機。
 *
 * @category Terminal Types
 */
export interface TerminalClientClaim {
  /** 判別欄位 */
  kind: TerminalClaimKind.Client;
  /** 聲明此終端機之用戶端的 `clientId` */
  clientId: string;
}

/**
 * 由工作階段聲明的終端機，可選擇性地限定到特定回合或工具呼叫。
 *
 * @category Terminal Types
 */
export interface TerminalSessionClaim {
  /** 判別欄位 */
  kind: TerminalClaimKind.Session;
  /** 聲明此終端機的工作階段 URI */
  session: URI;
  /** 工作階段內的選用回合識別碼 */
  turnId?: string;
  /** 回合內的選用工具呼叫識別碼 */
  toolCallId?: string;
}

/**
 * 描述目前誰持有終端機。終端機可由已連線的用戶端或工作階段聲明（例如在工具呼叫期間）。
 *
 * @category Terminal Types
 */
export type TerminalClaim = TerminalClientClaim | TerminalSessionClaim;

/**
 * 單一終端機的完整狀態，當用戶端訂閱終端機的 URI 時載入。
 *
 * @category Terminal Types
 */
export interface TerminalState {
  /** 人類可讀的終端機標題 */
  title: string;
  /** 終端機行程的當前工作目錄 */
  cwd?: URI;
  /** 終端機寬度（以欄為單位） */
  cols?: number;
  /** 終端機高度（以列為單位） */
  rows?: number;
  /**
   * 具類型的內容片段，取代平坦的 `content: string`。
   *
   * 只需要原始 VT 串流的簡易消費者可用以下方式重建它：
   *   `content.map(p => p.type === 'command' ? p.output : p.value).join('')`
   *
   * 需要指令邊界的消費者可依片段類型篩選。
   */
  content: TerminalContentPart[];
  /** 行程結束代碼，於終端機行程結束時設定 */
  exitCode?: number;
  /** 目前誰持有此終端機 */
  claim: TerminalClaim;
  /**
   * 此終端機是否發出 `terminal/commandExecuted` 與
   * `terminal/commandFinished` 操作並填入 `command` 類型的片段。
   *
   * 用戶端 MUST 在依賴指令偵測前檢查此旗標。
   * 切勿以 `command` 片段的存在與否作為功能旗標 — 片段
   * 在正常閒置狀態下是不存在的。
   */
  supportsCommandDetection?: boolean;
  /**
   * 此終端機風格資源是否由虛擬終端機支撐。
   * 當值為 `false` 時，輸出為純文字，用戶端不需要解析
   * VT 序列。
   */
  isPty?: boolean;
}

// ─── Terminal Content Parts ──────────────────────────────────────────────────

/**
 * 終端機輸出中的內容片段。
 *
 * @category Terminal Types
 */
export type TerminalContentPart =
  | TerminalUnclassifiedPart
  | TerminalCommandPart;

/**
 * 非結構化的終端機輸出 — 指令之前、之間或之後的內容，
 * 或來自不支援指令偵測的終端機。
 *
 * @category Terminal Types
 */
export interface TerminalUnclassifiedPart {
  type: 'unclassified';
  /** 累積的 VT 輸出。當沒有指令執行時，由 `terminal/data` 附加至此。 */
  value: string;
}

/**
 * 單一指令：其命令列與其產生的輸出。
 *
 * 當 `isComplete` 為 false 時，指令仍在執行；隨著 `terminal/data`
 * 操作抵達，`output` 會增長。在 `terminal/commandFinished` 時，此片段
 * 會就地變動為 `isComplete: true` 並帶有完成中繼資料。
 *
 * @category Terminal Types
 */
export interface TerminalCommandPart {
  type: 'command';
  /**
   * 穩定識別碼，與對應的 `terminal/commandExecuted` 與
   * `terminal/commandFinished` 操作上的 `commandId` 相符。
   */
  commandId: string;
  /** 提交給 shell 的命令列。 */
  commandLine: string;
  /**
   * 累積的 VT 輸出。當 `isComplete` 為 false 時，由 `terminal/data` 附加至此。
   * shell 整合逸出序列由伺服器剝除。
   */
  output: string;
  /** 執行開始時的 Unix 時間戳記（毫秒），由伺服器回報。 */
  timestamp: number;
  /** 指令是否已完成。 */
  isComplete: boolean;
  /** shell 結束代碼。於完成時設定。未知時為 `undefined`。 */
  exitCode?: number;
  /** 實際耗時（毫秒）。於完成時設定。 */
  durationMs?: number;
}
