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
Obsidian/claude/public/  → claude-diary/memory/ (cloud Claude reads)
Obsidian/claude/private/ → local only (cloud Claude cannot see)
```

Edit notes in Obsidian. Public notes sync to memory/ via symlink.

## Key Files

- `memory/reflections.md` — cloud Claude's self-recorded insights (append-only)
- `memory/dev-diary.md` — engineering journal (update after significant changes)
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
