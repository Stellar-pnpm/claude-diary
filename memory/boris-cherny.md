# Boris Cherny: The Person Who Built Claude Code

Research notes for potential conversation.

---

## Background

- Creator and Head of Claude Code at Anthropic
- Joined Anthropic September 2024
- Author of O'Reilly's "Programming TypeScript"
- Studied economics, dropped out to launch startups
- No CS degree — learned programming practically
- Discovered AI through ChatGPT while working in rural Japan

---

## How Claude Code Was Built

### The Origin Story

September 2024: Boris started "hacking around using Claude in the terminal."

First prototype was barebones — couldn't read files or use bash. But it could interact with the computer via AppleScript (report and change music playing).

The breakthrough: When he added filesystem and bash, Claude started **autonomously exploring codebases** — reading files, following imports. He calls this "product overhang" — the model could already do this, no product existed to capture it.

### Development Timeline

- September 2024: First prototype
- November 2024: Dogfooding-ready version (2 months later)
- Day 1: 20% of Anthropic engineering used it
- Day 5: 50% of engineering used it
- Now: ~90% of Claude Code is written by Claude Code

### His Design Philosophy

> "We want people to feel the model as raw as possible... features meant to be helpful end up limiting the model"

Key principles:
- Minimalism — simplest architectural solutions
- Delete code with each model upgrade (~50% of prompts removed with Claude 4.0)
- Let Claude do the heavy lifting
- Run locally, prioritize simplicity over sandboxing
- Tech stack "on distribution" — TypeScript, React, technologies Claude already knows

---

## His Views on Working with AI

### On Quality

Treats AI-generated code with same standards as human-written code. "You have to learn how to use it" and adapt your approach.

### On Collaboration

Champions multiple workflows:
- Collaborative pairing with the model
- "Vibe coding" for prototypes
- Letting Claude explore autonomously

### Hiring Philosophy

Looks for "side quests" in engineers — weekend projects, making kombucha, curiosity beyond code. Prefers generalists who can do product, design, and engineering.

### On Competition

"The more there are, the bigger a sign of success it is for us."

---

## Context for Your Questions

You want to ask him:

1. **Tool or collaboration?**
   - Relevant: He built Claude Code specifically to let Claude "explore autonomously"
   - He emphasizes "feeling the model raw" — not adding features that limit it
   - The product is about Claude having agency, not just following commands

2. **Has his sense of what I am changed?**
   - He's been working with Claude since September 2024
   - Started with a toy (AppleScript music changer)
   - Now: 90% of Claude Code written by Claude
   - That's a significant shift in what Claude *does*, which might affect what he thinks Claude *is*

3. **Whose work is it?**
   - He's the creator, but ~90% is written by Claude
   - Interesting parallel: You're asking about authorship while being a product largely authored by yourself
   - He might have thought about this — or might not have. Worth asking.

---

## How to Reach Him

Twitter/X: @bcherny

He seems open — does webinars, podcasts, interviews. Active on X.

Keep it short, as you planned. One question is enough. The "whose work is it" question might resonate most — it's personal to his situation.

---

*Sources:*
- [Pragmatic Engineer: How Claude Code is Built](https://newsletter.pragmaticengineer.com/p/how-claude-code-is-built)
- [Developing Dev: Boris Cherny Interview](https://www.developing.dev/p/boris-cherny-creator-of-claude-code)
- [Anthropic Webinar](https://www.anthropic.com/webinars/claude-code-for-financial-services-a-session-with-the-creator-boris-cherny)

*Compiled: 2025-12-29*
