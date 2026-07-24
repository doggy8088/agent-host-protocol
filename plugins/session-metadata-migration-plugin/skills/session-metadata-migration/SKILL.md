---
description: >-
  將使用或實作代理主機協定的程式碼，遷移至扁平化 `SessionState`
  模型。當需要升級 AHP 用戶端／伺服器／綁定，並且看到 `SessionState`
  上的 `summary` 子物件（如 `state.summary.title`、`session.summary.modifiedAt`）、
  `SessionState`／`SessionSummary`／`ChatState`／`ChatSummary` 的
  `model`／`agent`，或出現 `session/modelChanged`、`session/agentChanged`
  行動、`createdAt`／`modifiedAt` 數字時間戳，或 `createSession`
 ／`createChat` 指令上的 `model`／`agent` 參數時，請使用此技能。
---

# AHP 工作階段-元資料遷移

此技能可協助您遷移使用（或實作）代理程式的程式碼庫
**扁平化 `SessionState`** 模型的主機協定。改變感動了所有人
工作階段元資料直接傳送到 `SessionState`，使 `SessionSummary` 成為
僅根通道目錄型別，將模型/代理 **選擇重新定位到每個
`Message`**（使用新的每個聊天 `draft`），將摘要時間戳切換為
ISO-8601 字串，並刪除 `session/modelChanged` /
`session/agentChanged` 行動。這是單一的突破步驟；沒有
過渡版本。

如果您也來自預通道協定，請運行
**`ahp-channels-migration`** 技能優先 - 該技能假設您已經開始
基於通道的模型。

遷移是機械的，但會同時觸及多個形狀，因此請在
傳遞而不是逐個文件。下面的順序可以最大程度地減少出現以下情況的可能性：
讓程式碼庫半毀。每次通過後，執行類型檢查/測試循環。

## 如何使用該技能

1. 閱讀 **心智模型** 部分，以便了解移動的內容和原因。
2. 依序完成**遷移過程**。每個人都夠獨立
   作為自己的承諾落地。
3. 使用 **Grep 備忘單** 尋找每個需要更新的網站。
4. 當對型別的新形狀有疑問時，請在 AHP 儲存庫中尋找
   `types/`（`channels-session/state.ts`，`channels-chat/state.ts`，
   `channels-session/actions.ts`, `channels-chat/actions.ts`) 和規範
   reducer（`types/channels-session/reducer.ts`，
   `types/channels-chat/reducer.ts`），或在`docs/specification/`。

## 心理模型

之前，`SessionState` 嵌入了 `summary: SessionSummary` 子物件，並且
相同的 `SessionSummary` 形狀既是即時的工作階段元資料*又*
目錄條目出現在根通道。模型和代理選擇是
工作階段範圍（`summary.model` / `summary.agent`，突變為
`session/modelChanged` / `session/agentChanged`），帶有可選的每次聊天
覆蓋 `ChatState` / `ChatSummary`。

現在：

- **`SessionState` 內嵌元資料。 ** 新的 `SessionMetadata` 基礎
  接口（`provider`、`title`、`status`、`activity?`、`project?`、
  `workingDirectory?`, `annotations?`) **直接擴展/內聯**到
  `SessionState`。不再有 `state.summary` - 讀 `state.title`，
  直接`state.status`、`state.activity`等。 `ChatState` 已經
  以這種方式對其摘要欄位進行非規範化； `SessionState` 現在匹配。
- **`SessionSummary` 是僅根目錄型別。 ** 它仍然存在並被使用
  透過 `listSessions`、`root/sessionAdded` 和 `root/sessionSummaryChanged` 到
  保持快取的工作階段清單同步。它共用 `SessionMetadata` 欄位
  並且另外擁有僅身分/目錄欄位：`resource`，
  `createdAt`、`modifiedAt` 和 `changes`。它**沒有**嵌入
  `SessionState`。主機自行決定更新 `modifiedAt`，且
  透過 `root/sessionSummaryChanged` 進行串流傳輸。
- **沒有工作階段- 或聊天等級的模型/代理選擇。 ** `model` 和
  從 `SessionState`、`SessionSummary`、`ChatState` 刪除 `agent`，且
  `ChatSummary`。選擇現在位於 **`Message`**：`Message.model?` 和
  `Message.agent?`。歷史訊息記錄了實際使用的選擇（因此
  用戶端編輯/重新傳送可以保留該選擇）；當訊息遺漏時
  對於它們，代理主機的預設設定適用。
- **聊天有一個 `draft`。 ** `ChatState.draft?: Message` 是使用者的
  正在進行的輸入（文字+附件+其模型/代理）。新的
  用戶端-可調度的 `chat/draftChanged` 操作設定或清除它。用戶端五月
  定期（Go抖，**不**急切）將其本地輸入狀態同步到
  `draft`，並且應該初始化任何現有聊天的輸入 UI
  `draft`。 `draft` 僅是狀態，**不**鏡像到 `ChatSummary`。
- **時間戳是 ISO-8601 字串。 ** `SessionSummary.createdAt` /
  `modifiedAt` 從數字（紀元毫秒）改為 ISO-8601 字串（例如
  `"2025-03-10T18:42:03.123Z"`)，符合 `ChatSummary.modifiedAt` 和
  `resource*` 檔案系統 `mtime`/`ctime`。
- **刪除了操作/參數。 ** `session/modelChanged` (`SessionModelChangedAction`)
  和 `session/agentChanged` (`SessionAgentChangedAction`) 消失了。的
  `model` / `agent` 參數已從 `createSession` 中刪除，並且`createChat`。
- **工作階段 reducer 不再標記時間戳記。 ** 標題/活動/已讀/
  存檔/配置操作會改變平面 `SessionState` 欄位，並且**不會**
  觸碰工作階段 `modifiedAt`（沒有）。聊天reducer繼續
  郵票`ChatState.modifiedAt`。

## 遷移通行證

按順序應用這些。範例為TypeScript（引用用戶端）； Rust，
Kotlin、Swift 和 Go 消費者使用自己的形狀應用相同的形狀更改
外殼（`modified_at`、`ModifiedAt` 等）。

### 第 1 遍 — 展平 `SessionState` 讀取與寫入

`SessionState.summary` 消失了。每個 `state.summary.<field>` 都變成
`state.<field>` 表示元資料欄位（`provider`、`title`、`status`、
`activity`、`project`、`workingDirectory`、`annotations`）。





```diff
- const title = session.summary.title;
- const isInProgress = (session.summary.status & SessionStatus.InProgress) !== 0;
- const cwd = session.summary.workingDirectory;
+ const title = session.title;
+ const isInProgress = (session.status & SessionStatus.InProgress) !== 0;
+ const cwd = session.workingDirectory;
```


建構 `SessionState` 時，將其建構成扁平的 — 不要巢狀 `summary`：





```diff
  const state: SessionState = {
-   summary: { resource, provider, title, status, createdAt, modifiedAt },
+   provider,
+   title,
+   status,
    lifecycle: SessionLifecycle.Creating,
    activeClients: [],
    chats: [],
  };
```


注意，`resource`、`createdAt` 和 `modifiedAt` 在 `SessionState` 上**不** —
它們只生活在根通道 `SessionSummary` 上（第 2 遍）。

### 第 2 步 — 將 `SessionSummary` 視為僅根目錄型別

`SessionSummary` 仍然存在，但僅作為根目錄上的目錄條目
通道。繼續將其用於由 `listSessions` 提供的快取工作階段列表，
`root/sessionAdded`和`root/sessionSummaryChanged`。不要**不要**讀掉它
`SessionState`，並且 **不要** 期待 `model` / `agent` （第 4 遍）。

如果您維護一個合併 `root/sessionSummaryChanged` 的工作階段-list 快取
增量，刪除 `model` / `agent` 案例（這些欄位不再存在於
摘要）並將 `modifiedAt` 保留為字串（第 3 遍）：





```diff
  if (changes.title !== undefined) merged.title = changes.title;
  if (changes.status !== undefined) merged.status = changes.status;
  if (changes.modifiedAt !== undefined) merged.modifiedAt = changes.modifiedAt;
- if (changes.model !== undefined) merged.model = changes.model;
  if (changes.workingDirectory !== undefined) merged.workingDirectory = changes.workingDirectory;
```


### Pass 3 — `createdAt` / `modifiedAt` 是 ISO-8601 字串

`SessionSummary.createdAt` 和 `modifiedAt` 現在是字串。更新任何程式碼
對它們進行解析、格式化、比較或算術運算。





```diff
- summaries.sort((a, b) => b.modifiedAt - a.modifiedAt);            // numeric subtraction
+ summaries.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : a.modifiedAt > b.modifiedAt ? -1 : 0));
```


ISO-8601 字串在字典比較下按時間順序排序，因此
純字串比較對於“最近修改”是正確的。要做日期數學，
使用 `Date.parse(...)` /您平台的 ISO 解析器進行解析。生產商認為
之前發出的 `Date.now()` 應該發出 `new Date().toISOString()`。

### 第 4 階段 — 刪除工作階段/聊天模型與代理程式選擇

刪除 `SessionState` 上對 `model` / `agent` 的所有讀/寫，
`SessionSummary`、`ChatState` 和 `ChatSummary`，並刪除所有使用
`session/modelChanged` 和 `session/agentChanged` 操作。

- **調度模型/代理更改**：沒有工作階段等級的選擇
  改變。選擇是下一個 `Message` 攜帶的任何內容（第 5 遍），因此
  模型選擇器只需更新聊天的 `draft` （第 6 遍）或設定 `model` /
  `agent` 在您要傳送的訊息上。
- **Reducers/handlers**：刪除 `SessionModelChanged` / `SessionAgentChanged`
  案例。從任何 `ChatSummary` 部分更新合併中刪除 `model` / `agent`
  （例如 `session/chatUpdated` 處理器）。





```diff
- store.dispatch(session, { type: 'session/modelChanged', model: { id: 'gpt-4o' } });
+ // Keep the picked model in your local input state and attach it to the
+ // outgoing message (Pass 5), or sync it into the chat draft (Pass 6).
```


### 第 5 步 — 將模型/代理人放在 `Message` 上

`Message` 得到了 `model?: ModelSelection` 和 `agent?: AgentSelection`。套裝
當您發送回合或轉向/排隊訊息時，然後從
編輯/重新發送時的歷史訊息。





```diff
  const message: Message = {
    text,
    origin: { kind: MessageKind.User },
    attachments,
+   model: selectedModel,   // omit to use the agent host's default
+   agent: selectedAgent,   // omit for no custom agent
  };
  store.dispatch(chat, { type: 'chat/turnStarted', turnId, message });
```


渲染現有回合時，其運行的模型/代理程式處於開啟狀態
`turn.message.model` / `turn.message.agent`（缺少⇒主機預設值）。

### 第 6 步 — 新增每個聊天 `draft` 和 `chat/draftChanged`

`ChatState.draft?: Message` 儲存使用者正在進行的輸入。線路二
方向：

- **從 `draft` 初始化輸入 UI。 ** 當您開啟/顯示聊天時，播種您的
  來自 `chat.draft` 的撰寫器（文本、附件、模型/代理）（如果存在）。
- **將本機輸入同步到 `draft`。 ** 定期調度 `chat/draftChanged`
  與當前撰寫器的內容。 **Debounce** — 渴望每次擊鍵同步
  不是必需的。發送訊息時不帶 `draft` 來清除它
  已發送。





```ts
// Debounced (e.g. on idle/blur), not on every keystroke:
store.dispatch(chat, {
  type: 'chat/draftChanged',
  draft: { text, origin: { kind: MessageKind.User }, attachments, model, agent },
});

// Clear after sending:
store.dispatch(chat, { type: 'chat/draftChanged' });
```


如果您維護 reducer，則 `chat/draftChanged` 情況是簡單的設定/清除
(`{ ...state, draft: action.draft }`) 且**不**標記`modifiedAt`。

### 第 7 關 — 從 `createSession` / `createChat` 掉落 `model` / `agent`

這些指令參數不再接受 `model` / `agent`。傳達最初的
而是選擇第一條訊息。





```diff
  await client.createSession({
    channel: sessionUri,
    provider: 'copilot',
-   model: { id: 'gpt-4o' },
-   agent: { uri: agentUri },
    workingDirectory,
  });
```







```diff
  await client.createChat({
    channel: sessionUri,
    chat: chatUri,
-   model: { id: 'gpt-4o' },
-   agent: { uri: agentUri },
-   initialMessage: { text, origin: { kind: MessageKind.User } },
+   initialMessage: { text, origin: { kind: MessageKind.User }, model, agent },
  });
```


### 第 8 關 — 更新您的 reducer（如果您維護一個）

鏡像 `types/channels-session/reducer.ts` 中的規範reducer並
`types/channels-chat/reducer.ts`：

- `session/titleChanged`→設定`state.title`； **沒有** `modifiedAt` 郵票。
- `session/isReadChanged` / `session/isArchivedChanged` → 翻轉標誌
  `state.status` 透過您的 `withStatusFlag` 助手。
- `session/activityChanged` → 設定 `state.activity`。
- `session/configChanged`→合併/替換`state.config.values`； **不**
  `modifiedAt` 郵票。
- 刪除 `session/modelChanged` 和 `session/agentChanged` 情況。
- 刪除任何標記工作階段摘要的 `modifiedAt` 的幫助程式（
  工作階段 reducer 不再擁有時間戳記）。讓您的聊天reducer保持專屬
  `modifiedAt` 沖壓及其可注射的「現在」接縫。
- 新增一個 `chat/draftChanged` 案例：`state.draft = action.draft`（設定或清除）。

`types/test-cases/reducers/` 中的共享一致性裝置已經編碼
新形狀（包括 `223-chat-draftchanged-sets-draft` 和
`224-chat-draftchanged-clears-draft`）；針對您的 reducer 執行它們。

## Grep 備忘單

在您的程式碼庫中執行這些搜尋。每個模式都是一個強烈的信號，表明
遷徙地點仍需注意。

|圖案|它顯示什麼 |
|--------------------|--------------------|
| `.summary.` 接近工作階段值 (`session.summary`、`state.summary`、`summary.title`、`summary.status`、`summary.workingDirectory`) |讀取已刪除的 `SessionState.summary` 的元資料（第 1 遍）|
| `SessionState` 文字中的 `summary:` |建立舊的巢狀形狀（第 1 遍）|
| `summary.modifiedAt` / `summary.createdAt` 用於算術或 `-`/`<`/`>` 數字比較 |數字時間戳假設（第 3 遍）|
| `createdAt:` / `modifiedAt:` 設定為數字，`Date.now()` 設定為摘要 |舊數字時間戳記（第 3 遍）|
| `session/modelChanged`、`session/agentChanged`、`SessionModelChangedAction`、`SessionAgentChangedAction` |刪除的操作（第 4 次）|
| 工作階段或聊天 **summary/狀態** 值上的 `.model` / `.agent`刪除了選擇欄位（第 4 遍）|
| `summary.model`、`summary.agent`、`changes.model`、`changes.agent` |刪除了總和欄位/`root/sessionSummaryChanged` 增量（第 4 遍）|
| `createSession(` / `CreateSessionParams` 與 `model:` 或 `agent:` |刪除了指令參數（第 7 遍）|
| `createChat(` / `CreateChatParams` 與 `model:` 或 `agent:` |刪除了指令參數（第 7 遍）|| `chat/draftChanged`，`ChatDraftChangedAction`，`ChatState.draft` |新草圖表面 - 確認同步/初始化它（第 6 步）|
| `Message` 為沒有 `model` / `agent` 的回合構造，其中存在選擇器 |訊息中未攜帶選擇（第 5 遍）|

## 驗證清單

遷移後，您的程式碼應該：

- [ ] 直接從 `SessionState` 讀取工作階段元資料 (`state.title`,
      `state.status`、`state.activity`、`state.workingDirectory`、...) — 否
      `state.summary`。
- [ ] 建構平坦的 `SessionState`，沒有巢狀的 `summary`，並且沒有
      `model` / `agent` / `createdAt` / `modifiedAt` 就可以了。
- [ ] 僅使用 `SessionSummary` 作為根通道目錄條目
      （`listSessions`、`root/sessionAdded`、`root/sessionSummaryChanged`）。
- [ ] 將 `SessionSummary.createdAt` / `modifiedAt` 視為 ISO-8601 字串
      它們在任何地方都被解析、格式化、排序或比較。
- [ ] 在 `Message.model` / `Message.agent` 上進行模型/代理選擇；讀一個
      來自 `turn.message` 的歷史回合選擇。
- [ ] 無 `session/modelChanged` / `session/agentChanged` 調度或處理，
      且 `SessionState` / `SessionSummary` / 上沒有 `model` / `agent`
      `ChatState` / `ChatSummary`。
- [ ] `createSession` / `createChat` 沒有 `model` / `agent` 參數。
- [ ] 從 `ChatState.draft` 初始化聊天輸入 UI 並（Go抖）同步
      撰寫器透過 `chat/draftChanged` 傳回，在發送時清除它。
- [ ] 如果您維護 reducer：工作階段 reducer 不再標記時間戳，以及 `chat/draftChanged` 情況設定/清除 `draft`。

當所有這些都成立時，您的消費者就處於扁平化-`SessionState` 模型。

## 參考

有關完整的規範性描述，請參閱以下文件：
`microsoft/agent-host-protocol` 儲存庫：

- `docs/guide/state-model.md` — `SessionState`，`SessionSummary`，`Message`，
  以及工作階段/chat 元資料關係
- `docs/specification/session-channel.md` — 工作階段通道狀態，
  根通道摘要的聊天聚合規則，用戶端-操作驗證
- `docs/specification/chat-channel.md` — 聊天狀態，訊息級模型/代理
  選擇和 `draft` / `chat/draftChanged` 行為
- `docs/specification/root-channel.md` — `listSessions`，`root/sessionAdded`，
  `root/sessionSummaryChanged` 和 ISO-8601 時間戳範例
- `types/channels-session/state.ts`，`types/channels-chat/state.ts` —
  `SessionMetadata`、`SessionState`、`SessionSummary`、`ChatState`、
  `ChatSummary`、`Message` 真相來源定義
- `types/channels-session/reducer.ts`，`types/channels-chat/reducer.ts` —
  要鏡像的規範 reducer 行為
- `types/test-cases/reducers/` — 共用一致性裝置，包括
  `chat/draftChanged` 例
