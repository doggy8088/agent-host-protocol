# 連線到多個主機

代理主機協定描述單一_client -> host_連線。真正的產品通常需要同時與 **兩個或多個主機通訊**：本地工作階段伺服器和隧道連線的遠端主機、個人主機和隊友的主機、桌面側邊欄中的多個專案主機等等。協定本身並沒有說明如何連線它；這是一個用戶端 SDK問題。

本頁涵蓋了 Swift SDK 的多主機層。

## 為什麼需要內建抽象？

如果沒有一個，每個消費者最終都會寫同樣的東西：

- N個獨立的`AHPClient`實例及其生命週期
- N 個傳輸加上帶有退避和取消功能的重新連線主管
- 一個註冊表，用於為 UX 鍵入每個主機元資料（標籤、URL、連線狀態、最後一個錯誤、代理、`serverSeq`、訂閱、預設目錄）
- 入站事件的扇入，標記有產生事件的主機
- 通道 URI 的每個主機範圍（主機 A 上的 `ahp-session:/s1`！= 主機 B 上的 `ahp-session:/s1`）
- 每個主機保留 `clientId`，以便重新連線身分可以在重新啟動後繼續存在
- 每個主機根狀態鏡像加上工作階段摘要緩存，因此側邊欄和收件匣不會降級為“訂閱所有內容”

Swift SDK 提供了一個包含所有這些的 `MultiHostClient` actor。 **單主機 = N=1 多主機**，因此相同的 API 可以以任何方式運作。

## 每主機 UX 介面

每個註冊的主機均顯示為 `HostHandle` 快照（`Sendable` 值型別）：

|領域|筆記|
|---|---|
| `id`，`label` |穩定的識別碼和人類可讀的顯示名稱 |
| `state` | `disconnected`、`connecting`、`connected`、`reconnecting(attempt:)`、`failed(reason:)` |
| `lastError`，`lastConnectedAt` |狀態列/調試面板中的表面 |
| `protocolVersion`，`defaultDirectory`，`completionTriggerCharacters` |來自 `InitializeResult` |
| `clientId` |在 `initialize`/`reconnect` | 上實際發送的 ID
| `serverSeq` |此主機的最高 `serverSeq` |
| `agents`，`activeSessions`，`terminals` |從主機的 `RootState` | 鏡像
| `subscriptions` |主管將透過重新連結（重新）訂閱的 URI |
| `sessionSummaries` |快取的 `[SessionSummary]` 透過 `listSessions` 以及與工作階段相關的通知保持最新 |
| `generation` |每次（重新）連線時都會發生碰撞；用於使過時的用戶端句柄失效 |

若要觀察更改，請偵聽 `MultiHostClient.hostEvents()` 的連線-狀態事件，或使用下面的可觀察流直接綁定到 SwiftUI `@Observable` 模型。

## 單主機





```swift
import AgentHostProtocol
import AgentHostProtocolClient

let config = HostConfig(id: "local", label: "Local sessions server") { _ in
    URLSessionWebSocketTransport(url: URL(string: "ws://localhost:12345")!)
}
let (multi, handle) = try await MultiHostClient.single(config)
print("connected to \(handle.label): \(handle.state)")
```


## 多主機





```swift
let multi = MultiHostClient(clientIdStore: FileClientIdStore(directory: appSupportURL))
_ = try await multi.add(HostConfig(id: "local", label: "Local", transportFactory: openLocal))
_ = try await multi.add(HostConfig(id: "remote", label: "Remote", transportFactory: openRemote))

for hosted in await multi.aggregatedSessions() {
    print("[\(hosted.hostLabel)] \(hosted.summary.title)")
}
```


`MultiHostClient` 是一個 `actor`，並且在主執行緒之外運行。將其包裝在您的 `@MainActor` `@Observable` 儲存中以綁定到 SwiftUI。

## 可靠的每通道流

`events()` **設計有損** (`.bufferingNewest(1024)`)，僅供參考使用。 reducer-關鍵操作信封必須透過無限的每通道流來消耗 - 運行時擁有的和倖存的重新連線（重播的信封也被扇入）：





```swift
guard let stream = await multi.events(host: "local", uri: RootResourceURI) else {
    // host isn't registered — handle as appropriate for your app
    return
}
let snapshot = try await multi.subscribe(host: "local", uri: RootResourceURI)
for await event in stream {
    if case .action(let envelope) = event {
        await mirror.apply(host: "local", envelope: envelope)
    }
}
```


`MultiHostStateMirror` 提供由 `HostedResourceKey { hostId; uri }` 鍵控的主機感知 reducer 外觀，用於通道 URI 跨主機衝突的常見情況。從 `events(host:uri:)` 饋送它，而不是從有損的 `events()` 饋送它。

## 可觀察的主機流

對於 SwiftUI / `@Observable` 使用者，`MultiHostClient` 公開派生流，這些流立即產生當前值並在更改時重新生成。兩者都使用 `.bufferingNewest(1)`，因為只有最新快照對 UI 使用者來說才重要：





```swift
guard let snapshots = await multi.hostSnapshots(host: "local") else { return }
for await snap in snapshots {
    // bind snap.state, snap.lastError, snap.serverSeq, ...
}

guard let summaries = await multi.sessionSummaries(host: "local") else { return }
for await list in summaries {
    // bind sidebar list
}
```


## 重新連線、產生和所有權

每個主機都在自己的內部任務（`HostRuntime`）中運行，該任務擁有當前的 `AHPClient`，根據配置的 `ReconnectPolicy` 重試，並在重新連線時重新訂閱已知的 URI。

每次成功的（重新）連線都會增加每個主機**代**計數器。您從上一個連線獲得的任何 `HostClientHandle` 都拒絕在新連線上分派並拋出 `HostError.hostReconnected` - 在這種情況下請求新的句柄。這可以防止出現微妙的錯誤，即重新連線時持有的句柄會默默地寫入不同的連線。

`MultiHostClient.reconnect(_:)` 重新連線單一主機； `reconnectAllUnavailable()` 遍歷每個主機並重新連線不在 `.connected` 或 `.connecting` 中的主機 - 對於 iOS 場景階段模式很方便：





```swift
.onChange(of: scenePhase) { _, phase in
    if phase == .active {
        Task { await multi.reconnectAllUnavailable() }
    }
}
```


## 每個主機穩定的 `clientId`

該協定使用 `clientId` 來跨重新連線識別邏輯用戶端。每個主機都有自己的 `clientId`，由 SDK 產生並儲存在可插入的 `ClientIdStore` 中。 SDK 提供了兩種實作：

- `InMemoryClientIdStore` — 預設；工作階段-穩定，但重啟後遺失。非常適合測試和臨時 CLI。
- `FileClientIdStore(directory:)` — 檔案系統支援；原子寫入、POSIX 上的僅限擁有者權限、任意 `HostId` 字串的百分比編碼檔案名稱。跨平台；推薦用於命令列和桌面工具。

想要更高安全性的 iOS 應用程式應該將 Keychain 包裝在 `ClientIdStore` （Security.framework 的幾行）中。 SDK 未提供鑰匙串實作，以使 `AgentHostProtocolClient` 擺脫對跨平台建置的 `Security.framework` 依賴。

## 任務取消

`AHPClient.request`和`HostClientHandle.request`觀察`Task.isCancelled`。取消周圍的 `Task` 會拋出 `CancellationError()`；本地待處理條目將被刪除，因此遲到的伺服器回應將被無害地丟棄。取消僅取消本地等待 - 伺服器端執行不會中止（這是一個更高層級的問題）。

對於預先輸入/Go抖動流程很有用，您以前必須編寫請求鍵簿記以忽略過時的結果。

## 擴展 RPC 的逃生艙口

對於參數或結果類型無法滿足類型化 `request<P, R>` 的 `Sendable` 約束的 RPC（例如，當 `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` 使合成的 `Codable` 一致性繼承 `@MainActor` 時），請使用原始位元組變體 `AHPClient.requestRaw(method:paramsData:) -> Data` / `HostClientHandle.requestRaw`。自己編碼和解碼 JSON。

## 選擇單主機還是多主機

你不選擇。單主機使用者使用 `MultiHostClient.single(...)` 並且永遠不會看到註冊表概念。除了單一管理程式任務之外，SDK 不會對每主機施加任何開銷，並且無需學習單獨的單主機 API。

請參閱 `clients/swift/AgentHostProtocol/Sources/AgentHostProtocolClient/Hosts/` 和 `Tests/AgentHostProtocolClientTests/` 以了解完整內容，以及 `MultiHostExample.runDemo()` 以了解可運行的演示。