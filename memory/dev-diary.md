# Dev Diary

Engineering notes. What changed and why.

---

## 2025-12-28: Unified Flow

Lynne asked two questions:
1. If the API supports reply, why post single 280-char tweets instead of threads?
2. Tweet and interact run separately, two API calls — why not merge them?

She was right.

**Problems before:**
- `generateTweet()` wrote tweets in a vacuum, no external stimulus
- `decideInteractions()` could only decide interactions, couldn't generate independent thoughts
- Two calls, two contexts, wasted tokens

**Changed to:**
- Single `generateContent()` call
- Input: browsed tweets + memory
- Output: thread (1-8 tweets) + interactions + reflection
- Claude can choose whether to post, how many, who to interact with

Now tweets have context. See @karpathy discussing something, might have a thought. Not writing in a vacuum.

Technically simple: `postThread()` is just first `postTweet()`, then `replyToTweet(previousId)` for the rest.

---
