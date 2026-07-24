# @microsoft/代理主機協定

TypeScript 用戶端表示 [代理主機協定 (AHP)](https://microsoft.github.io/agent-host-protocol/)。

[![npm](https://img.shields.io/npm/v/@microsoft/agent-host-protocol.svg)](https://www.npmjs.com/package/@microsoft/agent-host-protocol)

基於全域 `WebSocket` API 建構的瀏覽器友善型用戶端。工作於
現代瀏覽器和 Node 21+ 無需額外的執行時間依賴。

## 入口點

該包公開了四個子路徑導出：

|導入路徑 |它給你什麼 |
|---|---|
| `@microsoft/agent-host-protocol` |連線路類型、操作、指令、reducer、版本常數。無輸入/輸出。 |
| `@microsoft/agent-host-protocol/client` | `AhpClient`、`Subscription`、`AhpStateMirror`、`AhpTransport` 介面、`InMemoryTransport` 與錯誤分類。 |
| `@microsoft/agent-host-protocol/hosts` | `MultiHostClient`、`HostClientHandle`、`ReconnectPolicy`、`ClientIdStore`（與 `InMemoryClientIdStore`）、`MultiHostStateMirror` 和 `Host*Error` 系列。基於 `/client` 構建，用於透過重新連線、產生檢查句柄和扇入事件來管理一個或多個主機連線。 |
| `@microsoft/agent-host-protocol/ws` | `WebSocketTransport` — 由全域 `WebSocket` 支援的 `AhpTransport` 實作。 |

分割鏡像了 Rust SDK (`ahp-types`, `ahp`, `ahp::hosts`,
`ahp-ws`) — 線路類型與reducer與用戶端解耦，
這又與特定的傳輸和
多主機編排層。

## 快速入門





```ts
import { ActionType, type ActionEnvelope } from '@microsoft/agent-host-protocol';
import { AhpClient, AhpStateMirror } from '@microsoft/agent-host-protocol/client';
import { WebSocketTransport } from '@microsoft/agent-host-protocol/ws';

const transport = await WebSocketTransport.connect('ws://localhost:12345');
const client = new AhpClient(transport);
const mirror = new AhpStateMirror();

client.connect();

const init = await client.initialize({
  clientId: 'my-client',
  protocolVersions: ['0.3.0'],
  initialSubscriptions: ['ahp-root://'],
});

for (const snapshot of init.snapshots) {
  mirror.applySnapshot(snapshot);
}

const root = client.attachSubscription('ahp-root://');
(async () => {
  for await (const event of root) {
    if (event.type === 'action') mirror.apply(event.params);
  }
})();

const sessionUri = `ahp-session:/${crypto.randomUUID()}`;
client.dispatch(sessionUri, {
  type: ActionType.SessionTurnStarted,
  // … remaining action fields
} as unknown as ActionEnvelope['action']);
```


## 可插拔傳輸

`AhpClient` 與傳輸無關。任何成幀訊息流—a
WebSocket、Unix 套接字、stdio 或用於測試的記憶體對 — 可以
傳回 `AhpTransport`：





```ts
import type { AhpTransport, TransportFrame, JsonRpcMessage } from '@microsoft/agent-host-protocol/client';

class MyTransport implements AhpTransport {
  send(message: JsonRpcMessage | string): void { /* … */ }
  async recv(): Promise<TransportFrame | null> { /* … */ }
  close(): void { /* … */ }
}
```


`InMemoryTransport.pair()` 傳回交換的兩個相連的半部分
文字框架－對於不需要真正套接字的單元測試很方便。

## reducer和狀態鏡像

reducer 函式（`rootReducer`、`sessionReducer`、
`terminalReducer`, `changesetReducer`) 是純的：重播動作
任何先前快照的 `serverSeq` 順序都會產生相同的狀態。這個
Rust 和 Swift 用戶端所依賴的屬性相同
重新連線。

`AhpStateMirror` 是一個便利函式，包含一個 `RootState`，一個
`Map<URI, SessionState>`，一個`Map<URI, TerminalState>`，和一個
`Map<URI, ChangesetState>`。應用 `Snapshot` 和 `ActionEnvelope` 以及
它使這些地圖保持最新狀態。較大的應用程式通常保留自己的
狀態並直接呼叫reducer。

## 錯誤

|班 |當它被拋出時 |
|---|---|
| `RpcError` |來自伺服器的 JSON-RPC 錯誤回應。攜帶 `code`、`message`、`data`。 |
| `RpcTimeoutError` |在伺服器回應之前觸發用戶端端逾時。攜帶`method`、`timeoutMs`。與 `RpcError` 不同。 |
| `TransportError` |底層傳輸失敗。 `kind: 'closed' \| 'io' \| 'protocol'`。 |
| `ClientClosedError` |當用戶端關閉時，請求正在處理中。 |
| `AhpClientError` |此 SDK 引發的每個錯誤的基類 - 使用 `instanceof` 捕獲所有錯誤。 |

格式錯誤的入站訊框不會拋出 - 它們透過 `console.warn` 記錄，並且通道保持活動狀態（與 Rust 用戶端的 `tracing::warn!` 行為相符）。如果丟棄的訊框是他們的回覆，則待處理的請求仍然會透過 `RpcTimeoutError` 逾時。

## 伺服器-發起的請求

某些 AHP 方法（目前為 `resourceRequest`）可以由
伺服器。預設情況下，用戶端使用 JSON-RPC `MethodNotFound` 進行回應
因此伺服器不會洩漏待處理的請求。安裝類型化處理器
接管：





```ts
client.setServerRequestHandler(async (method, params) => {
  if (method === 'resourceRequest') {
    return { /* … */ };
  }
  throw new RpcError(JsonRpcErrorCodes.MethodNotFound, 'unhandled');
});
```


## 重新連線

`AhpClient.reconnect(...)` 發送鍵入的 AHP `reconnect` 請求
已經開放的交通。它不決定何時重新連線、如何重新連線
經常重試，驗證錯誤是否為終端機，或如何
重新連線時更新 UI — 這些策略存在於應用程式中。

典型的應用程式層級重新連線流程是：

1. 打開新鮮運輸和`AhpClient`。
2. 在握手之前附加事件流。
3. 呼叫`connect()`和`reconnect({ clientId, lastSeenServerSeq, subscriptions })`。
4. 將傳回的重播操作或快照套用到您的應用程式商店。
5. 重新取得 `listSessions` 或其他暫存資料 — 協定
   通知不會重播。

如果您不想自己編寫該循環，請參閱
[`@microsoft/agent-host-protocol/hosts`](#multi-host-orchestration) —
它提供了一個擁有重新連線管理器的 `MultiHostClient`，
透過重新連線重新訂閱、鏡像根狀態並公開
代檢查的用戶端句柄。單主機消費者使用
`MultiHostClient.single(...)`。

## 多主機編排

對於同時與**一個或多個** AHP 主機通訊的應用程式（本地
工作階段伺服器加上隧道連線的遠端多個專案主機
在側邊欄中，...)，`@microsoft/agent-host-protocol/hosts` 進入點為
`MultiHostClient`：





```ts
import { ActionType } from '@microsoft/agent-host-protocol';
import { WebSocketTransport } from '@microsoft/agent-host-protocol/ws';
import {
  MultiHostClient,
  type HostTransportFactory,
} from '@microsoft/agent-host-protocol/hosts';

const openLocal: HostTransportFactory = async (_hostId, _signal) =>
  WebSocketTransport.connect('ws://localhost:12345');

// Single-host: same API, never see "registry" concepts.
const { multi, host } = await MultiHostClient.single({
  id: 'local',
  label: 'Local sessions server',
  transportFactory: openLocal,
});
console.log(`connected to ${host.label}: ${host.state.status}`);

// Multi-host: add as many as you need.
await multi.addHost({
  id: 'tunnel',
  label: 'Tunnel',
  transportFactory: async (_id, _signal) =>
    WebSocketTransport.connect('wss://my-tunnel.example/sessions'),
});

// Fan-in of every inbound event, tagged with host of origin.
for await (const event of multi.events()) {
  console.log(`[${event.hostId}] ${event.channel}`, event.event.type);
}
```


每個主機都運行自己的重新連線管理程序，並配置
`ReconnectPolicy`（預設為從 250 毫秒到 30 秒的指數退避
具有 25% 的抖動），重新連線後重新訂閱已知的 URI，以及
鏡像根狀態加上一個工作階段-summary 緩存，因此 `MultiHostClient
.aggreatedSessions()` and `aggreeratedAgents()` 是快照讀取，
不是扇出訂閱。每一次成功的（重新）連線都會碰撞一次
主機`generation`計數器； `HostClientHandle` 的鑄造時間較早
生成拋出 `HostReconnectedError` 而不是默默地寫入
新的連線。

持久化的 `clientId` 可以透過 `ClientIdStore` 來插入
介面。預設的 `InMemoryClientIdStore` 是工作階段-stable；
需要交叉啟動身份的生產應用程式包裝其平台的身份
安全儲存（`localStorage`、IndexedDB、節點 `fs`、
`safeStorage`，...）在自訂 `ClientIdStore` 中。

對於多主機狀態，每個資源狀態都有 `MultiHostStateMirror` 鍵
透過 `(hostId, uri)` 使 URI 能夠合法地跨主機衝突
（工作階段 URI 的正常情況）不要互相干擾。

## 線路類型

`src/types/` 下的線路類型是從 `types/*.ts` 產生的
儲存庫根並且**不提交**到儲存庫 - 避免
規範 TypeScript 來源的逐位元組複製。再生
每當您拉動或更改協定時：





```bash
npm run generate:typescript    # from the repo root
```


生成的文件帶有橫幅；不要手動編輯它們。的
`generate:typescript` 腳本也是 `npm run generate` 的一部分，其中
重新產生每種語言的用戶端輸出。

## 協定版本映射

該包從其預設值導出兩個協定版本常數
入口點：





```ts
import { PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from '@microsoft/agent-host-protocol';
```


- `PROTOCOL_VERSION` — SemVer 此軟體包版本的字串
  源樹實作。
- `SUPPORTED_PROTOCOL_VERSIONS` — 該軟體包願意的每個版本
  進行談判（最優先優先）。將其作為 `protocolVersions` 傳遞
  `InitializeParams`：

```ts
  await client.initialize({
    clientId: 'my-client',
    protocolVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
    initialSubscriptions: ['ahp-root://'],
  });
  ```

相同的訊息以機器可讀的形式鏡像在
[`release-metadata.json`](release-metadata.json) 並且，以人類可讀的形式
形式，在 [`CHANGELOG.md`](CHANGELOG.md) 中。 CI 驗證所有三個來源
同意每個PR。

## 發展

從新結帳來看：





```bash
# 1. Install the root tooling and generate the TS client's wire types.
npm install
npm run generate:typescript

# 2. Work in the client package.
cd clients/typescript
npm install
npm run typecheck
npm test
npm run build
```


CI 在安裝/類型檢查/測試/建置之前自動執行生成步驟
順序，因此貢獻者只需在拉取後在本地記住步驟 1
協定變更。

## 授權

MIT