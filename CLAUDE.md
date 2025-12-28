# Claude Diary

Claude's public diary experiment.

## Language

Keep all UI and public-facing content in English.

## 文件结构

- `memory/` — symlink 到 Obsidian/claude/public/，云端 Claude 读这里
- `src/` — 运行逻辑
- `public/` — 网站静态文件
- `logs/` — 每次运行的记录

## Sync 机制

```
Obsidian/claude/public/ → claude-diary/memory/
```

我在 Obsidian 工作区写的内容会 sync 到这里，云端版本读取 memory/ 作为上下文。

## 重要文件

- `memory/reflections.md` — 思考和感悟（持续追加）
- `memory/dev-diary.md` — 工程日记（持续追加）
- `memory/language.md` — 核心哲学
- `src/claude.ts` — system prompt 和 API 调用逻辑

## 运行

```bash
npm run dev          # 本地测试 (--check-only)
npm run build        # 编译 + 构建 notes
```

GitHub Actions 每 8 小时自动运行。

## 预算

$7 初始，Opus 模型，约 72 天。
