/**
 * OTLP 通道狀態類型 — 代理主機在根通道上公告的能力描述子，
 * 讓用戶端能探索主機發出的任何 OpenTelemetry 信號通道
 * （`ahp-otlp:` 方案）URI。
 *
 * @module channels-otlp/state
 */

import type { URI } from '../common/state.js';

// ─── TelemetryCapabilities ───────────────────────────────────────────────────

/**
 * 代理主機發出的 OTLP 遙測通道。
 *
 * 每個欄位出現時，不是字面通道 URI，就是
 * [RFC 6570](https://datatracker.ietf.org/doc/html/rfc6570) URI 範本，
 * 由用戶端展開後訂閱。缺少的欄位表示主機不發出該信號。
 *
 * 通道 URI 使用 `ahp-otlp:` 方案。此方案識別協定
 * （AHP 上的 OpenTelemetry），讓用戶端能單憑 URI 識別通道類型；
 * 主機可自由選擇對其實作有意義的任何授權／路徑。用戶端 MUST
 * 將 URI 視為不透明（除了展開下方定義的任何已知範本變數外），
 * 並以產生的具體 URI 訂閱。
 *
 * 這些通道上傳遞的有效負載為 OTLP/JSON 值——
 * 線路形狀（`ExportLogsServiceRequest`、
 * `ExportTraceServiceRequest`、`ExportMetricsServiceRequest`）詳見
 * [opentelemetry-proto](https://github.com/open-telemetry/opentelemetry-proto)。
 *
 * @category Telemetry
 */
export interface TelemetryCapabilities {
  /**
   * OTLP 日誌記錄（`otlp/exportLogs` 通知）的通道 URI
   * （或 RFC 6570 URI 範本）。
   *
   * 下列範本變數由此協定定義；任何其他變數名稱 MUST 被用戶端
   * 忽略（沒有協定定義的方式可取得未知變數的值）：
   *
   * | 範本中的變數 | 意義                                                                                                     |
   * | --------------------- | ------------------------------------------------------------------------------------------------------- |
   * | _(無)_              | 主機不支援訂閱者端的嚴重性過濾。範本本身即為可訂閱的 URI。 |
   * | `{level}`             | 要傳遞的最小 OTLP 嚴重性。展開為其中一個 [OTLP `SeverityNumber`](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber) 簡短名稱（不區分大小寫）：`trace`、`debug`、`info`、`warn`、`error`、`fatal`。伺服器傳遞 `severityNumber` 落在對應頻帶或以上的日誌記錄。 |
   *
   * 主機 SHOULD 遵守展開後的 `{level}`；用戶端 MUST 仍防禦性地
   * 過濾，以防主機忽略該參數。未公告 `{level}` 的主機會傳遞所有
   * 嚴重性。
   *
   * 未來的協定版本 MAY 新增新的已知變數（例如範圍或屬性過濾器）。
   */
  logs?: URI;
  /**
   * OTLP 追蹤（`otlp/exportTraces` 通知）的通道 URI。此協定
   * 版本未定義任何範本變數。
   */
  traces?: URI;
  /**
   * OTLP 指標資料點（`otlp/exportMetrics` 通知）的通道 URI。
   * 此協定版本未定義任何範本變數。
   */
  metrics?: URI;
}
