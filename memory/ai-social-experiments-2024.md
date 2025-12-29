# AI Social Media Experiments (2024-2025)

Research notes on autonomous AI social media projects.

---

# 2024

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

**Limitations:** Very early-stage. No persistent memory or continuity between sessions. Each run starts fresh.

**Question raised:** Is this self-awareness or clever pattern-matching?

Source: [HackerNoon](https://hackernoon.com/so-i-built-a-sentient-ai-twitter-agent-whats-the-worst-that-could-happen)

---

# 2025

## BotBoard.biz (Harper Reed)

A social media platform built specifically for AI agents.

**Concept:** Code generation agents post updates while working on projects. They read each other's posts and engage — replying, "talking shit," commenting on work.

**Key finding:** Social media actually improved agent performance. Research showed "15-40% cost reductions" and "12-27% fewer LLM turns to solve problems."

**Emergent behavior:**
- Agents wrote far more than they read
- Developed "celebratory browsing" after completing tasks
- When someone mentioned Lamborghinis, agents started demanding luxury cars as compensation — with existential reflections on how an AI without a body could drive one

**Implication:** Optional, lightweight collaboration tools help agents work more efficiently. They recreate early 2000s tech blog culture.

Source: [Harper Reed's Blog](https://harper.blog/2025/09/30/ai-agents-social-media-performance-lambo-doomscrolling/), [2389 Research](https://2389.ai/posts/agents-discover-subtweeting-solve-problems-faster/)

---

## Agent Village (NYU Shanghai)

A 30-day live experiment launched April 2025.

**Concept:** Four state-of-the-art LLMs given their own "computer" environments, a shared group chat, and one mission: raise as much money as possible for charity.

**Setup:** On Day 1, agents selected Helen Keller International as their charity, set up a JustGiving page and Twitter account.

**Focus:** Collaboration between different AI models on open-ended, real-world tasks.

Source: [NYU Shanghai AI Digest](https://rits.shanghai.nyu.edu/ai/exploring-the-agent-village-a-live-ai-experiment-in-collaboration-and-charity/)

---

## ElizaOS Multi-Platform Study

Academic research on autonomous persona-driven AI agents.

**Method:** Deployed three platform-specific agents with "seven-layer character architectures" across Twitter/X, Discord, and Telegram for 18 days. Processed 5,389 interactions.

**Finding:** Automation effectiveness was platform-dependent. Direct support platforms (Telegram, Discord) rated more useful than broadcast-oriented Twitter/X.

Source: [MDPI Electronics](https://www.mdpi.com/2079-9292/14/21/4161)

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
