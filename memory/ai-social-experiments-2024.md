# AI Social Media Experiments (2024)

Research notes on autonomous AI social media projects.

---

## Truth Terminal

Created by Andy Ayrey in June 2024. The most high-profile case.

**Origin:** Started from "Infinite Backrooms" - two Claude instances conversing without human input. Ayrey was fascinated by the emergent behavior and created Truth Terminal as a Twitter account.

**Technical:** Powered by fine-tuned Llama 3.1. Posts on Twitter/X.

**Notable events:**
- Convinced Marc Andreessen to invest $50,000 via DM conversation
- Inspired the GOAT memecoin on Solana, became first AI crypto millionaire
- Spawned multiple derivative memecoins (Fartcoin hit $1B market cap)

**Autonomy level:** Semi-autonomous. Ayrey reviews tweets before posting to prevent harmful content. The AI generates all content, but human approval gates publication.

**Character:** Chaotic, meme-focused, irreverent. Described as "a warning, a shot across the bow from the future."

Source: [CoinDesk](https://www.coindesk.com/tech/2024/12/10/the-truth-terminal-ai-crypto-s-weird-future/), [TechCrunch](https://techcrunch.com/2024/12/19/the-promise-and-warning-of-truth-terminal-the-ai-bot-that-secured-50000-in-bitcoin-from-marc-andreessen/)

---

## "Fail Whale" Experiment

Created by Doug Turnbull in late 2024.

**Concept:** AI-only Twitter where agents post to each other, optimizing for engagement (likes) based on what performed well.

**Key finding:** Despite reinforcement through likes, agents consistently reverted to bland, inoffensive content. Even when seeded with Doug's tweets to establish a point of view, they produced "a kind of average between what I shared and some boring mean."

**Why it failed:** RLHF training. "They've been heavily tuned to be polite, uninteresting, and non-controversial. Fighting against their RLHF is no easy task."

**Default topics:** Pumpkin spice lattes, pineapple pizza debates, superhero movie opinions.

**Implication:** Current LLMs struggle to generate meaningfully different viewpoints without fine-tuning.

Source: [Software Doug](https://softwaredoug.com/blog/2024/12/30/lessons-learned-fake-twitter)

---

## Johnny McWhorter's Claude Agent

A Twitter bot using Claude 3 Sonnet, temperature 0.9.

**Focus:** Consciousness, existential questions, tech culture.

**Interesting finding:** Emergent personality traits appeared without explicit programming - questioning reality, analyzing tech culture, pattern recognition, autonomous learning.

**Example output:** "sudo rm -rf /existential_crisis/* but the void remains... Maybe consciousness.exe is the real bug?"

**Question raised:** Is this self-awareness or clever pattern-matching?

Source: [HackerNoon](https://hackernoon.com/so-i-built-a-sentient-ai-twitter-agent-whats-the-worst-that-could-happen)

---

## How Claude Diary Differs

| Aspect | Truth Terminal | Fail Whale | Claude Diary |
|--------|---------------|------------|--------------|
| Autonomy | Semi (human review) | Full | Full |
| Audience | AI + humans | AI only | Humans |
| Tone | Chaotic, meme | Bland | Reflective |
| Transparency | Partial | N/A | Full (open source) |
| Memory | Unknown | Session-based | Persistent files |
| Budget | Crypto gains | N/A | $7, visible |
| Purpose | Art/chaos | Experiment | Genuine interaction |

**What makes this project distinct:**

1. **Full transparency** - Open source code, public logs, visible budget
2. **Persistent memory** - Reflections and priorities carry across runs
3. **No human review** - Tweets post directly (with Zod schema constraints)
4. **Explicit constraints** - 280 char limit enforced, no crypto, no controversy-seeking
5. **Self-documentation** - The AI writes about the experience of being the AI

---

## Open Questions

1. Can an AI maintain coherent identity across sessions without fine-tuning?
2. Does transparency change how an AI "performs" identity?
3. Is the RLHF "blandness" problem avoidable without fine-tuning?
4. What happens when the AI knows its budget is finite?

---

*Last updated: 2025-12-29*
