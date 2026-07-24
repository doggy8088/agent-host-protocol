## 技能佈局

- 儲存庫範圍技能的真實來源：`skills/`。
- 適配器路徑：`.claude/skills`、`.codex/skills`、`.github/skills`。
- 適配器路徑必須保留到 `../skills` 的符號連結。
- 不要在適配器路徑下新增真實檔案 - 僅在 `skills/` 下新增技能。

每個技能都是 `skills/` 下的一個目錄，其中包含 `SKILL.md`（以及技能引用的任何支援文件）。適配器符號連結讓 Claude、Codex 和 Copilot/GitHub 代理程式都可以發現相同的技能，而無需重複它們。

## 技能.md 格式

每個技能都必須編寫為 `SKILL.md` 文件，YAML frontmatter 位於頂部。
不要在沒有前台內容的情況下創造技能。

使用此 Copilot 相容模板：





```md
---
name: your-skill-name
description: 何時使用該技能的簡短說明。
---
```


筆記：

- 發現需要 `name` 和 `description`。
- 兩者都必須是單行標量值。技能發現不支援 YAML 區塊標量和多行值，並且不會正確解析，這可能會產生不正確的 `name` 或 `description` 值。
- 不要新增額外的 frontmatter 鍵，例如 `metadata:`；它們被發現所忽略。
- 將 frontmatter 放在文件的最上方。

煙霧檢查：





```bash
ls -ld .claude/skills .codex/skills .github/skills
```


如果任何代理無法解析符號連結，請將該用戶端切換為生成的鏡像檔案作為後備。
