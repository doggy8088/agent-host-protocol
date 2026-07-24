---
description: >-
  將使用或實作代理主機協定的程式碼，從舊有「預通道」模型
  遷移到目前的通道式模型。當需要升級 AHP 用戶端/伺服器，
  或看到 `agenthost:/root`、`<provider>:/<uuid>` 這類
  session URI、`notification` 封裝方法、`action` 參數內的
  `envelope` 欄位、subscribe/unsubscribe/snapshot 結果中的 `resource`
  欄位，或指令參數／行為負載上的 `session`、`terminal`、`changeset`
  欄位時，請使用此技能。
---

# AHP 通道遷移

此技能可協助您遷移使用（或實作）
代理主機協定從 **預通道模型** 到 **基於通道
RFC #117 所引入的模型**。遷移被納入協定中
作為與 `0.2.0` 版本提升一起的一個突破性步驟（這也
引入了變更集和 `session/customizationUpdated` 操作）。的
`0.2.0` 上的組合線路格式是此技能的目標；沒有
過渡版本。

這種遷移在大多數地方都是機械的，但會同時觸及多個形狀，
所以要分階段進行，而不是逐一文件進行。下面的順序最小化
使程式碼庫處於半損壞的狀態的可能性。

## 如何使用該技能

1. 從 **心智模型** 部分開始，以便您了解什麼是“管道”
   田地移動的方式和原因。
2. 依序完成**遷移過程**。每個通道都是獨立的
   足以讓你可以將其作為自己的提交。
3. 使用底部的 **Grep 備忘單** 尋找每個需要的站點
   更新您的程式碼庫。
4. 當對特定型別的新形狀有疑問時，請在 AHP 中尋找
   儲存庫的 `types/*.ts`（`state.ts`、`actions.ts`、`commands.ts`、
   `messages.ts`、`notifications.ts`) 或在 `docs/specification/` 中。

## 心理模型

在預通道世界中，AHP 擁有特權“狀態訂閱”
機制：用戶端訂閱 URI、取得快照並接收操作
該 URI 的狀態的信封。通知（工作階段目錄事件、
auth-required）被填入單一 `notification` 包裝器方法中。
包含狀態的資源的 URI 直接嵌入到操作中
有效負載（`action.session`，`action.terminal`）。

在基於管道的世界中，每一次推送式互動都依賴
**通道**，以 URI 識別。訂閱、行動交付以及
協定通知都帶有一個頂級 `channel: URI` 欄位，
標識訊息屬於哪個訂閱。一個通道可能有
關聯的狀態（根、工作階段、終端），或者它可能是無狀態的（未來
使用：日誌記錄、MCP、LSP 中繼）。不同類型的線路形狀是一致的。

具體來說：

- **根 URI**：`agenthost:/root` → `ahp-root://`
- **工作階段 URI 方案**：提供者命名 (`copilot:/<uuid>`) →
  文件/範例中的 `ahp-session:/<uuid>`。提供者繼續生存
  `SessionSummary.provider`，不在 URI 中。（實時工作階段 URI 是
  由伺服器宣布，因此這主要是文件/範例更改
  消費者 - 但型別等級的形狀變化仍然適用。）
- **終端機 URI 方案**（文件/範例）：`ahp-terminal:/<id>`。伺服器-
  定義；用戶端視為不透明。
- **變更集 URI 方案**（文件/範例）：`ahp-changeset:/<id>`。伺服器-
  定義；透過展開 `Changeset.uriTemplate` 獲得。
  變更集是在同一步驟中引入的新通道型別。
- **`channel` 無所不在**：`subscribe`/`unsubscribe`/action-envelope/
  `dispatchAction`/每個協定通知和每個指令都有
  `channel: URI` 位於其參數的頂層。命令是
  連線等級而不是通道範圍（例如 `initialize`、`ping`、
  `listSessions`、`resource*` 檔案系統指令、`authenticate`）
  將 `channel` 設定為文字 `'ahp-root://'`。- **動作負載是無通道的**：`session: URI` 和 `terminal: URI`
  個人行動中的領域已經消失。路由是透過信封進行的。
- **通知是頂級方法**：`notification` 包裝器和
  `ProtocolNotification` 聯盟消失了。
- **`SessionDiffsChangedAction` 消失了**：替換為
  `SessionChangesetsChangedAction`（工作階段上的目錄更新）加上
  每個變更集操作的新系列（`changeset/statusChanged`，
  `changeset/fileSet`，`changeset/fileRemoved`，
  `changeset/operationsChanged`，`changeset/cleared`）和
  `invokeChangesetOperation`指令。參見`docs/guide/changesets.md`。

## 遷移通行證

按順序應用這些。每次通過後，執行類型檢查/測試循環。

### Pass 1 — 重新命名根 URI





```
agenthost:/root  →  ahp-root://
```


這是一個立即斷線的重命名。任何訂閱的用戶端
使用舊 URI 的 root 狀態將收到來自通道時代的錯誤
伺服器。

更新程式碼、測試、裝置、配置和中的每個文字出現
文件。搜尋模式：

- TypeScript/JavaScript/JSON：`agenthost:/root`
- URI 由常數構造的任何地方：找出 `AHP_ROOT_URI`
  或類似的常數。

# # #通過2 — `subscribe`/`unsubscribe`參數： `resource` → `channel`





```ts
// before
{ method: 'subscribe',   params: { resource: <uri> } }
{ method: 'unsubscribe', params: { resource: <uri> } }

// after
{ method: 'subscribe',   params: { channel: <uri> } }
{ method: 'unsubscribe', params: { channel: <uri> } }
```


`SubscribeParams.resource` 現在是 `SubscribeParams.channel`。
`UnsubscribeParams.resource` 現在是 `UnsubscribeParams.channel`。統一資源定位符
狀態通道的值未變更 — 僅欄位名稱變更。

### 透過 3 — `SubscribeResult` 變成 `{ snapshot? }`

`subscribe` 請求的結果是平面快照。現在已經套件好了
在可選的 `snapshot` 欄位中，因為無狀態通道傳回 no
快照。





```ts
// before — SubscribeResult was the snapshot directly
{
  resource: 'ahp-session:/<uuid>',
  state:    { ... },
  fromSeq:  5,
}

// after — SubscribeResult is { snapshot?: Snapshot }
{
  snapshot: {
    resource: 'ahp-session:/<uuid>',
    state:    { ... },
    fromSeq:  5,
  }
}
```


對於無狀態通道，`snapshot` 被完全省略：





```ts
// stateless channel: subscribe returns an empty result
{}
```


更新破壞訂閱回應的每個地方。如果您的用戶端
將快照直接執行緒化到reducer中，您現在需要閱讀
`result.snapshot` 並將 `undefined` （無狀態）處理為單獨的路徑。

### Pass 4 — 動作信封帶有 `channel`；行動有效載荷遺失

信封產生了一個頂級 `channel` 欄位。每個人工作階段和
終端機操作遺失了其內部通道識別碼欄位。





```ts
// before — ActionEnvelope
{
  action: { type: 'session/delta', session: 'copilot:/<uuid>', turnId: 't1', ... },
  serverSeq: 6,
  origin: { ... },
}

// after — ActionEnvelope
{
  channel: 'ahp-session:/<uuid>',
  action:  { type: 'session/delta', turnId: 't1', ... },  // no `session` field
  serverSeq: 6,
  origin: { ... },
}
```


**生產者方面的變化**（任何構建行動信封或
單一操作）：停止在操作負載上填入 `session`/`terminal`。
改為填滿 `envelope.channel`。這兩個通常是相同的 URI
已經在使用了。

**消費者端更改**（將操作路由到 per-工作階段或
per-終端機 reducer）：切換您的調度鍵控
`action.session` / `action.terminal` 至 `envelope.channel`。 reducer
選擇變為「查看信封的 `channel`，按 URI 方案路由」。

失Go通道欄位的操作介面 - 完整清單：

- 所有工作階段操作：`SessionReadyAction`、`SessionCreationFailedAction`、
  `SessionTurnStartedAction`，`SessionDeltaAction`，
  `SessionResponsePartAction`，`SessionToolCallStartAction`，
  `SessionToolCallDeltaAction`，`SessionToolCallReadyAction`，
  `SessionToolCallConfirmedAction`，`SessionToolCallCompleteAction`，
  `SessionToolCallResultConfirmedAction`，
  `SessionToolCallContentChangedAction`，`SessionTurnCompleteAction`，
  `SessionTurnCancelledAction`，`SessionErrorAction`，
  `SessionTitleChangedAction`，`SessionUsageAction`，
  `SessionReasoningAction`，`SessionModelChangedAction`，
  `SessionServerToolsChangedAction`，
  `SessionActiveClientChangedAction`，
  `SessionActiveClientToolsChangedAction`，
  `SessionPendingMessageSetAction`，
  `SessionPendingMessageRemovedAction`，
  `SessionQueuedMessagesReorderedAction`，
  `SessionInputRequestedAction`，`SessionInputAnswerChangedAction`，
  `SessionInputCompletedAction`，`SessionCustomizationsChangedAction`，
  `SessionCustomizationToggledAction`，
  `SessionCustomizationUpdatedAction`，`SessionTruncatedAction`，
  `SessionIsReadChangedAction`，`SessionIsArchivedChangedAction`，
  `SessionActivityChangedAction`，
  `SessionChangesetsChangedAction`（替換已刪除的
  `SessionDiffsChangedAction`),
  `SessionConfigChangedAction`，`SessionMetaChangedAction`。
- 工具呼叫操作也遺失了 `session`，因為 `ToolCallActionBase` 沒有
  攜帶時間較長。 `turnId` 和 `toolCallId` 保留。
- 所有終端機操作：`TerminalDataAction`、`TerminalInputAction`、
  `TerminalResizedAction`，`TerminalClaimedAction`，
  `TerminalTitleChangedAction`，`TerminalCwdChangedAction`，
  `TerminalExitedAction`，`TerminalClearedAction`，
  `TerminalCommandDetectionAvailableAction`，
  `TerminalCommandExecutedAction`，`TerminalCommandFinishedAction`。
- 所有變更集操作（`0.2.0` 中的新增功能）：
  `ChangesetStatusChangedAction`，`ChangesetFileSetAction`，
  `ChangesetFileRemovedAction`，`ChangesetOperationsChangedAction`，
  `ChangesetClearedAction`。這些從未攜帶 `changeset: URI` 欄位
  在運輸代碼中 - 它在發布之前已被刪除。

### 第 5 遍 — `action` 伺服器通知：刪除 `envelope` 包裝器

伺服器 → 用戶端 `action` 方法先前套件了它的信封：





```ts
// before
{ method: 'action', params: { envelope: ActionEnvelope } }

// after
{ method: 'action', params: ActionEnvelope }   // envelope is the params, flat
```


無論您在何處建置或解析 `action` 通知，請刪除額外的
`{ envelope: ... }` 巢狀。

### 第 6 關 — `dispatchAction` 得到 `channel`

用戶端 → 伺服器仍然使用 `dispatchAction` 方法名稱（這**沒有**
重新命名為 `action`)。參數型別新增頂層 `channel`：





```ts
// before
{
  method: 'dispatchAction',
  params: { clientSeq: 1, action: { type: 'session/turnStarted', session: '...', ... } }
}

// after
{
  method: 'dispatchAction',
  params: {
    channel:   'ahp-session:/<uuid>',
    clientSeq: 1,
    action:    { type: 'session/turnStarted', turnId: '...', ... }   // no `session`
  }
}
```


### 第 7 階段 — 協定通知成為頂級方法

`notification` 包裝器方法消失了。每個協定通知是
現在它自己的頂級 JSON-RPC 方法有自己的參數型別，並且每個
帶有頂`channel`。

|預通道|後通道（方法）|參數型別 |
|----------------------------------------------------------------|---------------------------------|------------------------------------------------|
| `notification` → `notify/sessionAdded` | `root/sessionAdded` | `SessionAddedParams` |
| `notification` → `notify/sessionRemoved` | `root/sessionRemoved` | `SessionRemovedParams`|
| `notification` → `notify/sessionSummaryChanged` | `root/sessionSummaryChanged` | `SessionSummaryChangedParams`|
| `notification` → `notify/authRequired` | `auth/required` | `AuthRequiredParams` |

每個新參數型別都將 `channel: URI` 作為其頂層欄位。對於
`root/*` 通知，`channel` 是 `ahp-root://`。對於`auth/required`，
`channel` 可以是驗證要求範圍內的任何通道。





```ts
// before
{
  method: 'notification',
  params: {
    notification: {
      type:    'notify/sessionAdded',
      summary: { resource: 'copilot:/<uuid>', ... }
    }
  }
}

// after
{
  method: 'root/sessionAdded',
  params: {
    channel: 'ahp-root://',
    summary: { resource: 'ahp-session:/<uuid>', ... }
  }
}
```


刪除導入 `ProtocolNotification`、`NotificationType` 的任何程式碼
列舉、`NotificationMethodParams` 或組合的 `NotificationMap` — 這些
類型被刪除。將它們替換為每個方法的參數類型和
直接尋找線路級方法名稱。型別級約束
`ClientNotificationMap` / `ServerNotificationMap` 中的每個條目都有
`params extends { channel: URI }` 強制執行於
`types/version/message-checks.ts`，以及等效的檢查
`CommandMap` / `ServerCommandMap` 中的每個條目都有
`params extends BaseParams`（參閱第 10 遍）。

### Pass 8 — 工作階段 URI 方案（文件/範例 + 幫助程式）

如果您的程式碼透過類似的幫助程式建構工作階段 URI
`AgentSession.uri(provider, rawId)`，提供者元件不再是
編碼在方案中。更新助手以產生 `ahp-session:/<rawId>`
並刪除任何提取了的 `AgentSession.provider(session)` 查找
來自 URI 的提供者。從 `SessionSummary.provider` 讀取提供者
相反。

對於您談論的現有 AHP 伺服器 **宣布**的工作階段 URI
到，除了接受
新計劃。將工作階段 URI 視為不透明字串，除非您
專門建造它們。

### Pass 9 — 無狀態通道的重新連線/重播行為

`reconnect` 仍然帶有 `subscriptions: URI[]`。狀態-通道重播
行為沒有改變。無狀態通道（如果存在）是
重新連線時重新訂閱 - 缺少的訊息將被丟棄，永遠不會重播。
如果您實作伺服器：請勿在
`replay` 結果的 `actions` 列表。他們只會重新訂閱。

### Pass 10 — 指令攜帶 `channel: URI`

現在每個指令的參數都擴充了 `BaseParams { channel: URI }`。的
`channel` 欄位告訴伺服器指令針對哪個通道，因此
路由器可以發送任何傳入的訊息——請求、回應或
通知 - 透過檢查 `params.channel` 無需進一步
反序列化。

有兩種口味：

**通道範圍的指令** — 重新命名現有的
`session` / `terminal` / `changeset` 欄位至 `channel`。 URI 值為
不變。

|命令|老場|新領域 |
|----------------------------------------|------------------------|------------------------|
| `createSession` | `session: URI` | `channel: URI` |
| `disposeSession` | `session: URI` | `channel: URI` |
| `createTerminal` | `terminal: URI` | `channel: URI`|
| `disposeTerminal`| `terminal: URI` | `channel: URI` |
| `fetchTurns` | `session: URI` | `channel: URI` |
| `completions` | `session: URI` | `channel: URI` |
| `invokeChangesetOperation` | `changeset: URI` | `channel: URI` |
| `subscribe`，`unsubscribe`，`dispatchAction` |已經`channel`（第 2 次和第 6 次）|不變|

**連線級指令** — 將 `channel` 縮小為文字
`'ahp-root://'`。明確地新增該欄位； TS 類型強制執行它。

方法：`initialize`、`ping`、`reconnect`、`listSessions`、
`authenticate`，`resolveSessionConfig`，`sessionConfigCompletions`，
`resourceRead`、`resourceWrite`、`resourceList`、`resourceCopy`、
`resourceDelete`，`resourceMove`，`resourceRequest`。





```ts
// before
{ method: 'initialize', params: { protocolVersions: ['0.2.0'], clientId: 'c1' } }
{ method: 'listSessions', params: {} }
{ method: 'createSession', params: { session: 'ahp-session:/<uuid>', provider: 'copilot' } }
{ method: 'fetchTurns', params: { session: 'ahp-session:/<uuid>', limit: 20 } }

// after
{ method: 'initialize',   params: { channel: 'ahp-root://', protocolVersions: ['0.2.0'], clientId: 'c1' } }
{ method: 'listSessions', params: { channel: 'ahp-root://' } }
{ method: 'createSession', params: { channel: 'ahp-session:/<uuid>', provider: 'copilot' } }
{ method: 'fetchTurns',   params: { channel: 'ahp-session:/<uuid>', limit: 20 } }
```


編譯時檢查 `_CheckCommandsHaveChannel`
`types/version/message-checks.ts` 驗證中的每個條目
`CommandMap` / `ServerCommandMap` 具有可指派給 `BaseParams` 的參數。
如果您忘記將 `channel` 新增到新命令的參數中，則檢查
無法編譯並指向缺失的欄位。

## Grep 備忘單

在您的程式碼庫中執行這些搜尋。每個模式都是一個強烈的信號，表明
遷徙地點仍需注意。

|圖案|它顯示什麼 |
|------------------------------------------------|--------------------|
| `agenthost:/root` |舊的根 URI 文字（第 1 遍）|
| `"resource"`/`resource:` 靠近 `subscribe`/`unsubscribe`/`Subscribe` |舊訂閱參數形狀（第 2 遍）|
|訂閱後立即 `result.resource` / `result.state` / `result.fromSeq` |舊的平面快照訂閱結果（第 3 遍）|
| `action.session` / `action.terminal` | `action.session` / `action.terminal` |從動作負載讀取通道 — 應該來自信封（第 4 遍）|
|動作文字內的 `session:` |製作人編寫預通道有效負載（第 4 階段）|
| `params.envelope` 靠近 `'action'` |舊的 `action` 伺服器通知包裝器（第 5 遍）|
| `dispatchAction` 沒有 `channel` | 用戶端調度缺少的通道（第 6 遍）|
| `'notification'` 作為 JSON-RPC 方法名稱 |舊協定通知包裝器（第 7 遍）|
| `notify/sessionAdded`、`notify/sessionRemoved`、`notify/sessionSummaryChanged`、`notify/authRequired` |舊協定通知名稱（第 7 遍）|| `ProtocolNotification`、`NotificationType`、`NotificationMethodParams`、`NotificationMap` |刪除的型別（第 7 遍）|
| `SessionAddedNotification`、`SessionRemovedNotification`、`SessionSummaryChangedNotification`、`AuthRequiredNotification` |舊通知介面 — 重新命名為 `*Params`（第 7 遍）|
|從工作階段方案中提取的 `AgentSession.provider`、`provider` |舊的provider-via-scheme 助手（第8 步） |
| `SessionDiffsChangedAction`，`summary.diffs`，`session/diffsChanged` |刪除以支援變更集（第 4 遍清單）|
| `CreateSessionParams\W+session:`、`DisposeSessionParams\W+session:`、`CreateTerminalParams\W+terminal:`、`DisposeTerminalParams\W+terminal:`、`FetchTurnsParams\W+session:`、`CompletionsParams\W+session:`、`InvokeChangesetOperationParams\W+changeset:` |通道範圍的指令參數仍使用舊的欄位名稱（第 10 遍）|
| `ListSessionsParams()`、`PingParams()`、`ResourceReadParams\(uri:`（無 `channel:`）或任何其他不使用 `channel` | 建構的指令參數連線級指令缺少 `channel: 'ahp-root://'` 文字（第 10 遍）|

## 驗證清單

遷移後，您的程式碼應該：

- [ ] 訂閱 `ahp-root://` 而非 `agenthost:/root`。
- [ ] 將 `{ channel }`（不是 `{ resource }`）傳給 `subscribe` 和 `unsubscribe`。
- [ ] 從 `subscribe` 回應中讀取 `result.snapshot`；容忍
      `snapshot === undefined` 用於無狀態通道。
- [ ] 使用頂級 `channel` 建構行動信封。否
      各個操作負載內的 `session` / `terminal` 欄位。
- [ ] 使用 `action` 伺服器通知的參數作為信封
      本身，而不是 `{ envelope }`。
- [ ] 使用頂級 `channel` 建構 `dispatchAction` 參數。
- [ ] 作為頂級方法接收協定通知
      （`root/sessionAdded`、`root/sessionRemoved`、
      `root/sessionSummaryChanged`, `auth/required`) 而非巢狀
      在`notification`內。
- [ ] 不導入 `ProtocolNotification`、`NotificationType`、
      `NotificationMethodParams` 或 `NotificationMap`。
- [ ] 透過 `SessionSummary.provider` 解析工作階段的提供者，而非透過
      URI 方案。
- [ ] 沒有 `SessionDiffsChangedAction` / `summary.diffs` 引用；消耗
      `SessionState.changesets` 加上 `changeset/*` 操作系列。
- [ ] 每個指令的參數都帶有 `channel: URI`。通道範圍指令（`createSession`、`disposeSession`、`createTerminal`、
      `disposeTerminal`，`fetchTurns`，`completions`，
      `invokeChangesetOperation`) 傳遞目標通道 URI；
      連線級命令傳遞文字 `'ahp-root://'`。

當所有這些都成立時，您的消費者就處於通道模型中。

## 參考

有關通道模型的完整規格描述，請參閱這些
`microsoft/agent-host-protocol` 儲存庫中的文件：

- `docs/specification/subscriptions.md` — 通道與訂閱（
  框架，包括無狀態通道和 URI 方案表）
- `docs/specification/root-channel.md` — 根通道狀態、操作和
  協定通知
- `docs/specification/session-channel.md` — 工作階段通道生命週期，
  用戶端-操作驗證，待處理訊息消耗
- `docs/specification/terminal-channel.md` — 終端機通道資料流
  和命令檢測
- `docs/specification/lifecycle.md` — 連線握手和重新連線
- `docs/guide/changesets.md` — 變更集通道模型、目錄、
  每個變更集狀態和 `invokeChangesetOperation`
- `types/actions.ts`，`types/commands.ts`，`types/messages.ts`，
  `types/notifications.ts` — 真實來源型別定義
  （`BaseParams` 居住在 `commands.ts`）
- `types/version/message-checks.ts` — 編譯時檢查每個
  指令和通知攜帶`channel: URI`
- GitHub 問題 [#117](https://github.com/microsoft/agent-host-protocol/issues/117)
  — 引入通道模型的 RFC
