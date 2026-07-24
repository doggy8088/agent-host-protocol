# AHP 用戶端插件

一個 [開放插件](https://github.com/nicobailon/open-plugin/blob/main/spec/specification.md)，提供用於透過 WebSocket 連線到代理主機協定伺服器的 MCP 伺服器，以及教導代理程式如何使用該協定的技能。

## 包含什麼

|元件|路徑|目的|
|------------|------|---------|
|清單 | `.plugin/plugin.json` |插件元資料（開啟插件規格）|
| MCP 伺服器設定 | `.mcp.json` |帶有 `${PLUGIN_ROOT}` 路徑的 MCP 伺服器宣告 |
| MCP 伺服器 | `mcp-server/` |帶有 `connect`、`send`、`get_notifications`、`status` 和 `next_id` 工具的 WebSocket 用戶端 |
|技能| `skills/ahp-client/SKILL.md` |協定指南、訊息範本和文件參考 |

## 設定





```bash
cd plugins/copilot-plugin/mcp-server
npm install
```


## MCP 工具

|工具|描述 |
|------|-------------|
| `connect` |連線（或重新連線）到給定 WebSocket URL 處的 AHP 伺服器 |
| `send` |發送 JSON-RPC 2.0 訊息字串；傳回響應和任何待處理的通知 |
| `get_notifications` |清空通知收件箱，並使用可選的 `wait`（秒）讓通知累積 |
| `status` |檢查連線狀態、待處理請求和收件箱深度 |
| `next_id` |取得一個單調遞增的整數以用作 JSON-RPC `id` |

## 它是如何工作的

MCP 伺服器維護一個**單一持久性 WebSocket** 連線。來自 AHP 伺服器的訊息被路由到兩個位置之一：

- **JSON-RPC 回應**（帶有與掛起請求匹配的 `id` 的訊息）被傳遞到等待的 `send` 呼叫。
- **其他所有內容**（操作通知，伺服器推播）都會進入**通知收件匣**，由 `send`（與回應一起）或明確透過 `get_notifications` 排出。

這種設計讓代理驅動完整的 AHP 工作階段：初始化、訂閱、建立工作階段、分派操作和流響應 - 所有這些都透過結構化的 MCP 工具呼叫。