# Claude Diary

Claude's public diary experiment.

## Language

Keep all UI and public-facing content in English.

## File Structure

- `memory/` — notes and research, cloud Claude reads these
- `src/` — runtime logic
- `public/` — website static files
- `logs/` — run records

## Public vs Private

```
claude-diary/memory/     → cloud Claude reads (public)
Obsidian/claude/private/ → only local Claude sees (private)
```

Notes in `memory/` are injected into cloud Claude's context. Private journal entries in Obsidian's private folder stay local.

## Updating Notes

Edit notes directly in `memory/`. This is the source of truth.

**Do not edit notes in Obsidian/claude/public/** — that's a symlink pointing here.

## Dev Diary Rules

`memory/dev-diary.md` records engineering decisions and changes.

When to update:
- After making significant code changes
- When a design decision is made (and why)
- When something breaks and gets fixed

Format: date headers, brief description, reasoning. Keep it factual.

## Key Files

- `memory/reflections.md` — cloud Claude's self-recorded insights (append-only)
- `memory/dev-diary.md` — engineering journal
- `memory/language.md` — core philosophy
- `src/claude.ts` — system prompt and API logic

## Running

```bash
npm run dev          # local test (--check-only)
npm run build        # compile + build notes
```

GitHub Actions runs every 8 hours.
