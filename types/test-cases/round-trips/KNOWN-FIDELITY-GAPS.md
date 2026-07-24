# 往返語料庫 — 機制和已知的覆蓋範圍差距

此目錄中的夾具是與語言無關的往返語料庫。每個
夾具的 `input` 是每個用戶端解碼和重新編碼的線路有效負載；的
重新編碼的值必須**完全**匹配中的單一規範形式
`acceptableOutputs[0]`。比較與鍵順序無關，但與值和順序無關
**按鍵存在敏感**：`null` 未標準化為缺席，且缺席也不是
歸一化為 `null`（因此缺少的 `origin` 重新編碼為 `"origin": null` 是
失敗，而不是通過）。 `acceptableOutputs` 必須只有一個條目 — 多個
條目會將觀察到但錯誤的分歧鞏固為「可接受的」。

## A 組 vs B 組

- **A 組**（`"group": "A"`，或缺席）：每個用戶端都同意；全部斷言
  `acceptableOutputs[0]`。
- **B 組** (`"group": "B"`)：已知的型別帶有額外的、未建模的線鍵。
  運行時解碼器用戶端 (Go, Rust, Swift, Kotlin) 解碼為型別結構，
  它會刪除未知的鍵，並斷言刪除的形式
  `acceptableOutputs[0]`。 TypeScript 沒有執行時期解碼器，因此 `JSON.parse` /
  `JSON.stringify` 保留每個密鑰；它斷言保留的形式
  `preservedOutput`。 TypeScript 仍然斷言 - 它永遠不會被跳過。夾具
  017和019是B組病例。

這是真正的型別系統能力差異，而不是天賜的分歧：
運行時用戶端錯誤地「保留」未知密鑰將使其失敗
`acceptableOutputs[0]` 斷言，以及錯誤*丟棄* 的 TypeScript 路徑
他們的 `preservedOutput` 斷言將會失敗。

## 已知的覆蓋範圍差距（語料庫未驗證的內容）

誠實的限制，記錄下來，這樣就不會被誤認為是承保範圍：

- **TypeScript 不驗證產生的-型別正確性。 ** TS 類型已刪除
  在運行時，因此 TS 往返線束會檢查運行時導線行為 + 夾具
  自我一致性—而不是產生的 TS 類型是否正確。錯誤的 TS
  欄位名稱/可選性/巢狀不會在這裡被捕獲；那就是
  編譯器的工作，在使用類型的地方執行（reducers，用戶端程式碼）
  並通過`tsc`。（另外，`SessionStatus` 是 TS 中的封閉 `const enum`，因此
  TYPE 不能表示像 72 這樣的位元集組合或像這樣的未知位元
  2147483720 — 位元集 VALUE 往返由夾具 004/005 覆蓋。）

先前列出的間隙現已**關閉**：Kotlin `JsonRpcMessage` 透過其解碼
真實生成的變體類型（`JsonRpcRequest`/`Notification`/`SuccessResponse`/
`ErrorResponse`) — 裝置 008-011 練習真實的類，而非原始 AST
直通。 `SessionStatus` 現在是一個統一的 32 位元無符號位元集
Rust/Go/Kotlin/Swift (`u32`/`uint32`/`UInt`/`UInt32`)，因此每個用戶端都包含
相同的值範圍 - 在 TS 的 `number` 53 位元安全限制內，無寬度
分歧。