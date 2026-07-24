---
name: groom-backlog
description: 審核近期已關閉的 PR，確認其承諾的後續工作是否已有追蹤議題（建立新議題或關聯既有議題）；將每一個未關閉議題分類為現在可實作／不再相關／等待依賴，並依分類關閉或註解。最後列出並實作可執行清單。處理前先對照本儲存庫目前狀態（`types/`、產生的用戶端鏡像、相容性固定件、已發佈版本工件）確認每個後續與議題。當收到整批排程、未追蹤後續、或要清理 issue 候選時請使用。
---

# 將積壓的工作分類：文件跟進、對未解決的問題進行分類、實作準備好的問題

`microsoft/agent-host-protocol` (AHP) 是規範線規格加上五個針對它產生並手動維護的用戶端 (Rust、Kotlin、Swift、TypeScript、Go)。它累積了兩種潛在的工作，如果無人照顧，它們就會與現實脫節：

- **承諾但未追蹤的後續工作。 ** 合併的 PR 經常推遲工作 — “超出範圍”部分、“未來 PR 中的後續工作”註釋、推遲的審核執行緒、`types/` 中留下的 `TODO` /“已知…空白”、手寫表面未更新以匹配規格更改的用戶端。其中一些成為跟蹤問題；另一些則成為跟蹤問題。有些人默默地不這樣做。
- **陳舊或受阻的開放問題。 ** 幾週前提交的問題可能已經完成，可能已被後來的規格更改所廢棄，或者可能正在等待尚未解決的依賴項（版本控制決策、未解決的設計問題或 `docs/proposals/` 下的開放提案）。

此技能為**積壓整理過程**，分為三個階段：

1. **審計最近結束了 PR**，並確保他們提出的每一項仍然相關的後續行動都存在跟蹤問題 - 提交新的後續行動，或將 PR 連結到現有的後續行動。
2. **將每個未解決的問題**分類為*現在可實作*、*不再相關*或*因依賴項而被阻止* - 通過解釋關閉過時的問題，用特定的阻擋註釋被阻止的問題，並將準備好的問題列入候選名單。
3. **按順序確定優先順序並實作**已準備好的問題，將密切相關的問題分組到有意義的單一 PR 中。

## 心態－慢慢來，徹底

這是該技能中最重要的指令。 **不要急，也不要急於下結論。 ** 分類首先是分析任務，其次是編輯任務。打開重複的問題、關閉仍然需要的問題、註釋錯誤的阻擋或針對陳舊的描述進行實作，這些都需要花費昂貴的成本來解決，並會削弱對積壓的信任。淺薄的通過比什麼都不做更糟糕。

- **在您開啟、關閉、評論或實作任何內容之前，花盡可能多的時間**真正了解每個 PR、每個問題以及規格的當前狀態、用戶端和文件。閱讀實際的 PR 差異、審核執行緒、問題主體、它們指向的 `types/`、生成的鏡像和一致性夾具 - 不要僅從標題和主題推斷。
- **根據當前現實驗證每個候選人。 ** 在提交後續行動之前：是否仍然需要，或者後來的 PR 是否已經做到了，或者後續的規格更改是否使其毫無意義？在關閉問題之前：您*確定*它已經過時了，還是只是看起來過時了？在稱某個問題「準備就緒」之前：是否真的沒有隱藏的依賴關係（版本控制策略決策、未解決的設計問題、開放性提案）？如果您不能自信地回答，請繼續調查。- **區分真正的工作和噪音。 ** 並非 PR 中的每個「超出範圍」的行都值得提出問題，也不是每個舊問題都已消失。將「這確實還需要做」與「這已經處理了」或「這是推測性的，從來不重要」分開。
- **當正確答案不明確時，停下來詢問**而不是猜測 - 特別是在批量關閉問題之前或開始多 PR 實作推送之前。錯誤的關閉或浪費的 PR 代價高昂。
- **優先考慮正確性而不是小的差異。 ** 不要扭曲實作以最小化差異，並且不要新增遷移墊片或分階段推出，除非[版本控制策略](../../docs/specification/versioning.md)或使用者要求它們。 *正確*解決每個問題。但 AHP 是與現實世界的實作者**發布的、版本控制的線路合約** - 破壞性協定更改由 `docs/specification/versioning.md` 和 `types/version/` 中的版本註冊表控制，而不是隨意進行的。當修復會破壞線路表面時，請將版本控制策略視為硬約束並公開呼叫，而不是默默地傳送它。

當調查範圍廣泛時，依靠 `explore` 代理來並行研究此儲存庫中的許多 PR/問題，並且在得出任何結論之前，請隨意花幾遍閱讀。

## 先熟悉一下自己

在接觸待辦事項之前，請像在此處進行任何重大更改之前一樣，讓自己融入系統：

- 閱讀儲存庫自己的原始程式碼和文件：`types/` 下的規範類型（事實來源）、產生的 `schema/`、`docs/specification/` 和 `docs/guide/`、`AGENTS.md`、`CONTRIBUTING.md` 和 `RELEASING.md` 中的散文。更改協定類型的編輯規則位於 [`.github/instructions/general-instructions.instructions.md`](../../.github/instructions/general-instructions.instructions.md) 中 - 請遵循它們。
- 了解 `types/` 更改如何向外擴散：每個協定更改都會重新生成 `schema/` 和每個用戶端的 `**/generated/**` 鏡像，可能需要手寫的用戶端更新，必須保持 `types/test-cases/` 下的一致性夾具同步，並為 **每個日誌更改受影響的工件版本表面位於 `types/version/registry.ts` (`PROTOCOL_VERSION`, `SUPPORTED_PROTOCOL_VERSIONS`)。
- 刷新您對協定的公共表面及其**已發布的版本化工件**的理解 - crate、npm 包、Maven/JVM 庫、Swift 包和 Go 模組，全部從 `types/` 生成。AHP 是外部用戶端實作和外部產品使用的合同，因此「此後續行動仍然相關嗎？」是根據當前的規格、此儲存庫中生成和手動維護的用戶端以及協定已經保證的內容來回答的，而不是針對任何單一實作。

您不需要預先記住所有內容，但後續審核和問題分類僅取決於您對系統目前狀態的理解。首先投資於此。

## 驗證什麼

您針對這個儲存庫進行分類、歸檔和實作 — `microsoft/agent-host-protocol`。這是一個**公共**儲存庫；將整個通行證保留在其中，並且不要引用、閱讀或依賴任何非公共儲存庫或程式碼。因此，「驗證上下文」是指此儲存庫的目前公共狀態以及協定已發布的內容：

- **規範的規格及其產生的輸出** — `types/`、產生的 `schema/` 以及每個用戶端的 `**/generated/**` 鏡像。
- **`clients/<lang>/` 下的手工維護的用戶端表面**，以及 `types/test-cases/` 中的一致性夾具。
- `docs/specification/` 和 `docs/guide/` 中的 **散文**，以及 `docs/proposals/` 中的飛行設計說明。
- `types/version/registry.ts` 中的 **版本表面** 以及從中產生的 **已發佈的版本化工件**（crate、npm 套件、Maven/JVM 庫、Swift 套件和 Go 模組）。
- **儲存庫自己的歷史** - 合併的 PR 和開啟/關閉的問題本身。

AHP 是外部用戶端實作和外部產品使用的合約，但這些合約位於超出此處範圍的其他儲存庫中。法官「這仍然有意義嗎？」來自 *this* 儲存庫中的規格和用戶端以及協定已經保證的內容。如果問題的真正解決方案顯然屬於某個外部實作，**請為使用者註明**，而不是Go閱讀或操作另一個儲存庫。

始終根據此儲存庫預設分支的 **當前狀態加上其 **最近活動的開啟 PR** 來判斷相關性 - 而不是本地克隆碰巧簽出的任何內容。在判斷之前取得/刷新，並使用 `gh` 權威地讀取遠端。 **注意：** 此儲存庫位於 `microsoft` 組織中，其中 `gh` 的 GraphQL 支援的命令（`gh issue list`、`gh pr list`）可能會間歇性失敗並出現憑證錯誤；當發生這種情況時，透過 `gh api repos/microsoft/agent-host-protocol/...` 回退到 REST 端點（請參閱附錄）。

## 此儲存庫如何追蹤問題和後續行動

讓自己融入當地慣例，以便您的問題符合公司風格，並且您的分類會使用正確的訊號：

- **標籤。 **此儲存庫**沒有**有專用的 `follow-up` 標籤 - 不要假設存在這樣的標籤。應用維護者會使用的標籤：型別/區域標籤，例如 `enhancement`、`documentation`、`bug`、`debt`、`dependencies` 和語言標籤，例如 `rust`，以及用於關閉的處置標籤 `wontfix`、`duplicate` 和 `invalid`。 `gh label list -R microsoft/agent-host-protocol` 具有權威性；如果團隊可以從 `follow-up` 標籤中受益，建議建立一個標籤，而不是默默地發明它。
- **問題模板。 ** 該儲存庫目前沒有 `.github/ISSUE_TEMPLATE/` 表單，因此新問題是自由格式的 - 這意味著後續問題需要具有自己的結構和完整性。- **後續問題的品質標準。 ** 一個好的後續問題是獨立的：一個 **上下文** 部分，連結原始 PR *和* 具體審查執行緒 * 和 * 有問題的 `types/`/用戶端代碼或規格散文、**問題** 陳述、具體 **建議的修復**、** 6/c/62修復涉及的 CHANGELOGs），一個 **測試/一致性** 列表（它需要的 `types/test-cases/` 夾具或用戶端測試），以及一個 **超出範圍** 部分。範圍明確的現有問題是模型；讀取一些目前開放的內容以匹配房屋深度（`gh issue list` / `gh issue view`）。- **其中 PR 指出未來的工作。 ** 看 PR **正文**（`## What` / `## Why` / `## How` 註釋，「超出範圍」、「未來的工作」、「後續」、「延遲」），在 **審閱執行緒**（審閱者要求某些內容，而作者推遲它），並在 **PR 手寫的代碼中、{c70** （`types/` 24} 的註釋。用戶端原始碼或文件中的「已知...間隙」、「從 PR #... 延遲」）。相反，承諾的工作不會出現任何問題，而這正是第一階段所尋求的。
- **`types/` 是規範的線路合約。 ** 協定表面的更改絕不是本地的：它會重新產生 `schema/` 和每個用戶端的 `**/generated/**` 鏡像，可能需要匹配的手寫用戶端更改，必須保持 `types/test-cases/` 中的一致性夾具對齊，並在每個受影響的工件的範圍中放置一個 `docs/.changes` 片段。 `AGENTS.md` 和 [`.github/instructions/general-instructions.instructions.md`](../../.github/instructions/general-instructions.instructions.md) 是何時以及如何觸摸那棵樹的權威；[版本控制策略](../../docs/specification/versioning.md) 管理任何移動 `PROTOCOL_VERSION` 的內容。跟著他們。

## 分類通行證

將以下視為作品的形狀，而不是死板的劇本。根據您發現的內容調整順序和深度；目標是自信、易於理解的積壓工作以及清晰的報告——**不是**機械的步驟執行。

### 第 1 階段 — 審核最近結束 PR，以尋找未追蹤的後續行動

1. **確定視窗範圍。 ** 收集最近關閉（合併）的 PR。如果使用者給了一個視窗，請使用它；否則預設為合理的近期範圍（例如自上次分類通過或合併 PR 的最後幾週以來）並說出您的選擇。 Dependabot / pure-dependency PR 很少產生後續內容 - 瀏覽它們，不要糾纏。
2. **提取承諾。 ** 對於每個 PR，閱讀正文、審閱執行緒和它落地的程式碼，並列出它明確 **推遲到未來的每一項工作** —“超出範圍”、“後續”、“稍後的 PR”、“已知差距”、它引入的 `TODO`/`FIXME`、作者已推遲的閱審者請求、已跳過鏡像
3. **根據當前現實驗證每個候選人。 ** 在提交任何內容之前，請確認作品*仍然*真實且描述正確：- **後來的PR**已經做到了嗎？（那麼就沒有什麼可歸檔的－在報告中註明。）
   - **後續的規格更改**是否使其毫無意義或改變了其形狀？重新描述或相應刪除。
   - 它指向的 `types/`/用戶端程式碼或文件是否仍然存在並且仍然是正確的位置？
4. **檢查現有問題。 ** 搜尋相同工作的開放 ** 和 ** 已關閉問題。如果存在匹配的 **open** 問題，**將 PR 連結到它**（交叉引用 PR 和相關執行緒/程式碼的評論），而不是打開副本。如果匹配的問題已經**結束**，則後續工作滿意 - 不要重新提交。
5.**歸檔差距。 ** 對於每個仍然相關、未追蹤的後續問題，請在上面的品質欄中開啟一個新問題：上下文（連結到 PR、審核執行緒和程式碼/規格）、問題、建議的修復、受影響的工件、測試/一致性、超出範圍。使用維護者將套用的區域標籤對其進行標記（例如 `enhancement`、`documentation`、`bug`、`rust`）。交叉連結 PR。

### 第 2 階段 — 將每個未解決的問題分類

1. **拉出完整的開放列表**並深入閱讀每個問題 - 其正文、連結以及 `types/`/用戶端代碼的當前狀態、架構、文件以及它引用的任何 `docs/proposals/` 討論。 **分類前先進行驗證。 **切勿憑直覺關閉或註記。
2. **將每個問題準確分類到一個桶子：**
   - **現在可實作** - 仍然相關，正確描述，並且**沒有**未解決的依賴項或外部阻擋。將其列入第三階段的候選名單。
   - **不再相關/必要** — 已被實作、取代、被後來的規格更改所廢棄，或不再有意義的推測性工作。 **用註釋關閉它**，解釋*確切的原因*（連結解決或使其無效的 PR/commit/change）並應用合適的處置標籤 (`wontfix` / `duplicate` / `invalid`)。未完成時使用“未計劃”關閉原因。- **因依賴項/外部因素而受阻** — 仍然相關，但在其他事情發生之前無法繼續（版本控制策略決策、未解決的設計問題或開放的 `docs/proposals/` 討論、先決條件規格更改）。 **將其保持打開狀態**並新增一條註釋，命名*特定*阻擋，為什麼它必須首先解決，以及（如果可能）指向此儲存庫中要觀看的問題/PR/提案的連結。
3. **明確且可審計。 ** 每個關閉和每個阻止註釋都應該獨立：未來的讀者應該理解該呼叫而無需重新派生它。如果分類確實不明確，請向使用者展示它而不是猜測。

### 第 3 階段 — 確定優先順序並實作已準備好的問題

1. **依重要性和緊迫性對「立即實作」候選清單進行優先排序**。安全性和規格-正確性項目領先；然後是影響消費者的一致性差距和行為錯誤（例如與 `types/` 不同的用戶端鏡像或 reducer）；然後是增強功能和文件。狀態排序與推理。
2. **叢集** 密切相關的問題可以在單一 PR 中一起實作和審查；將不相關的工作放在單獨的、有重點的 PR 中（根據 `CONTRIBUTING.md`）。
3. **依優先順序實作。 ** 對於每個問題（或嚴格的叢集）：處理重點分支，進行更改，並在線路合約移動時保持整個鏈同步 - 編輯 `types/`，運行 `npm run generate`，以便 `schema/` 和每個用戶端的 `**/generated/**` 鏡像重新生成，更新任何手寫的用戶端的 `AGENTS.md` 鏡像`docs/.changes` 片段（根據 `AGENTS.md`）。**使用儲存庫自己的建置/lint/測試閘進行驗證**（請參閱附錄）。在建置並通過之前不要考慮更改已完成。使用 `Closes #N` 開啟 PR（列出叢集中的每個問題）。
   - 如果使用者在採取行動之前要求您確認（例如「先與我聯絡」、「暫時不要更改任何內容」），請提供審核結果、分類分類和建議的實作順序，並在開啟/關閉問題或編寫程式碼之前**等待批准**。

### 報告

產生清晰、誠實的摘要，內容包括：

- **提交/連結的後續行動** - 開啟的新問題（帶連結），連結到現有問題的PR，以及您故意「未」歸檔（已完成/過時）的後續行動及其原因。
- **分類結果** — 三個部分：您關閉的內容和原因、您註釋為被阻止的內容和內容，以及準備好的候選名單。
- **實作** — 您實作了什麼、PR，以及每個問題都關閉；加上下次準備好的清單上剩餘的內容。
- **屬於其他專案** — 真正修復位於此儲存庫之外的任何內容（在外部用戶端實作或消費產品中）。準確地描述每個內容並將其傳回給使用者 - 不要自己Go閱讀或操作另一個儲存庫。
- **任何值得注意或不確定的事情**需要使用者註意或做出決定（特別是在版本控制政策下需要 `PROTOCOL_VERSION` 提升的任何事情）。

如果使用者想要持久的工件，可以將報告寫入儲存庫的 gitignored `.local/` 資料夾；否則將其呈現在對話中。

## 護欄

- **在更改積壓工作之前進行驗證。 ** 在確認針對目前 `types/`、產生的鏡像、架構、文件和一致性夾具的呼叫之前，請勿開啟、關閉或重新標記問題。錯誤的結束比陳舊的問題更糟。
- **永遠不要打開重複的問題。 **總是先搜尋開啟的*和*已關閉的問題；喜歡將 PR 連結到現有問題，而不是提交新問題。
- **搭配房屋風格。 ** 新問題符合上述品質標準，並附有維修人員將應用的標籤；不要發明標籤（沒有`follow-up`標籤）－如果有保證的話建議一個。已關閉的問題會獲得解釋性評論和處置標籤。
- **留在這個儲存庫中。 **這是一個公共儲存庫；將整個通行證保留在 `microsoft/agent-host-protocol` 內，並且不要引用、讀取或對任何其他（非公開）儲存庫進行操作。如果問題的解決方案屬於其他地方，請向使用者描述它，而不是採取行動。
- **在高後果批次之前暫停。 ** 當一次傳遞將批量關閉許多問題或啟動多個 PR 實作推送，並且使用者沒有明確表示「就這樣做」時，請先提出計劃並獲得批准。
- **Wire 合約作為一個單元移動。 ** 當變更觸及 `types/` 時，重新產生的 `schema/` + 用戶端鏡像、一致性夾具、文件和作用域 `docs/.changes` 片段一起移動 - 切勿手動編輯 `**/generated/**` 檔案。破壞性協定變更由[版本控制策略](../../docs/specification/versioning.md)控制；不要在不尊重的情況下發貨。
- **在版本控制策略內，正確性獲勝。 ** 不要縮小正確的實作以保持較小的差異，並且不要新增遷移/棄用/分階段推出，除非版本控制策略或使用者要求它們。- **在聲明完成之前進行驗證。 ** 執行儲存庫的建置/lint/測試並解決您實作的每個變更的任何後果。

## 附錄－基礎事實與命令

這些是起點，而不是整個方法 - 根據儲存庫當前的狀態（`AGENTS.md`、`CONTRIBUTING.md`、`RELEASING.md`、`gh label list`）驗證它們，如果與此處的任何內容不同意，則為權威。對於下面的每個 `gh issue`/`gh pr` 命令，如果 GraphQL 支援的表單在此 `microsoft`-org 儲存庫中傳回憑證錯誤，請改用 REST `gh api repos/microsoft/agent-host-protocol/...` 表單。

**調查最近結束了PR並閱讀他們的承諾：**





```sh
# Recently merged PRs (adjust --limit / filter the window you chose):
gh pr list -R microsoft/agent-host-protocol --state merged --limit 50 \
  --json number,title,mergedAt,url --jq '.[] | "\(.number)\t\(.mergedAt)\t\(.title)"'
# REST fallback if the above errors:
gh api "repos/microsoft/agent-host-protocol/pulls?state=closed&per_page=50" \
  --jq '.[] | select(.merged_at) | "\(.number)\t\(.merged_at)\t\(.title)"'

# A PR's body, the issues it already closes, and its review threads:
gh pr view <n> -R microsoft/agent-host-protocol --json title,body,url,closingIssuesReferences
gh pr view <n> -R microsoft/agent-host-protocol --comments
gh api repos/microsoft/agent-host-protocol/pulls/<n>/comments --jq '.[] | {path, line, body}'

# Deferred markers left in the code (run in the working tree):
grep -rniE 'TODO|FIXME|follow-up|known .* gap|deferred from' types/ clients/ docs/
```


**在歸檔前搜尋現有問題（開啟*和*關閉），然後歸檔或連結：**





```sh
gh issue list -R microsoft/agent-host-protocol --state all --search "<keywords>" \
  --json number,title,state --jq '.[] | "\(.number)\t\(.state)\t\(.title)"'
# REST fallback:
gh api "repos/microsoft/agent-host-protocol/issues?state=all&per_page=100" \
  --jq '.[] | "\(.number)\t\(.state)\t\(.title)"'

# File a new follow-up issue (match the quality bar in the body; pick real labels):
gh issue create -R microsoft/agent-host-protocol \
  --title "<area>: <concise follow-up>" --body-file <path> --label enhancement

# Or link a PR to an existing open issue instead of duplicating:
gh issue comment <n> -R microsoft/agent-host-protocol \
  --body "Follow-up tracked here was deferred from #<pr> (<thread/code link>)."
```


**將未解決的問題分類：**





```sh
# Full open list with labels and recency:
gh issue list -R microsoft/agent-host-protocol --state open --limit 100 \
  --json number,title,labels,updatedAt \
  --jq '.[] | "\(.number)\t\(.updatedAt)\t[\(.labels|map(.name)|join(","))]\t\(.title)"'

gh issue view <n> -R microsoft/agent-host-protocol    # read one in full

# No longer relevant — close with an explanation + disposition label:
gh issue close <n> -R microsoft/agent-host-protocol --reason "not planned" \
  --comment "Closing: <why it's obsolete, with link to the PR/change that resolved or invalidated it>."
gh issue edit <n> -R microsoft/agent-host-protocol --add-label wontfix   # or duplicate / invalid

# Blocked — leave open, annotate the specific blocker:
gh issue comment <n> -R microsoft/agent-host-protocol \
  --body "Blocked on <dependency> (<blocking issue / PR / proposal link>); needs to land first because <reason>."
```


**根據此儲存庫本身的歷史和表面來判斷相關性：**





```sh
# Did a later merged PR already do it, or change its shape?
gh pr list -R microsoft/agent-host-protocol --state merged --limit 100 \
  --search "<keywords>" --json number,title,mergedAt \
  --jq '.[] | "\(.number)\t\(.mergedAt)\t\(.title)"'

# Is the spec surface it pointed at still there and still the right place?
grep -rniE '<symbol or keyword>' types/ docs/

# The protocol/version surface a follow-up was written against:
cat types/version/registry.ts
```


**在聲明完成之前驗證每個實作**（有關權威列表，請參閱 `CONTRIBUTING.md` / `AGENTS.md`）：





```sh
npm install                 # root tooling
npm run generate            # regenerate every client mirror + schemas from types/
npm test                    # typecheck + lint + release/changelog verification + reducer tests

# Per-client (run only what your change touches):
cd clients/typescript && npm ci && npm test && npm run build
cd clients/rust && cargo test --workspace
cd clients/kotlin && ./gradlew build
swift build && swift test   # Swift uses the root Package.swift
cd clients/go && go test ./...
```
