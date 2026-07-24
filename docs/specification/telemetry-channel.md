# 遙測通道

遙測通道是代理主機向 AHP 用戶端發送 OpenTelemetry (OTel) 資料（日誌、追蹤和指標）的方式。這是一個精簡的傳遞：線路上的有效負載是逐字的 [OTLP/JSON](https://github.com/open-telemetry/opentelemetry-proto) 值。 AHP 僅新增路由信封。

此頁面是規範的。 OTel 資料模型本身由 [opentelemetry-proto](https://github.com/open-telemetry/opentelemetry-proto) 定義； AHP 不重新宣告它。

## URI 方案

遙測通道使用 `ahp-otlp:` 方案。 URI 的權限和路徑部分是實作定義的。主機也可以通告 [RFC 6570](https://datatracker.ietf.org/doc/html/rfc6570) URI 範本；用戶端使用此規格中的值擴充範本（目前日誌通道上只有 `{level}`），並使用產生的特定 URI 進行訂閱。

除了擴展此處定義的眾所周知的模板變數之外，用戶端必須將 URI 視為不透明，並使用主機在 `InitializeResult.telemetry` 上通告的值（擴展後）進行訂閱。

三個訊號的 URI 不要求共用公共路徑、主機或任何其他結構。每個人都是獨立的。

## 發現

代理主機在 `InitializeResult.telemetry` 上通告其發出的 OTel 訊號以及在哪個通道 URI 上：





```jsonc
// Server → Client (initialize response, excerpt)
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "0.3.0",
    "serverSeq": 0,
    "snapshots": [],
    "telemetry": {
      "logs":    "ahp-otlp://logs{?level}",
      "traces":  "ahp-otlp://traces",
      "metrics": "ahp-otlp://metrics"
    }
  }
}
```


每個欄位都是可選的。不發出指標的主機會簡單地忽略 `metrics`。根本不發出遙測資料的主機完全忽略 `telemetry`。用戶端應該只訂閱它們可以處理的訊號。

## 訂閱

遙測通道是無狀態的*，訂閱回傳空的 `SubscribeResult`。訂閱成功後，用戶端會收到訂閱期間主機發出的批次的 `otlp/export*` 通知。





```jsonc
// Client → Server
{ "jsonrpc": "2.0", "id": 2, "method": "subscribe",
  "params": { "channel": "ahp-otlp://logs" } }

// Server → Client
{ "jsonrpc": "2.0", "id": 2, "result": {} }
```


重新連線時不會重播遙測資料。 `reconnect` 之後，用戶端重新訂閱並從即時邊緣恢復。

## 線路格式

每個 OTel 訊號只有一種伺服器 → 用戶端通知方法：

|方法|通道|有效負載|
|---|---|---|
| `otlp/exportLogs` | `TelemetryCapabilities.logs` | OTLP/JSON [`ExportLogsServiceRequest`](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/logs/v1/logs_service.proto) |
| `otlp/exportTraces` | `TelemetryCapabilities.traces` | OTLP/JSON [`ExportTraceServiceRequest`](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/trace/v1/trace_service.proto) |
| `otlp/exportMetrics` | `TelemetryCapabilities.metrics` | OTLP/JSON [`ExportMetricsServiceRequest`](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/metrics/v1/metrics_service.proto) |

每個通知的參數具有以下形狀：





```jsonc
{
  "channel": "<the ahp-otlp: URI from InitializeResult.telemetry>",
  "payload": { /* OTLP/JSON ExportXxxServiceRequest, verbatim */ }
}
```


`channel` 欄位遵循通用 AHP 規則：每個通知的參數都攜帶其作用範圍的通道 URI。用戶端依 `channel` 路由批次，然後將 `payload` 解析為 OTLP/JSON。

### 範例 — 日誌





```jsonc
{
  "jsonrpc": "2.0",
  "method": "otlp/exportLogs",
  "params": {
    "channel": "ahp-otlp://logs",
    "payload": {
      "resourceLogs": [
        {
          "resource": {
            "attributes": [
              { "key": "service.name",     "value": { "stringValue": "ahp-agent-host" } },
              { "key": "ahp.session.id",   "value": { "stringValue": "f1e3...e0" } }
            ]
          },
          "scopeLogs": [
            {
              "scope": { "name": "agent-host.tools" },
              "logRecords": [
                {
                  "timeUnixNano": "1736870400000000000",
                  "severityNumber": 9,
                  "severityText": "INFO",
                  "body": { "stringValue": "tool call started" },
                  "attributes": [
                    { "key": "tool.name", "value": { "stringValue": "read_file" } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
```


### 範例 — 軌跡和指標

追蹤和指標通知具有相同的信封；僅 `payload` 內的頂級欄位名稱不同（`resourceSpans` 表示跟蹤，`resourceMetrics` 表示指標）。請參閱 opentelemetry-proto 以了解完整的資料形狀。

## 過濾

日誌通道透過 [RFC 6570](https://datatracker.ietf.org/doc/html/rfc6570) URI 範本支援可選的訂閱者端嚴重性過濾。支援過濾的主機會通告包含 `{level}` 變數的模板，例如`"ahp-otlp://logs{?level}"`；不支援過濾的主機會通告文字 URI。

|模板中的變數 |意義|
| --- | --- |
| _（無）_ |所有日誌記錄均已傳送。 |
| `{level}` |以短名稱（不區分大小寫）形式提供的最低 [OTLP `SeverityNumber`](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber)：`trace`、`debug`、`info`、`warn`、`error`、`fatal`。伺服器傳送 `severityNumber` 位於對應範圍或以上的記錄（例如 `info` → `severityNumber >= 9`，涵蓋 INFO/WARN/ERROR/FATAL）。 |





```jsonc
// Host advertises:                  "ahp-otlp://logs{?level}"
// Client expands {level=info} and subscribes to:
{ "jsonrpc": "2.0", "id": 7, "method": "subscribe",
  "params": { "channel": "ahp-otlp://logs?level=info" } }
```


從伺服器的角度來看，每個不同的擴充都是自己的訂閱 URI，因此在不同層級訂閱的兩個用戶端會接收獨立的預過濾流。通告文字 URI（無 `{level}`）的主機提供所有嚴重性。

目前沒有為追蹤或指標定義過濾器變數。

## 相關性

主機應該使用標準 OpenTelemetry 資源和記錄屬性將遙測與 AHP 實體關聯起來 - 例如：

- `service.name`（資源）：標識主機。
- `ahp.session.id`（資源或 LogRecord/Span 屬性）：工作階段 URI 的 UUID。
- `ahp.turn.id`、`ahp.tool_call.id`（LogRecord/Span 屬性）：記錄所屬的回合或工具呼叫。

這些是約定，而不是協定欄位；用戶端想要按工作階段/回合分割遙測資料，透過接收端的屬性過濾來實作。