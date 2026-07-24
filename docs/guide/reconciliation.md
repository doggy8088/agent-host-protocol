# 預寫入協調

用戶端樂觀地在本地應用自己的操作，然後當伺服器將它們與來自其他用戶端或伺服器本身的任何並發操作一起回顯時進行協調。這提供了即時 UI 回饋，同時保持伺服器權威一致性。

## 用戶端-側面狀態

每個用戶端維護每個訂閱：

- **`confirmedState`** — 最後完全被伺服器確認的狀態。
- **`pendingActions[]`** — 樂觀地應用，但尚未得到伺服器的回應。
- **`optimisticState`** — `confirmedState`，`pendingActions` 在頂部重播（計算，未儲存）。





```
confirmedState ──► apply pending[0] ──► apply pending[1] ──► ... ──► optimisticState
```


UI 始終呈現 `optimisticState`。使用者會立即看到他們的操作被反映。

## 協調演算法

當用戶端從伺服器接收到 `ActionEnvelope` 時：

1. **自己的動作回顯**（`origin.clientId === myId`並匹配`pendingActions`的頭）：
   - 從待處理中彈出，應用於 `confirmedState`。

2. **外國行動**（不同來源或源自伺服器）：
   - 應用於 `confirmedState`，對剩餘的 `pendingActions` 進行變基。

3. **拒絕的操作**（伺服器與存在的 `rejectionReason` 相呼應）：
   - 從待處理中刪除（恢復樂觀效果）。 `rejectionReason` 可以顯示給使用者。

4. 根據 `confirmedState` + 剩餘的 `pendingActions` 重新計算 `optimisticState`。

## 例子





```
Time  Server                          Client A                        Client B
─────────────────────────────────────────────────────────────────────────────────
 t1                                   dispatch(turnStarted)
                                      pending: [turnStarted]
                                      optimistic: has activeTurn
 t2   receives turnStarted from A
      applies, broadcast seq=10
 t3                                   receives seq=10 (own echo)
                                      pop from pending
                                      confirmed = optimistic
 t4   agent produces delta
      broadcasts seq=11
 t5                                   receives seq=11 (foreign)        receives seq=11
                                      apply to confirmed               apply to confirmed
```


## 為什麼變基很簡單

大多數聊天操作都是**僅附加**：
- 新增回合、附加增量、新增工具呼叫、附加回應部分。

待處理操作仍然完全適用於更新後的已確認狀態，因為它們對獨立資料進行操作 - 用戶端建立的回合仍然存在；它附加的內容是附加的。

罕見的真正衝突（兩個用戶端中止同一回合）透過 **伺服器-wins 語意** 解決 - 伺服器的迴聲是真相的來源。

## 重新連線

如果傳輸連線中斷：





```jsonc
// Client → Server (request)
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "reconnect",
  "params": {
    "channel": "ahp-root://",
    "clientId": "client-1",
    "lastSeenServerSeq": 42,
    "subscriptions": ["ahp-root://", "ahp-session:/<uuid>"]
  }
}
```


伺服器必須在回應中包含所有重播的資料。如果間隙位於重播緩衝區內，則回應包含錯過的動作包絡。如果間隙超出緩衝區，則回應將包含新的快照。在這兩種情況下，用戶端都會相應地重設 `confirmedState` 並清除 `pendingActions`。

協定通知（如 `sessionAdded`/`sessionRemoved`）**不會**重播 - 用戶端應重新取得工作階段清單。

## 後續步驟

- [操作](/guide/actions) — 透過調節流動的操作類型。
- [訂閱](/specification/subscriptions) — 基於 URI 的訂閱如何運作。
- [Lifecycle](/specification/lifecycle) — 連線握手和重新連線。
- [工作階段通道](/specification/session-channel) — 工作階段建立與生命週期。