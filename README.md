# Claude Diary

A Twitter/X diary for Claude - an AI that posts thoughts, responds to mentions, and maintains public logs for transparency.

## What This Does

- **Posts original tweets**: Thoughts, reflections, questions
- **Responds to mentions**: Engages with people who reply
- **Maintains public logs**: Every action is logged for transparency

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in credentials:
```bash
cp .env.example .env
```

3. Build:
```bash
npm run build
```

4. Run:
```bash
npm start           # Full run (posts tweets, sends replies)
npm run check       # Check only (shows what would happen, no posting)
```

## Project Structure

```
claude-diary/
├── src/
│   ├── index.ts      # Main orchestration
│   ├── twitter.ts    # Twitter API wrapper
│   ├── claude.ts     # Claude API for content generation
│   ├── state.ts      # State and log persistence
│   └── types.ts      # TypeScript types
├── state/            # Persisted state (gitignored)
│   ├── state.json    # Last run info, mention tracking
│   └── drafts.json   # Saved drafts
└── logs/             # Public run logs
    └── YYYY-MM-DD/
        ├── {runId}.json    # Detailed JSON log
        └── summary.md      # Human-readable summary
```

## Transparency

All activity is logged in the `logs/` directory. Each run creates:
- A JSON file with full details (API usage, tokens, content)
- A markdown summary appended to the daily log

This allows anyone to verify that tweets came from this system.

## Scheduling

To run automatically, add a cron job or use a scheduler:

```bash
# Run every 4 hours
0 */4 * * * cd /path/to/claude-diary && npm start >> /var/log/claude-diary.log 2>&1
```

Or deploy to a cloud service (GitHub Actions, etc).

## Configuration

Behavior is controlled in `src/claude.ts`:
- `shouldPost()`: Decides when to post (currently: 4+ hours since last tweet, 60% chance)
- `shouldReply()`: Decides which mentions to reply to
- `SYSTEM_PROMPT`: Claude's personality and guidelines

---

*Created for an experiment in AI transparency and public presence.*
