# Swift 範例 — 代理指南

## 概述

此目錄包含代理主機協定 (AHP) 的兩個 Swift 套件：

1. **AgentHostProtocol** — 一個純 Swift 函式庫（無外部相依性），為協定提供自動產生的型別、操作和reducer。面向 iOS 16+、macOS 13+、Swift 5.9+。 Swift 來源位於 `clients/swift/AgentHostProtocol/` 中，但 `Package.swift` 清單位於 **儲存庫根** (`/Package.swift`) 中，以便外部使用者可以透過 `.package(url:)` 取得該清單。 SwiftPM 僅解析遠端 git 儲存庫根目錄下的清單。
2. **AHPApp** — 一個範例 iOS 應用程式（Xcode 專案），演示了具有 WebSocket 傳輸、狀態同步、重新連線和 SwiftUI 聊天 UI 的完整 AHP 用戶端。使用 [dev-tunnels-swift](https://github.com/rebornix/dev-tunnels-swift) （遠端 Swift 套件）進行隧道發現、驗證和中繼連線。

`AgentHostProtocolClient` 函式庫也在每個主機 `AHPClient` 之上提供了一個多主機 `MultiHostClient` actor。單主機使用者可以使用 `MultiHostClient.single(_:)` 取得相同的可觀察性表面（事件流、產生檢查句柄、持久性用戶端 id），而無需考慮註冊表。參見`Sources/AgentHostProtocolClient/Hosts/`。

## 程式碼生成

`AgentHostProtocol/Sources/AgentHostProtocol/Generated/` 中的類型是根據 `types/` 中的 TypeScript 定義**自動產生**的。不要直接編輯這些文件。生成的檔案被提交給原始程式碼管理，因此可以透過 SwiftPM 使用該包，而無需程式碼生成工具鏈。

協定更改後重新生成：





```bash
npm run generate:swift    # runs: tsx scripts/generate.ts --swift
```


產生的檔案：`State`、`Commands`、`Actions`、`Errors`、`Messages`、`Notifications` — 全部後綴為 `.generated.swift`。

CI 驗證提交的產生檔案是否與 `npm run generate:swift` 的輸出匹配，並在漂移時失敗。

## 釋放

Swift 套件透過 SwiftPM 透過針對此儲存庫的 git-tag 解析來使用。 **儲存庫根目錄中的裸露 `vX.Y.Z` 標記保留用於 Swift 版本**，因為 SwiftPM 無法解析像 `swift/v0.2.0` 這樣的路徑前綴標記；請參閱 [`RELEASING.md`](../../RELEASING.md) 了解標籤命名空間的基本原理和完整的發布流程。

摘要，範圍為 Swift：

1. 將 `clients/swift/VERSION` 更新為新的裸 semver 字串。
2. 執行`npm run generate:metadata`並提交重新產生的`clients/swift/release-metadata.json`。
3. 旋轉`clients/swift/CHANGELOG.md` 的`## [Unreleased]` 部分。如果標記版本不存在 `## [X.Y.Z]` 標題，則發佈工作流程將會失敗。
4. 合併到`main`。
5. 標籤：`git tag v0.X.Y && git push origin v0.X.Y`（注意：裸語意版本，無前綴）。
6. `.github/workflows/publish-swift.yml` 根據 `clients/swift/VERSION` 驗證標籤，重新執行 Swift 生成器偏差檢查，在 macOS 上建置和測試 Swift 包，然後發布 GitHub 版本。

## AgentHostProtocol 函式庫

### 透過 Swift 套件管理器安裝

將其加入為 `Package.swift` 中的依賴項：





```swift
.package(url: "https://github.com/microsoft/agent-host-protocol.git", from: "0.1.0")
```


....並引用您的目標中的 `AgentHostProtocol` 產品：





```swift
.target(
    name: "MyApp",
    dependencies: [
        .product(name: "AgentHostProtocol", package: "agent-host-protocol"),
    ]
),
```


在 Xcode 中：**檔案 ▸ 新增包依賴項...** 並輸入 `https://github.com/microsoft/agent-host-protocol`。

### 關鍵類型

- **`RootState`** — 頂層狀態：代理列表 + 活動工作階段。
- **`SessionState`** — 每工作階段對話狀態（回合、工具呼叫、生命週期）。
- **`AgentInfo` / `SessionModelInfo`** — 代理功能與可用模型。
- **`ActionEnvelope`** — 伺服器-使用 `serverSeq`（全域單調計數器）和資源 URI 傳送操作。
- **指令參數/結果** — `InitializeParams`、`ReconnectParams`、`CreateSessionParams`、`SubscribeParams` 等。

### reducer 模式

受到 Swift 可組合架構 (TCA) 的啟發。關鍵抽象：

- **`Reducer` 協定** — 純函式：`reduce(into state: inout State, action: Action)`。
- **`AHPRootReducer`** — 處理根級操作（代理程式已變更、工作階段新增/刪除）。
- **`AHPSessionReducer`** — 處理每個工作階段操作（增量、工具呼叫、回合生命週期）。
- **可組合** 透過 `CombinedReducer` 和 `AnyReducer` 型別擦除。

reducer是純函式 - 在任何先前的狀態快照上按 `serverSeq` 順序重播操作會產生相同的結果。這對於重新連線協定至關重要。

## AHP 應用程式

### 建築學





```
AHPAppMain (@main, scenePhase monitoring)
  └─ AppStore (@Observable, @MainActor)
       ├─ AHPConnection (actor — WebSocket JSON-RPC transport)
       ├─ RootState + [SessionState] (protocol state, mutated by reducers)
       ├─ ServerStorage (persisted server configs)
       └─ Views (SwiftUI)
```


### 應用程式商店

中央狀態容器。所有突變流經 reducer 函式 (`applySnapshot`、`handleAction`)。主要職責：

- **連結生命週期** — `connect()`、`disconnect()`、`reconnect()`、`reconnectIfNeeded()`
- **工作階段管理** — `createSession()`、`disposeSession()`、`selectSession()`
- **狀態同步** — 從連線接收 `ActionEnvelope`，透過reducer應用
- **重新連線** — 追蹤 `lastSeenServerSeq` 和訂閱的 URI；恢復時發送 `reconnect` 命令。伺服器以 **重播**（錯過的操作）或 **快照**（新鮮的狀態）進行回應。

### AHP 連線

`actor` 包裝 `URLSessionWebSocketTask`，用於基於 WebSocket 的執行緒安全 JSON-RPC：

- 透過順序訊息 ID 和 `CheckedContinuation` 進行請求/回應關聯
- `onAction` 回呼將 `ActionEnvelope` 傳送到 `@MainActor` 上的 AppStore
- `onUnexpectedDisconnect` 當接收循環因錯誤而中斷時觸發
- `canReconnect` — 當先前建立的連線 `serverSeq` + 訂閱時為 true

### 重新連結流程

當手機從後台喚醒或 WebSocket 意外斷開時：

1. `scenePhase → .active` 觸發 `reconnectIfNeeded()`（或 `onUnexpectedDisconnect`）
2. 用戶端發送 `reconnect(clientId, lastSeenServerSeq, subscriptions)` 至伺服器
3. 伺服器以 **Replay**（錯過的 `ActionEnvelope` 陣列）或 **Snapshot**（如果間隙太大，則每個訂閱的 URI 的完整狀態）回應
4. `AppStore` 透過reducer應用結果，使本地狀態保持最新
5. 浮動進度條在活動聊天檢視中顯示“正在重新連線...”

`serverSeq` 是跨所有工作階段的**全域**單調計數器。伺服器過濾器僅重播用戶端的訂閱 URI。

### 使用者介面結構

- **ContentView** — NavigationStack 根，路由到側邊欄或聊天。
- **SidebarView** — 工作階段列表，帶有 `.searchable()`（iOS 26 液體玻璃底欄），按時間或工作目錄分組。 `NewSessionButton` 開啟 `AgentPicker` 模態。
- **ChatView** — 基於 VStack 的訊息列表，具有底部錨定滾動、滾動到底部按鈕（iOS 26 上的玻璃效果）、重新連線進度欄和統一輸入欄（發送/停止）。
- **AgentPicker** — 帶有用於代理、模型和工作目錄文字欄位的 `Picker` 控制項的表單。
- **ResponsePartView** — 渲染 markdown（透過 `AttributedString`）、工具呼叫卡片（點選→帶有輸入/輸出的詳細模式）、推理區塊和內容參考。

### iOS 26 適配

該應用程式使用 `#available(iOS 26.0, *)` 檢查：
- 捲動到底部按鈕上的 `.glassEffect()`
- `.searchable()` 與 `.toolbar` 展示位置 + `DefaultToolbarItem(kind: .search, placement: .bottomBar)`
- `.bottomBar` 工具列中新的工作階段按鈕
- 在舊版 iOS 上回退到 `.ultraThinMaterial` 和 `.navigationBarDrawer`

### 測試

- **AHPAppTests** — 重新連線狀態測試：快照復原、重播排序、空白重播、多重資源快照、即時操作應用程式。
- **AgentHostProtocol 測試** — reducer 單元測試（根 ​​reducer、工作階段 reducer、本機 reducer）。

### 建置並運行

在 Xcode 中開啟 `AHPApp/AHPApp.xcodeproj`。此專案引用 `AgentHostProtocol` 作為本地 Swift 包，其清單位於 **儲存庫根**（相對於 Xcode 專案的 `../../..`），並將 `DevTunnelsClient` 作為來自 [rebornix/dev-tunnels-swift](https://github.com/rebornix/dev-tunnels-swift) 的遠端 Swift 包。程式碼簽章需要 `Signing.local.xcconfig` 檔案（請參閱 `Config/Signing.local.xcconfig.example`）。

**開發隧道整合：** `TunnelListView.swift` 直接使用 `DevTunnelsClient` 庫 — `TunnelManagementClient` 用於隧道列表/詳細資訊，`DeviceCodeAuth` 用於 GitHub OAuth，`TunnelConnection` 用於中繼 URI 和連線令牌的輔助程式。所有呼叫都是 `async` — 不需要填滿層或 Rust FFI。

對於開發，`AHPApp` 使用本機 `NWConnection` WebSocket 傳輸而不是 `URLSessionWebSocketTask`，從而避免對直接 `ws://` 開發目標（例如本地 LAN 位址或 Tailscale tailnet IP）執行 `URLSession` ATS。公共或網路公開的部署仍應首選 `wss://`。