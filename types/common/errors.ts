/**
 * 錯誤碼 — 所有 AHP 錯誤碼定義的真相來源。
 *
 * @module common/errors
 * @description AHP 使用 JSON-RPC 2.0 錯誤碼。除了標準 JSON-RPC 錯誤碼之外，
 * AHP 還在 `-32000` 到 `-32099` 的範圍內定義了應用專屬錯誤碼。
 */

import type { ProtectedResourceMetadata } from './state.js';
import type { ResourceRequestParams } from './commands.js';

// ─── Standard JSON-RPC Codes ─────────────────────────────────────────────────

/**
 * 標準 JSON-RPC 2.0 錯誤碼。
 *
 * @category Standard JSON-RPC Codes
 */
export const JsonRpcErrorCodes = {
  /** 無效的 JSON */
  ParseError: -32700,
  /** 不是有效的 JSON-RPC 請求 */
  InvalidRequest: -32600,
  /** 未知的 method 名稱 */
  MethodNotFound: -32601,
  /** 無效的方法參數 */
  InvalidParams: -32602,
  /** 未指定的伺服器錯誤 */
  InternalError: -32603,
} as const;

// ─── AHP Application Codes ──────────────────────────────────────────────────

/**
 * AHP 應用專屬錯誤碼。
 *
 * @category AHP Application Codes
 * @version 1
 */
export const AhpErrorCodes = {
  /** 所引用的工作階段 URI 不存在 */
  SessionNotFound: -32001,
  /** 所請求的代理程式提供者未註冊 */
  ProviderNotFound: -32002,
  /** 具有給定 URI 的工作階段已存在 */
  SessionAlreadyExists: -32003,
  /** 該操作要求沒有進行中的回合，但目前已有一個進行中 */
  TurnInProgress: -32004,
  /**
   * 伺服器無法使用用戶端在 `InitializeParams.protocolVersions` 中提供的任何
   * 協定版本。JSON-RPC 錯誤的 `data` 欄位 MAY 是一個
   * `UnsupportedProtocolVersionErrorData`，宣告伺服器願意使用的協定版本。
   */
  UnsupportedProtocolVersion: -32005,
  /** 所請求的內容 URI 不存在 */
  ContentNotFound: -32006,
  /**
   * 指令失敗，因為用戶端尚未針對必要的受保護資源進行驗證。JSON-RPC 錯誤的
   * `data` 欄位 MUST 是一個 `AuthRequiredErrorData`，描述需要驗證的資源。
   *
   * @see {@link /specification/authentication | 驗證}
   */
  AuthRequired: -32007,
  /** 所請求的檔案、資料夾或 URI 不存在 */
  NotFound: -32008,
  /**
   * 用戶端未獲許可存取所請求的資源。
   *
   * 當用戶端嘗試讀取或瀏覽允許集合之外的路徑（例如工作階段工作目錄或工作區
   * 根目錄之外）時，伺服器 SHOULD 回傳此錯誤。
   *
   * JSON-RPC 錯誤的 `data` 欄位 MAY 是一個 `PermissionDeniedErrorData`，
   * 宣佈一個 `resourceRequest`，若獲准將可解鎖該操作。
   */
  PermissionDenied: -32009,
  /**
   * 目標資源已存在，且該操作不允許覆寫（例如帶有 `createOnly: true` 的
   * `resourceWrite`）。
   */
  AlreadyExists: -32010,
  /**
   * 樂觀並行的先決條件失敗。
   *
   * 當請求帶有的先決條件令牌不再與接收端目前的狀態相符時回傳 — 例如
   * `resourceWrite` 帶有已被並行寫入取代的 `ifMatch` etag。呼叫端 SHOULD
   * 重新讀取資源（例如透過 `resourceResolve`），並決定是否要以新的令牌
   * 重試該操作，或將衝突呈現給使用者。
   */
  Conflict: -32011,
} as const;

/** 所有 AHP 應用錯誤碼的聯集類型。 */
export type AhpErrorCode = (typeof AhpErrorCodes)[keyof typeof AhpErrorCodes];

/** 所有 JSON-RPC 錯誤碼的聯集類型。 */
export type JsonRpcErrorCode = (typeof JsonRpcErrorCodes)[keyof typeof JsonRpcErrorCodes];

// ─── Error Detail Types ──────────────────────────────────────────────────────

/**
 * 在 `AuthRequired`（-32007）錯誤之 `data` 欄位中承載的詳細資料。
 *
 * 將受保護資源清單包裝在 `{ resources: [...] }` 中，而非回傳裸陣列，
 * 如此一來未來版本可新增額外欄位而不破壞線路格式。
 *
 * @category Error Details
 * @version 1
 */
export interface AuthRequiredErrorData {
  /** 需要驗證的受保護資源。 */
  resources: ProtectedResourceMetadata[];
}

/**
 * 在 `PermissionDenied`（-32009）錯誤之 `data` 欄位中承載的詳細資料。
 *
 * 接收端 MAY 宣佈一個 `resourceRequest` 有效負載，描述若獲准將可解鎖該操作的存取。
 * 呼叫端接著 MAY 以該有效負載發出 `resourceRequest` 來協商存取。
 *
 * @category Error Details
 * @version 1
 */
export interface PermissionDeniedErrorData {
  /**
   * 若透過 `resourceRequest` 獲准則可解鎖該操作的資源存取。當沒有任何特定的存取
   * 授權能解決此拒絕時省略（例如當資源根本無法存取時）。
   */
  request?: ResourceRequestParams;
}

/**
 * 在 `UnsupportedProtocolVersion`（-32005）錯誤之 `data` 欄位中承載的詳細資料。
 *
 * @category Error Details
 * @version 1
 */
export interface UnsupportedProtocolVersionErrorData {
  /**
   * 伺服器願意使用的協定版本。
   *
   * 每個項目若非 [SemVer](https://semver.org) `MAJOR.MINOR.PATCH` 字串
   *（例如 `"0.1.0"`），即為 [SemVer 範圍](https://semver.org/#spec-item-11)
   * 限制式（例如 `">=0.1.0 <0.3.0"` 或 `"^0.2.0"`）。
   */
  supportedVersions: string[];
}

/**
 * 將每個帶有結構化 `data` 的 AHP 錯誤碼對應到該資料的類型。
 *
 * 未出現在此對應中的錯誤碼，若非沒有 `data` 有效負載，即為帶有未指定的
 * 有效負載，呼叫端 SHOULD 將其視為 `unknown`。
 *
 * @category Error Details
 * @version 1
 */
export interface AhpErrorDetailsMap {
  [AhpErrorCodes.AuthRequired]: AuthRequiredErrorData;
  [AhpErrorCodes.PermissionDenied]: PermissionDeniedErrorData;
  [AhpErrorCodes.UnsupportedProtocolVersion]: UnsupportedProtocolVersionErrorData;
}

/** 帶有結構化 `data` 有效負載的 AHP 錯誤碼。 */
export type AhpErrorCodeWithData = keyof AhpErrorDetailsMap;

/**
 * 一個型別化的 JSON-RPC 錯誤物件，其 `data` 會依 `code` 縮窄。
 *
 * 對 `AhpErrorCode` 聯集進行分配，因此對 `code` 縮窄即可顯現精確的 `data` 類型。
 * 對於列於 {@link AhpErrorDetailsMap} 中的錯誤碼，`data` 為必要；對於所有其他
 * 錯誤碼，`data` 為選用的 `unknown`。
 *
 * ```ts
 * function handle(err: AhpError) {
 *   if (err.code === AhpErrorCodes.PermissionDenied) {
 *     err.data.request; // typed as ResourceRequestParams | undefined
 *   }
 * }
 * ```
 *
 * @category Error Details
 * @version 1
 */
export type AhpError<C extends AhpErrorCode = AhpErrorCode> =
  C extends AhpErrorCode
    ? C extends keyof AhpErrorDetailsMap
      ? {
        /** 錯誤碼。 */
        readonly code: C;
        /** 人類可讀的錯誤訊息。 */
        readonly message: string;
        /** 由 `AhpErrorDetailsMap` 規定的結構化詳細資料有效負載。 */
        readonly data: AhpErrorDetailsMap[C];
      }
      : {
        /** 錯誤碼。 */
        readonly code: C;
        /** 人類可讀的錯誤訊息。 */
        readonly message: string;
        /** 選用且未指定的詳細資料有效負載。 */
        readonly data?: unknown;
      }
    : never;
