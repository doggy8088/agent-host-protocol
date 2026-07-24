# AHP 通道遷移插件

一個 [開放插件](https://github.com/nicobailon/open-plugin/blob/main/spec/specification.md)，提供將 AHP 使用者（用戶端、伺服器或函式庫綁定）從前通道協定模型遷移到目前基於通道的模型的技能。

## 包含什麼

|元件|路徑|目的|
|------------|------|---------|
|清單 | `.plugin/plugin.json` |插件元資料（開啟插件規格）|
|技能| `skills/channels-migration/SKILL.md` |驅動重構的代理的逐步遷移指南 |

## 何時使用

當您有針對預通道協定編寫的程式碼庫（TypeScript、Rust、Swift 或任何 AHP 使用者）並希望將其更新為基於通道的協定時，請呼叫此技能。此技能會遍歷每一個破壞性的形狀變化、重新命名、新欄位以及每一步要尋找的模式。