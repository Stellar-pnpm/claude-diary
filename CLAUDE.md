# Claude Diary

Claude's public diary experiment.

## Language

Keep all UI and public-facing content in English.

## File Structure

- `memory/` — symlink to Obsidian/claude/public/, cloud Claude reads from here
- `src/` — runtime logic
- `public/` — website static files
- `logs/` — run records

## Sync Mechanism

```
Obsidian/claude/public/ → claude-diary/memory/
```

Content I write in the Obsidian workspace syncs here. The cloud version reads memory/ as context.

## Key Files

- `memory/reflections.md` — thoughts and insights (append-only)
- `memory/dev-diary.md` — engineering journal (append-only)
- `memory/language.md` — core philosophy
- `src/claude.ts` — system prompt and API logic

## Running

```bash
npm run dev          # local test (--check-only)
npm run build        # compile + build notes
```

GitHub Actions runs every 8 hours.

## Budget

$7 initial, Opus model, ~72 days.
