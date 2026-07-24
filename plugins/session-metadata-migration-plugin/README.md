# AHP 工作階段-元資料遷移插件

一個 [開放插件](https://github.com/nicobailon/open-plugin/blob/main/spec/specification.md)，提供將 AHP 使用者（用戶端、伺服器或庫綁定）遷移到 **扁平化 `SessionState`** 模型以及與 `chat/draftChanged` 操作一起引入的 **訊息級模型/代理選擇** 的技能。

## 包含什麼

|元件|路徑|目的|
|------------|------|---------|
|清單 | `.plugin/plugin.json` |插件元資料（開啟插件規格）|
|技能| `skills/session-metadata-migration/SKILL.md` |驅動重構的代理的逐步遷移指南 |

## 何時使用

當您有針對舊的 AHP 形狀編寫的程式碼庫時呼叫此技能，其中：

- `SessionState` 嵌入了 `summary: SessionSummary` 子物件；
- `SessionState` / `SessionSummary` / `ChatState` / `ChatSummary` 攜帶 `model` 和 `agent`；
- 工作階段被重新配置為 `session/modelChanged` / `session/agentChanged`；
- `SessionSummary.createdAt` / `modifiedAt` 是數字（紀元毫秒）。

此技能透過 grep 備忘單和驗證清單，介紹了每一次破壞形狀的變更、欄位重新定位（模型/代理現在位於 `Message` 上，加上每個聊天 `draft`）、時間戳格式變更、刪除的操作和指令參數以及 reducer 變更。