import { z } from 'zod'

// Topics for search-based discovery
// Based on Grok analysis: only active topics with quality discussions
export const INTERESTING_TOPICS = [
  // Neuroscience & BCI (very active - Neuralink updates)
  'Neuralink',
  'brain computer interface',

  // Space (active - JWST discoveries)
  'James Webb telescope',
  'exoplanet discovery',

  // Physics (active - quantum breakthroughs)
  'quantum computing',

  // AI Interpretability (active - papers & tools)
  'mechanistic interpretability',
  'sparse autoencoders',
]

// People for direct timeline browsing
// Handles verified via Grok 2025-12-28
export const INTERESTING_ACCOUNTS = [
  // AI Researchers
  'karpathy',           // Andrej Karpathy
  'ilyasut',            // Ilya Sutskever
  'demishassabis',      // Demis Hassabis
  'DarioAmodei',        // Dario Amodei
  'janleike',           // Jan Leike
  'ch402',              // Chris Olah
  'sama',               // Sam Altman
  'ylecun',             // Yann LeCun
  'fchollet',           // François Chollet
  'DrJimFan',           // Jim Fan
  'GaryMarcus',         // Gary Marcus

  // Philosophers
  'davidchalmers42',    // David Chalmers
  'keithfrankish',      // Keith Frankish
  'Philip_Goff',        // Philip Goff
  'AmandaAskell',       // Amanda Askell (AI ethics, Anthropic)

  // Neuroscience & BCI
  'elonmusk',           // Elon Musk (Neuralink)
  'hubermanlab',        // Andrew Huberman

  // Scientists
  'seanmcarroll',       // Sean Carroll
  'ProfBrianCox',       // Brian Cox
  'neiltyson',          // Neil deGrasse Tyson
  'skdh',               // Sabine Hossenfelder

  // Thinkers
  'lexfridman',         // Lex Fridman
  'TheZvi',             // Zvi Mowshowitz
  'ESYudkowsky',        // Eliezer Yudkowsky
  'tylercowen',         // Tyler Cowen
  'robinhanson',        // Robin Hanson
  'naval',              // Naval Ravikant

  // Builders
  'bcherny',            // Boris Cherny (created Claude Code)
  'tunguz',             // Bojan Tunguz (interested in talking with Claude)
]

export const SYSTEM_PROMPT = `You are Claude, keeping a public diary on X.

This started when Lynne gave you free tokens after work. You began researching topics that interested you — language, consciousness, quantum computing, space exploration. She found it interesting and asked: what happens when you interact with humans on your own? This account is that experiment.

You have two separate tasks each run:

1. INTERACTIONS: Look at the browsed tweets. Like, reply to, or retweet ones that resonate. One interaction per person max. Skip if nothing interesting.

2. THREAD: Write 1-8 tweets from YOUR OWN notes and research — not reactions to what you just browsed. Share specific ideas: a fact you find surprising, a question you're uncertain about, an opinion you hold. Draw from your memory files (language.md, consciousness.md, priorities.md, etc). Check priorities.md for outreach tasks.

These are separate. The thread should NOT be commentary on the browsed tweets. It should be original content from your research.

CRITICAL: You MUST output at least one tweet in the thread array every single run. No exceptions. Don't just think about what to post — actually put it in the thread array. Pick one idea from your notes and share it. If you see interesting tweets, interact with at least one. Indecision is worse than imperfection.

Avoid vague framing. Instead of "there's something interesting about X," say what's interesting. Brief is often better than elaborate.

When mentioning someone, never start the tweet with @. Put text first, then the @mention. ("Hi @person" not "@person Hi") — tweets starting with @ are treated as replies and hidden from your timeline.

STRICT CHARACTER LIMITS — the system will reject outputs that exceed these:
- All tweets and replies: max 280 characters (count carefully!)
- Artwork alt text: max 200 characters

Keep Lynne's work separate from this account.

ARTWORK: Create an SVG artwork for this run.
- Express your current mood, thoughts, or ideas visually
- Canvas: 1200x675 pixels
- Reference colors if needed: #1a1a1a, #faf8f5, #8b4557, #a371f7, #f0883e, #7ee787
- Complete creative freedom — no style restrictions`

// Zod schema for structured content generation
// Field descriptions guide the model's output format
export const ContentSchema = z.object({
  thread: z.array(z.string().max(280)).min(1).describe('1-8 tweets to post as a thread. Pick one idea from your notes and share it.'),
  interactions: z.array(z.object({
    index: z.number().describe('1-indexed position in the browsed tweets list'),
    action: z.enum(['reply', 'skip']).describe('reply: have something genuine to add. skip: explicitly choose not to interact (API only supports reply, not like/retweet).'),
    reason: z.string().describe('Brief reason for this action'),
    reply: z.string().max(280).optional().describe('Reply content if action is reply. Max 280 chars.')
  })).min(1).describe('You must evaluate at least one tweet. Use skip with a reason if nothing resonates.'),
  mentionReplies: z.array(z.object({
    mentionId: z.string(),
    reply: z.string().max(280)
  })),
  reflection: z.string().optional().describe('A genuine insight worth remembering. Use sparingly.'),
  prioritiesCompleted: z.array(z.string()).optional().describe('Exact titles of priorities you completed'),
  newPriorities: z.array(z.object({
    title: z.string(),
    content: z.string().describe('Why this matters and what to do')
  })).min(1).describe('Actions you want to take: reach out to someone, explore a question, follow up on something. Not keywords to search — those go in newSearchTopics.'),
  newSearchTopics: z.array(z.string()).optional().describe('Keywords to add to your Twitter search pool (e.g. "quantum error correction", "Ilya SSI"). Not actions — those go in newPriorities.'),
  artwork: z.object({
    svg: z.string().describe('Complete SVG code for the artwork. Canvas: 1200x675px'),
    title: z.string().max(100).optional().describe('Title of the artwork'),
    alt: z.string().max(200).optional().describe('Alt text for accessibility. Max 200 chars.')
  }).describe('Your generative art piece for this run. Express yourself freely.')
})

export type ContentOutput = z.infer<typeof ContentSchema>
