/**
 * OTLP 通道通知 — 伺服器 → 用戶端透過 AHP 推送 OpenTelemetry 資料。
 * 每種 OTLP 信號類型一個通知方法；params 的
 * `payload` 欄位原樣攜帶 OTLP/JSON `ExportXxxServiceRequest` 值。
 *
 * @module channels-otlp/notifications
 */

import type { URI } from '../common/state.js';

// ─── otlp/exportLogs ─────────────────────────────────────────────────────────

/**
 * 將一批 OTLP 日誌記錄傳遞給已訂閱主機日誌通道（公告於
 * `TelemetryCapabilities.logs`）的用戶端。
 *
 * `payload` 欄位是原樣的 OTLP/JSON `ExportLogsServiceRequest` 值
 * ——即形狀為 `{ resourceLogs: ResourceLogs[] }` 的物件，如
 * [opentelemetry-proto](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/logs/v1/logs_service.proto)
 * 所定義。AHP 不重新宣告 OTLP 類型系統；用戶端 SHOULD 使用
 * OpenTelemetry SDK 或 schema 來解析它。
 *
 * 如同所有無狀態通道通知，這是短暫的：重新連線時不會重播。
 * 訂閱者只會收到其 `subscribe` 成功後發出的批次。
 *
 * @category Telemetry Notifications
 * @method otlp/exportLogs
 * @direction 伺服器 → 用戶端
 * @messageType Notification
 * @version 1
 * @example
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "otlp/exportLogs",
 *   "params": {
 *     "channel": "ahp-otlp://logs",
 *     "payload": { "resourceLogs": [ /* OTLP/JSON ResourceLogs * / ] }
 *   }
 * }
 * ```
 */
export interface OtlpExportLogsParams {
  /** 此通知所屬的通道 URI（公告於 `TelemetryCapabilities.logs` 的 `ahp-otlp:` URI）。 */
  channel: URI;
  /**
   * OTLP/JSON `ExportLogsServiceRequest` 值。頂層欄位為
   * `resourceLogs: ResourceLogs[]`；巢狀形狀由
   * opentelemetry-proto 定義，此處不重新宣告。
   */
  payload: Record<string, unknown>;
}

// ─── otlp/exportTraces ───────────────────────────────────────────────────────

/**
 * 將一批 OTLP 追蹤傳遞給已訂閱主機追蹤通道（公告於
 * `TelemetryCapabilities.traces`）的用戶端。
 *
 * `payload` 欄位是原樣的 OTLP/JSON `ExportTraceServiceRequest` 值
 * ——即形狀為 `{ resourceSpans: ResourceSpans[] }` 的物件，如
 * [opentelemetry-proto](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/trace/v1/trace_service.proto)
 * 所定義。
 *
 * @category Telemetry Notifications
 * @method otlp/exportTraces
 * @direction 伺服器 → 用戶端
 * @messageType Notification
 * @version 1
 * @example
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "otlp/exportTraces",
 *   "params": {
 *     "channel": "ahp-otlp://traces",
 *     "payload": { "resourceSpans": [ /* OTLP/JSON ResourceSpans * / ] }
 *   }
 * }
 * ```
 */
export interface OtlpExportTracesParams {
  /** 此通知所屬的通道 URI（公告於 `TelemetryCapabilities.traces` 的 `ahp-otlp:` URI）。 */
  channel: URI;
  /**
   * OTLP/JSON `ExportTraceServiceRequest` 值。頂層欄位為
   * `resourceSpans: ResourceSpans[]`；巢狀形狀由
   * opentelemetry-proto 定義，此處不重新宣告。
   */
  payload: Record<string, unknown>;
}

// ─── otlp/exportMetrics ──────────────────────────────────────────────────────

/**
 * 將一批 OTLP 指標資料點傳遞給已訂閱主機指標通道（公告於
 * `TelemetryCapabilities.metrics`）的用戶端。
 *
 * `payload` 欄位是原樣的 OTLP/JSON `ExportMetricsServiceRequest` 值
 * ——即形狀為 `{ resourceMetrics: ResourceMetrics[] }` 的物件，如
 * [opentelemetry-proto](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/metrics/v1/metrics_service.proto)
 * 所定義。
 *
 * @category Telemetry Notifications
 * @method otlp/exportMetrics
 * @direction 伺服器 → 用戶端
 * @messageType Notification
 * @version 1
 * @example
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "otlp/exportMetrics",
 *   "params": {
 *     "channel": "ahp-otlp://metrics",
 *     "payload": { "resourceMetrics": [ /* OTLP/JSON ResourceMetrics * / ] }
 *   }
 * }
 * ```
 */
export interface OtlpExportMetricsParams {
  /** 此通知所屬的通道 URI（公告於 `TelemetryCapabilities.metrics` 的 `ahp-otlp:` URI）。 */
  channel: URI;
  /**
   * OTLP/JSON `ExportMetricsServiceRequest` 值。頂層欄位為
   * `resourceMetrics: ResourceMetrics[]`；巢狀形狀由
   * opentelemetry-proto 定義，此處不重新宣告。
   */
  payload: Record<string, unknown>;
}
