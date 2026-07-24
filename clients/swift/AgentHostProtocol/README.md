# AgentHostProtocol Swift 包

此軟體包包含代理主機協定 (AHP) 的 Swift 庫。程式包清單位於儲存庫根目錄，因為 Swift 程式包管理器從根目錄 `Package.swift` 解析遠端程式包，而 Swift 來源位於 `clients/swift/AgentHostProtocol/` 下。

## 產品

- `AgentHostProtocol` 提供產生的協定類型、命令、通知、操作和reducer。當您只需要解碼協定資料或自行套用狀態 reducer時，請使用此產品。
- `AgentHostProtocolClient` 在 `AgentHostProtocol` 之上提供可重複使用的用戶端幫助程式：
  - 用於 JSON-RPC 請求關聯、訂閱扇出、傳輸整合的單主機 `AHPClient`，以及用於 `initialize`、`reconnect`、`subscribe`、`unsubscribe`、`dispatch` 和任意請求的類型化幫助程式。
  - `MultiHostClient` 適用於需要與多個主機建立受監督連線的應用程式。為每主機主管任務提供退避、產生檢查的用戶端句柄、每主機工作階段摘要快取、聚合檢視以及執行時擁有的每資源事件流，這些事件流在重新連線後仍然存在。
  - 狀態鏡像助手：`AHPStateMirror`（單主機）和 `MultiHostStateMirror`（多主機，由 `(hostId, uri)` 鍵控）。
  - `ClientIdStore` 實作：`InMemoryClientIdStore`（預設）和 `FileClientIdStore`（檔案系統支援，原子寫入）。

用戶端產品有意成為協定/用戶端層，而不是完整的應用程式商店。應用程式特定的策略，例如伺服器選擇、驗證、重新連線 UX、持久的工作階段快取和樂觀的出站操作重播應存在於應用程式中。 `MultiHostClient` 擁有每個主機的主管策略、退避、扇入和聚合主機視圖；它不會取代已套用的產品狀態型號。

## 安裝

新增此儲存庫作為 SwiftPM 依賴項：





```swift
.package(url: "https://github.com/microsoft/agent-host-protocol.git", from: "0.1.0")
```


然後取決於一種或兩種產品：





```swift
.target(
    name: "MyApp",
    dependencies: [
        .product(name: "AgentHostProtocol", package: "agent-host-protocol"),
        .product(name: "AgentHostProtocolClient", package: "agent-host-protocol"),
    ]
)
```


## 最小單主機用戶端

此範例開啟一個 WebSocket 連線，在 `initialize` 期間訂閱根通道，套用傳回的快照，然後套用後續操作事件。





```swift
import AgentHostProtocol
import AgentHostProtocolClient
import Foundation

let transport = URLSessionWebSocketTransport(url: URL(string: "wss://example.com/ahp")!)
let client = AHPClient(transport: transport)
let mirror = AHPStateMirror()

// Attach event streams before connecting so notifications delivered during the
// initialize window are not missed.
let events = await client.events

Task {
    for await event in events {
        switch event.event {
        case .action(let envelope):
            await mirror.apply(envelope)
        case .sessionAdded, .sessionRemoved, .sessionSummaryChanged, .authRequired:
            // Protocol notifications are ephemeral and are not replayed on
            // reconnect. Apps commonly refresh listSessions() after reconnect.
            print("notification: \(event.event)")
        }
    }
}

try await client.connect()

let initialized = try await client.initialize(
    clientId: "my-client-id",
    protocolVersions: ["0.2.0"],
    initialSubscriptions: [RootResourceURI]
)

for snapshot in initialized.snapshots {
    await mirror.applySnapshot(snapshot)
}
```


`AHPStateMirror` 為簡單消費者提供便利。較大的應用程式可以保留自己的狀態儲存，並直接透過產生的reducer路由快照/操作。

## 多主機用戶端

當一個應用程式與多個 AHP 主機通訊時，或當您希望單一主機使用相同的 Supervisor 模型時，請使用 `MultiHostClient`。它擁有每主機傳輸建立、重新連線退避、穩定的 `clientId` 查找、事件扇入、工作階段-摘要緩存、生成檢查的用戶端句柄和確定性聚合視圖。





```swift
import AgentHostProtocolClient
import Foundation

let local = HostConfig(id: "local", label: "Local") { _ in
    URLSessionWebSocketTransport(url: URL(string: "wss://local.example/ahp")!)
}

let remote = HostConfig(id: "remote", label: "Remote") { _ in
    URLSessionWebSocketTransport(url: URL(string: "wss://remote.example/ahp")!)
}

let multi = MultiHostClient()
try await multi.add(local)
try await multi.add(remote)

let events = await multi.events()
Task {
    for await event in events {
        print("[\(event.hostId)] \(String(describing: event.resource))")
    }
}

let sessions = await multi.aggregatedSessions()
for hosted in sessions {
    print("[\(hosted.hostLabel)] \(hosted.summary.title)")
}
```


單主機使用者可以使用與 `MultiHostClient.single(...)` 相同的形狀，並且從不直接管理登錄。

## 協定版本映射

`AgentHostProtocol` 模組公開兩個協定版本常數：

- `PROTOCOL_VERSION` — SemVer 此軟體包版本的字串
  源樹實作。
- `SUPPORTED_PROTOCOL_VERSIONS` — 該軟體包願意的每個版本
  進行談判（最優先優先）。將其作為 `protocolVersions` 傳遞
  `InitializeParams`。

相同的訊息以機器可讀的形式鏡像在
[`clients/swift/release-metadata.json`](../release-metadata.json) 並且，
以人類可讀的形式，在 [`clients/swift/CHANGELOG.md`](../CHANGELOG.md) 中。
CI 驗證所有三個來源在每個 PR 上都一致。

## 重新連線分層

`AHPClient.reconnect(...)` 在已開啟的傳輸上傳送類型化的 AHP `reconnect` 請求。它不會決定何時重新連線、重試頻率、是否回退到 `initialize`、驗證錯誤是否為終端機，或如何在重新連線時更新 UI。

典型的應用程式層級重新連線流程是：

1. 打開新鮮運輸和`AHPClient`。
2. 在握手之前附加事件流。
3. 呼叫`connect()`。
4. 呼叫`reconnect(clientId:lastSeenServerSeq:subscriptions:)`。
5. 將傳回的重播操作或快照套用到應用程式商店。
6. 重新取得 `listSessions` 或其他臨時資料，因為不會重播協定通知。
7. 恢復任何應用程式擁有的未確認的待處理出站操作。

`MultiHostClient` 擁有每個主機的此主管策略。較低層級的 `AHPClient` 為想要完全控制的呼叫者保持明確的重新連線編排。

## 調度和應用程式擁有的寄件箱

`dispatchAction` 是一勞永逸的通知。當直播或重播的 `ActionEnvelope` 包含相同的 `origin.clientId` 和 `origin.clientSeq` 時，伺服器確認會稍後出現。

`AHPClient.dispatch(_:channel:)` 是簡單用戶端的便利性；它在內部分配 `clientSeq` 並傳回帶有發送序列的 `DispatchHandle`。 `AHPClient.dispatch(_:channel:clientSeq:)`、`MultiHostClient.dispatch(host:action:channel:clientSeq:)`和`HostClientHandle.dispatch(_:channel:clientSeq:)`讓更高層直接提供穩定的序號。

重新連線後需要重播未確認的本機操作的應用程式應擁有其出站佇列並傳送明確的 `clientSeq` 值：





```swift
struct PendingOutboundAction {
    let clientSeq: Int
    let channel: String
    let action: StateAction
}

var nextClientSeq = 1
var pendingOutboundActions: [PendingOutboundAction] = []

func dispatchFromApp(_ action: StateAction, channel: String, multi: MultiHostClient) async throws {
    let seq = nextClientSeq
    nextClientSeq += 1
    pendingOutboundActions.append(PendingOutboundAction(clientSeq: seq, channel: channel, action: action))

    try await multi.dispatch(host: "local", action: action, channel: channel, clientSeq: seq)
}

func acknowledge(_ envelope: ActionEnvelope, clientId: String) {
    guard let origin = envelope.origin,
          origin.clientId == clientId,
          pendingOutboundActions.first?.clientSeq == origin.clientSeq else { return }
    pendingOutboundActions.removeFirst()
}
```


這位於低階用戶端之外，因為重播策略是特定於應用程式的。聊天訊息、終端機調整大小、終端機輸入和瞬態 UI 切換都可能有不同的重播/合併行為。

## 訂閱所有權

`subscribe(uri)` 傳回伺服器快照以及該資源 URI 的後續事件流。

`unsubscribe(uri)` 是資源範圍的：它將 `unsubscribe` 發送到伺服器並完成該 URI 的所有本地流。它不是每個視圖的取消句柄，並且不維護偵聽器引用計數。

應用程式通常應將協定訂閱集中在一個擁有者（例如應用程式商店或主機管理程式）中，並讓視圖從該擁有者觀察狀態。如果多個獨立元件需要直接訂閱相同 URI，未來的更高等級 API 可以新增引用計數訂閱句柄。

## 交通選擇

`AHPTransport` 是傳輸抽象。預設的 `URLSessionWebSocketTransport` 適用於許多 `wss://` 部署和簡單的用戶端。

對於 iOS/macOS 本地開發、LAN 和 Tailscale 樣式的 `ws://` 目標，`NWConnectionWebSocketTransport` 直接使用 Network.framework。它避免了本地 `ws://` 開發的 `URLSession` ATS 行為，明確執行 WebSocket 升級，並透過 `AHPKeepAliveTransport` 公開 WebSocket ping 支援。





```swift
let transport = NWConnectionWebSocketTransport(
    url: URL(string: "ws://192.168.1.42:8080/ahp")!,
    headers: ["Authorization": "Bearer \(token)"]
)
```


Keepalive 已在 `AHPClientConfig` 上選擇加入。啟用且傳輸符合 `AHPKeepAliveTransport` 時，ping 失敗將被視為傳輸失敗，以便應用程式或 `MultiHostClient` 重新連線策略可以恢復：





```swift
let config = AHPClientConfig(
    keepAlive: .enabled(interval: .seconds(30), timeout: .seconds(5))
)
```


首選來自傳輸的入站 `.text` 或 `.binary` 訊框。入站 `.parsed` 訊框可能會繞過用戶端的原始 JSON 解析路徑，該路徑保留 Apple `NSNumber` Bool/Int 差異。

## 此用戶端的後續步驟

- 增加協定轉錄夾具，其本質與 reducer 夾具測試類似，以驗證跨語言的用戶端/伺服器流。
- 透過 `MultiHostClient`/`AHPClient` 周圍的適配器遷移範例 iOS 應用程式，同時將應用程式政策保留在 `AppStore` 中。