# 根通道

根通道是每個 AHP 伺服器所公開的頂級通道。它攜帶全域狀態 - 伺服器提供的代理程式、它所管理的終端機和主機級配置 - 以及工作階段的目錄事件。

## 網址





```
ahp-root://
```


每個伺服器只存在一個根通道。用戶端應在握手期間透過 `initialSubscriptions` 訂閱它，以在同一往返中接收代理清單、終端機清單和主機配置。

## 狀態

訂閱者收到 [`RootState`](/reference/root#rootstate) 快照：





```typescript
RootState {
  agents: AgentInfo[]
  activeSessions?: number
  terminals?: TerminalInfo[]
  config?: RootConfigState
}
```


- `agents` — 伺服器可以與之通訊的代理後端，包括它們進行身份驗證所需的任何 `protectedResources`。請參閱[身份驗證](/specification/authentication)。
- `activeSessions` — 未處置的工作階段數量。輕量級徽章計數器。
- `terminals` — 輕量級的每終端機元資料，用於呈現終端機管理器 UI，而無需訂閱每個終端機。請參閱 [終端機通道](/specification/terminal-channel) 以了解完整的狀態。
- `config` — 主機級設定模式和目前值。

工作階段列表**不是**根狀態的一部份。用戶端透過 [`listSessions`](/reference/root#listsessions) 命令式取得它，並從下面描述的 `root/*` 通知中修補它。

### 將目錄分頁

可以增量地取得大型目錄。 [`listSessions`](/reference/root#listsessions) 接受可選的 `limit`（用戶端在頁面中想要的最大條目數 — 伺服器應遵守它，但可以傳回更少的值，並且可以施加自己的上限）和可選的不透明 `cursor`。結果攜帶 `items` 中的頁面以及可選的 `nextCursor`：

- 若要取得第一頁，請省略 `cursor`。提供 `limit` 來限制頁面大小。
- 如果結果包含 `nextCursor`，則存在更多條目 - 在下次呼叫時將其作為 `cursor` 傳回以取得下一頁。
- 缺少 `nextCursor` 表示目錄結束。

遊標**不透明且由伺服器定義**：伺服器選取順序和鍵集。用戶端不得跨連線解析、修改或保留遊標。無法辨識的遊標應該被拒絕並出現 `InvalidParams` 錯誤。伺服器應該先傳回最近修改的條目，因此第一頁是立即有用的頁面。

分頁是完全附加的。省略 `limit`/`cursor` 並忽略 `nextCursor` 的用戶端會看到預分頁行為（受任何伺服器施加的上限限制），而不分頁的伺服器會忽略輸入並傳回一頁中的所有內容。分頁僅管理初始和回填取得 - `root/session*` 通知使已載入的頁面與先前一樣保持活動狀態。

## 該通道上的方法和事件

本節列出了在上下文中解釋的連線方法
`ahp-root://`。如果 `params.channel` 是其他一些 URI，則它們由
改為目標通道。

### 指令 (`params.channel = "ahp-root://"`)

|方法|親切 |為什麼它屬於root |
|---|---|---|
| `initialize` |請求 |連線級握手指令；範圍僅限於根通道。 |
| `ping` |請求 |連線活躍度檢查；範圍僅限於根通道。 |
| `reconnect` |請求 |連線恢復/重播協商；範圍僅限於根通道。 |
| `listSessions` |請求 | 工作階段目錄位於根目錄上（`root/session*` 事件使快取保持最新）。 |
| `resourceRead` |請求 |檔案系統/內容存取是連線等級的，而不是工作階段本地的。也可以發出 **伺服器 → 用戶端** 以從用戶端發佈的 URI 中取得。 |
| `resourceWrite` |請求 |檔案系統/內容存取是連線等級的，而不是工作階段本地的。也可能針對主機驅動的每工作階段 FS 提供者發布 **伺服器 → 用戶端**。 |
| `resourceList` |請求 |檔案系統/內容存取是連線等級的，而不是工作階段本地的。也可能發布 **伺服器 → 用戶端**。 || `resourceCopy` |請求 |檔案系統/內容存取是連線等級的，而不是工作階段本地的。也可能發布 **伺服器 → 用戶端**。 |
| `resourceDelete` |請求 |檔案系統/內容存取是連線等級的，而不是工作階段本地的。也可能發布 **伺服器 → 用戶端**。 |
| `resourceMove` |請求 |檔案系統/內容存取是連線等級的，而不是工作階段本地的。也可能發布 **伺服器 → 用戶端**。 |
| `resourceResolve` |請求 | `stat` + `realpath` 組合；如果缺少 URI，則拋出 `NotFound`。也可能發布 **伺服器 → 用戶端**。 |
| `resourceMkdir` |請求 | `mkdir -p` 語意。也可能發布 **伺服器 → 用戶端**。 |
| `resourceRequest` |請求 |權限授予/撤銷流程是連線等級的。對稱：任一對等方都可以發起。 |
| `createResourceWatch` |請求 |開啟檔案更改觀察器；接收者傳回一個 `ahp-resource-watch:/<id>` 通道。也可以發出 **伺服器 → 用戶端** 來觀看用戶端端 URI。當訂閱者取消訂閱時，觀察者就會被釋放——沒有明確的 dispose 呼叫。 |
| `authenticate` |請求 |受保護資源的承載令牌推送是連線層級的。 |
| `resolveSessionConfig` |請求 |預先建立組態解析發生在任何工作階段通道存在之前。 |
| `sessionConfigCompletions` |請求 |完成預先建立工作階段配置中的動態欄位。 |

### 通知 (`params.channel = "ahp-root://"`)

|方法|親切 |意義|
|---|---|---|
| `action` | 伺服器 → 用戶端通知 |根範圍的操作信封（`root/*` 操作有效負載）。 |
| `root/sessionAdded` | 伺服器 → 用戶端通知 |已建立工作階段目錄條目。 |
| `root/sessionRemoved` | 伺服器 → 用戶端通知 | 工作階段目錄條目已刪除。 |
| `root/sessionSummaryChanged` | 伺服器 → 用戶端通知 | 工作階段目錄條目變更。 |
| `root/progress` | 伺服器 → 用戶端通知 | 用戶端所選的長時間運行操作的一般進度（例如 SDK 下載）。 |
| `unsubscribe` | 用戶端 → 伺服器通知 |停止接收根通道訊息。 |
| `dispatchAction` | 用戶端 → 伺服器通知 |調度根範圍的用戶端操作（目前為 `root/configChanged`）。 |

當驗證要求時，`auth/required` 也可能在 `ahp-root://` 上發出
是根範圍的；請參閱[驗證](/specification/authentication)。

## 行動

根狀態因該通道上廣播的動作信封而發生突變。完整清單請參考[根通道參考](/reference/root#actions)；根範圍的運算是：

|行動|方向 | reducer 效果 |
| ---------------------------- | ---------------- | ------------------------------------------------ |
| `root/agentsChanged` | 伺服器 |取代 `agents` |
| `root/activeSessionsChanged` | 伺服器 |取代 `activeSessions` |
| `root/terminalsChanged` | 伺服器 |取代 `terminals` |
| `root/configChanged` | 伺服器 / 用戶端 |合併（或替換）`config.values` |

所有根範圍的操作信封都有 `channel: "ahp-root://"`。

## 協定通知

除了操作信封之外，伺服器還將每個工作階段目錄事件推送給 `ahp-root://` 的訂閱者。這些通知使快取的工作階段清單保持同步，而無需單獨訂閱每個工作階段 URI。

### `root/sessionAdded`

建立新的工作階段時發出。





```json
{
  "jsonrpc": "2.0",
  "method": "root/sessionAdded",
  "params": {
    "channel": "ahp-root://",
    "summary": {
      "resource": "ahp-session:/<uuid>",
      "title": "New Session",
      "status": 1,
      "createdAt": "2024-03-09T16:00:00.000Z",
      "modifiedAt": "2024-03-09T16:00:00.000Z"
    }
  }
}
```


### `root/sessionRemoved`

當工作階段被處置時發出。





```json
{
  "jsonrpc": "2.0",
  "method": "root/sessionRemoved",
  "params": {
    "channel": "ahp-root://",
    "session": "ahp-session:/<uuid>"
  }
}
```


### `root/sessionSummaryChanged`

當現有 [`SessionSummary`](/reference/session#sessionsummary) 上的任何可變欄位發生變更（標題、狀態、`modifiedAt`、工作目錄、讀取/完成狀態、變更統計資料等）時發出。只攜帶變化的欄位；身分欄位（`resource`、`provider`、`createdAt`）永遠不會改變，而且必須省略。





```json
{
  "jsonrpc": "2.0",
  "method": "root/sessionSummaryChanged",
  "params": {
    "channel": "ahp-root://",
    "session": "ahp-session:/<uuid>",
    "changes": {
      "title": "Refactor auth middleware",
      "status": 8,
      "modifiedAt": "2024-03-09T16:02:03.456Z"
    }
  }
}
```


伺服器可以針對雜訊的欄位合併或消除此通知 - 例如，串流媒體播放期間的快速 `modifiedAt` 碰撞，或編輯突發期間的頻繁 `changes` 更新。沒有 `session` 快取條目的用戶端可以忽略該通知。

與所有協定通知一樣，`root/*` 事件是短暫的，並且在重新連線時**不會**重播。重新連線後，用戶端應透過 [`listSessions`](/reference/root#listsessions) 重新取得目錄。

## 進步

伺服器可以發出 `root/progress` 來報告用戶端選擇的長時間運行操作的增量進度 - 最明顯的是代理本機 SDK 的惰性首次使用下載。用戶端透過在原始請求上提供 `progressToken` 來選擇加入（現在是 [`createSession`](/reference/session#createsession) 的 `progressToken` 欄位）；伺服器在每一幀上回顯該標記，因此用戶端可以將進度與呼叫和等待的 UI 相關聯。該通知與操作無關—它不命名任何網域物件。





```json
{
  "jsonrpc": "2.0",
  "method": "root/progress",
  "params": {
    "channel": "ahp-root://",
    "progressToken": "9b2c1f7e-4a0d-4e2b-8b1a-2f7e4a0d4e2b",
    "progress": 18874368,
    "total": 41957498,
    "message": "Downloading Claude agent…"
  }
}
```


對於給定的 `progressToken`，`progress` 是單調非遞減的。 `total` 僅在預先已知其大小時才出現（例如 `Content-Length`）；如果不存在，用戶端應顯示不確定的指示符。當 `progress === total` 時操作完成 - 伺服器必須發出滿足此要求的最終幀，當總數未知時將 `total` 設為最終的 `progress`，此後不再有任何幀引用該令牌。可選的 `message` 攜帶人類可讀的正在進行的工作的描述；跟蹤令牌的用戶端呈現其自己的（本地化）標籤並可以忽略它，而通用的用戶端可以逐字顯示 `message`。伺服器可能根本不會發出任何進度（例如，當工作已經完成時），在這種情況下，用戶端根本不會顯示指示符。與目錄事件一樣，`root/progress` 是短暫的，並且在重新連線時**不會**重播。

## 身份驗證事件

當代理人的受保護資源需要（重新）驗證時，伺服器可以在根通道上發出 [`auth/required`](/specification/authentication#auth-expiry-notification)。請參閱[身份驗證](/specification/authentication) 以了解完整流程。