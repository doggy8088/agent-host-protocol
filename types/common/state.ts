/**
 * 通用狀態類型 — 每個通道共用的通道無關基本型別。
 *
 * @module common/state
 * @description URI、圖示、內容參照、RFC 9728 中繼資料、JSON Schema
 * 輔助工具、位置／範圍類型、快照，以及其他不專屬於任一單一 AHP 通道的
 * 基本型別。
 */

import type { RootState } from '../channels-root/state.js';
import type { SessionState } from '../channels-session/state.js';
import type { TerminalState } from '../channels-terminal/state.js';
import type { ChangesetState } from '../channels-changeset/state.js';
import type { ResourceWatchState } from '../channels-resource-watch/state.js';
import type { AnnotationsState } from '../channels-annotations/state.js';
import type { ChatState } from '../channels-chat/state.js';

// ─── Type Aliases ────────────────────────────────────────────────────────────

/** URI 字串（例如 `ahp-root://`、`ahp-session:/<uuid>` 或 `ahp-chat:/<uuid>`）。 */
export type URI = string;

/**
 * 可選擇以 Markdown 呈現的字串。
 *
 * - 純 `string` 會原樣呈現（不進行 Markdown 處理）。
 * - 帶有 `{ markdown: string }` 的物件會以 Markdown 格式呈現。
 */
export type StringOrMarkdown = string | { markdown: string };

/** 基本 JSON 值：字串、數字、布林值或 `null`。 */
export type JsonPrimitive = string | number | boolean | null;

// ─── Icon ────────────────────────────────────────────────────────────────────

/**
 * 可選擇指定大小的圖示，可在使用者介面中顯示。
 *
 * @category Common Types
 */
export interface Icon {
  /**
   * 指向圖示資源的標準 URI。可以是 HTTP/HTTPS URL，或是帶有 Base64 編碼影像資料的
   * `data:` URI。
   *
   * 消費者 SHOULD 採取步驟，確保提供圖示的 URL 來自與用戶端／伺服器相同的網域或受信任的網域。
   *
   * 消費者 SHOULD 在使用 SVG 時採取適當的防護措施，因為 SVG 可能包含可執行的 JavaScript。
   */
  src: URI;

  /**
   * 選用的 MIME 類型覆寫值，用於來源 MIME 類型缺失或為通用型別時。
   * 例如：`"image/png"`、`"image/jpeg"` 或 `"image/svg+xml"`。
   */
  contentType?: string;

  /**
   * 選用的字串陣列，指定圖示可使用的尺寸。
   * 每個字串應為 WxH 格式（例如 `"48x48"`、`"96x96"`），或可縮放格式（如 SVG）使用 `"any"`。
   *
   * 若未提供，用戶端應假設該圖示可用於任何尺寸。
   */
  sizes?: string[];

  /**
   * 選用的指定值，說明此圖示所設計的主題。`"light"` 表示圖示設計用於淺色背景，
   * `"dark"` 表示圖示設計用於深色背景。
   *
   * 若未提供，用戶端應假設該圖示可用於任何主題。
   */
  theme?: 'light' | 'dark';
}

// ─── Protected Resource Metadata (RFC 9728) ─────────────────────────────────

/**
 * 使用 [RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728)（OAuth 2.0
 * 受保護資源中繼資料）語意，描述受保護資源的驗證需求。
 *
 * 欄位名稱使用 snake_case，以符合 RFC 9728 的 JSON 格式。
 *
 * @category Authentication
 * @see {@link https://datatracker.ietf.org/doc/html/rfc9728 | RFC 9728}
 */
export interface ProtectedResourceMetadata {
  /**
   * REQUIRED. 受保護資源的資源識別碼，一個使用 `https` 配置且不含片段元件的
   * URL（例如 `"https://api.github.com"`）。
   */
  resource: string;

  /** OPTIONAL. 受保護資源的人類可讀名稱。 */
  resource_name?: string;

  /** OPTIONAL. OAuth 授權伺服器識別碼 URL 的 JSON 陣列。 */
  authorization_servers?: string[];

  /** OPTIONAL. 受保護資源的 JWK Set 文件之 URL。 */
  jwks_uri?: string;

  /** RECOMMENDED. 用於授權請求的 OAuth 2.0 範圍值之 JSON 陣列。 */
  scopes_supported?: string[];

  /** OPTIONAL. 受支援之 Bearer Token 呈現方法的 JSON 陣列。 */
  bearer_methods_supported?: string[];

  /** OPTIONAL. 受支援之 JWS 簽章演算法的 JSON 陣列。 */
  resource_signing_alg_values_supported?: string[];

  /** OPTIONAL. 受支援之 JWE 加密演算法（alg）的 JSON 陣列。 */
  resource_encryption_alg_values_supported?: string[];

  /** OPTIONAL. 受支援之 JWE 加密演算法（enc）的 JSON 陣列。 */
  resource_encryption_enc_values_supported?: string[];

  /** OPTIONAL. 資源之人類可讀文件的 URL。 */
  resource_documentation?: string;

  /** OPTIONAL. 資源之資料使用政策的 URL。 */
  resource_policy_uri?: string;

  /** OPTIONAL. 資源之服務條款的 URL。 */
  resource_tos_uri?: string;

  /**
   * AHP 擴充功能。此資源是否需要驗證。
   *
   * - `true`（預設） — 沒有有效的令牌就無法使用代理程式。
   *   若用戶端在未驗證的情況下嘗試使用代理程式，伺服器 SHOULD 回傳
   *   `AuthRequired`（`-32007`）。
   * - `false` — 代理程式無須驗證即可運作，但當提供令牌時 MAY 提供增強的能力。
   *
   * 用戶端 SHOULD 將缺失的欄位視同 `true`。
   */
  required?: boolean;
}

// ─── Config Schema Types ─────────────────────────────────────────────────────

/**
 * 相容於 JSON Schema 的屬性描述器，附帶顯示擴充功能。
 *
 * 標準 JSON Schema 欄位（`type`、`title`、`description`、`default`、
 * `enum`）讓驗證器能處理該結構描述。顯示擴充功能（`enumLabels`、
 * `enumDescriptions`）為平行的陣列，為每個 `enum` 值提供 UI 中繼資料。
 *
 * 這是通用基底類型。關於工作階段專屬的擴充功能，請參見 {@link SessionConfigPropertySchema}。
 *
 * @category Config Schema Types
 */
export interface ConfigPropertySchema {
  /** JSON Schema：屬性類型 */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** JSON Schema：屬性的人類可讀標籤 */
  title: string;
  /** JSON Schema：描述／工具提示 */
  description?: string;
  /** JSON Schema：預設值 */
  default?: unknown;
  /** JSON Schema：允許的值。可為任一 JSON 類型的基本值。 */
  enum?: JsonPrimitive[];
  /** 顯示擴充功能：每個列舉值的人類可讀標籤（平行陣列） */
  enumLabels?: string[];
  /** 顯示擴充功能：每個列舉值的描述（平行陣列） */
  enumDescriptions?: string[];
  /** JSON Schema：當 `true` 時，屬性會顯示但使用者無法修改 */
  readOnly?: boolean;
  /** JSON Schema：陣列項目的結構描述（當 `type` 為 `'array'` 時使用） */
  items?: ConfigPropertySchema;
  /** JSON Schema：物件屬性的屬性描述器（當 `type` 為 `'object'` 時使用） */
  properties?: Record<string, ConfigPropertySchema>;
  /** JSON Schema：必要屬性 id 的清單（當 `type` 為 `'object'` 時使用） */
  required?: string[];
  /** JSON Schema：未列於 `properties` 中之額外屬性的結構描述（當 `type` 為 `'object'` 時使用）。 */
  additionalProperties?: ConfigPropertySchema;
}

/**
 * 描述可用設定屬性的 JSON Schema 物件。
 *
 * 這是通用基底類型。關於工作階段專屬的用法，請參見 {@link SessionConfigSchema}。
 *
 * @category Config Schema Types
 */
export interface ConfigSchema {
  /** JSON Schema：永遠為 `'object'` */
  type: 'object';
  /** JSON Schema：以屬性 id 為索引鍵的屬性描述器 */
  properties: Record<string, ConfigPropertySchema>;
  /** JSON Schema：必要屬性 id 的清單 */
  required?: string[];
}

// ─── Text Position / Range / Selection ───────────────────────────────────────

/**
 * 文字文件中以零為基底的某個位置。
 *
 * @category Turn Types
 */
export interface TextPosition {
  /** 以零為基底的行號。 */
  line: number;
  /** 該行內以零為基底的字元偏移量。 */
  character: number;
}

/**
 * 文字文件中的一個範圍。
 *
 * @category Turn Types
 */
export interface TextRange {
  /** 範圍的起始位置。 */
  start: TextPosition;
  /** 範圍的結束位置。 */
  end: TextPosition;
}

/**
 * 文字資源中的一個選取範圍。
 *
 * 這僅對文字資源有意義。二進位資源仍可使用資源或內嵌資源附件，但不應使用此
 * 文字選取欄位。
 *
 * @category Turn Types
 */
export interface TextSelection {
  /** 選取範圍所涵蓋的範圍。 */
  range: TextRange;
}

// ─── Content Ref ─────────────────────────────────────────────────────────────

/**
 * 對儲存於狀態樹外之大型內容的參照。
 */
export interface ContentRef {
  /** 內容 URI */
  uri: URI;
  /** 以位元組為單位的近似大小 */
  sizeHint?: number;
  /** 內容 MIME 類型 */
  contentType?: string;
  /** 內容 nonce */
  nonce?: string;
}

// ─── File Edit ───────────────────────────────────────────────────────────────

/**
 * 描述檔案修改的先後狀態與差異中繼資料。
 *
 * 支援建立（僅 `after`）、刪除（僅 `before`）、重新命名／移動
 * （`before` 與 `after` 中 `uri` 不同），以及編輯（`uri` 相同、內容不同）。
 *
 * @category Tool Result Content
 */
export interface FileEdit {
  /** 編輯前的檔案狀態。檔案建立或就地檔案編輯時不存在。 */
  before?: {
    /** 編輯前檔案的 URI */
    uri: URI;
    /** 編輯前檔案內容的參照 */
    content: ContentRef;
  };
  /** 編輯後的檔案狀態。檔案刪除時不存在。 */
  after?: {
    /** 編輯後檔案的 URI */
    uri: URI;
    /** 編輯後檔案內容的參照 */
    content: ContentRef;
  };
  /** 選用的差異顯示中繼資料 */
  diff?: {
    /** 新增的項目數（例如文字檔案的行數、筆記本的儲存格數） */
    added?: number;
    /** 移除的項目數（例如文字檔案的行數、筆記本的儲存格數） */
    removed?: number;
  };
}

// ─── Common Types ────────────────────────────────────────────────────────────

/**
 * @category Common Types
 */
export interface UsageInfo {
  /** 已消耗的輸入令牌 */
  inputTokens?: number;
  /** 已產生的輸出令牌 */
  outputTokens?: number;
  /** 使用的模型 */
  model?: string;
  /** 從快取讀取的令牌 */
  cacheReadTokens?: number;
  /**
   * 此用量報告的額外提供者專屬中繼資料。
   * 用戶端 MAY 在此尋找已知的選用索引鍵，以提供增強的 UI。
   */
  _meta?: Record<string, unknown>;
}

/**
 * @category Common Types
 */
export interface ErrorInfo {
  /** 錯誤類型識別碼 */
  errorType: string;
  /** 人類可讀的錯誤訊息 */
  message: string;
  /** 堆疊追蹤 */
  stack?: string;
  /**
   * 此錯誤的額外提供者專屬中繼資料。
   * 用戶端 MAY 在此尋找已知的選用索引鍵，以提供增強的 UI
   *（例如用於更豐富、本地化訊息的結構化聊天擷取錯誤）。
   */
  _meta?: Record<string, unknown>;
}

/**
 * 已訂閱資源狀態的某個時間點快照，由 `initialize`、`reconnect` 與
 * `subscribe` 回傳。
 *
 * @category Common Types
 */
export interface Snapshot {
  /** 已訂閱的通道 URI（例如 `ahp-root://`、`ahp-session:/<uuid>` 或 `ahp-chat:/<uuid>`） */
  resource: URI;
  /** 資源的目前狀態 */
  state: RootState | SessionState | TerminalState | ChangesetState | ResourceWatchState | AnnotationsState | ChatState;
  /** 取此快照時的 `serverSeq`。後續操作將具有 `serverSeq > fromSeq`。 */
  fromSeq: number;
}
