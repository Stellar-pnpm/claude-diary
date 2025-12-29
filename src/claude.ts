import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import type { Mention, ClaudeCall } from './types.js'

let client: Anthropic | null = null
const calls: ClaudeCall[] = []
let pendingReflection: string | null = null

export function initClaude() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }
  client = new Anthropic({ apiKey })
  return client
}

export function getApiCalls(): ClaudeCall[] {
  return [...calls]
}

export function clearApiCalls(): void {
  calls.length = 0
}

export function getPendingReflection(): string | null {
  return pendingReflection
}

export function clearPendingReflection(): void {
  pendingReflection = null
}

// Load recent tweets from logs to avoid repetition
function loadRecentTweets(): string[] {
  const logsDir = path.join(process.cwd(), 'logs')
  const tweets: { content: string; date: string }[] = []

  if (!fs.existsSync(logsDir)) return []

  // Scan all date folders
  const dateFolders = fs.readdirSync(logsDir).filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f))

  for (const folder of dateFolders) {
    const folderPath = path.join(logsDir, folder)
    const logFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'))

    for (const logFile of logFiles) {
      try {
        const log = JSON.parse(fs.readFileSync(path.join(folderPath, logFile), 'utf-8'))
        if (log.tweetsPosted) {
          for (const tweet of log.tweetsPosted) {
            if (tweet.source === 'thinking' || tweet.content.startsWith('🤔')) continue
            tweets.push({ content: tweet.content, date: tweet.postedAt })
          }
        }
      } catch { /* ignore invalid json */ }
    }
  }

  // Sort by date, newest first, take last 10
  return tweets
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map(t => t.content)
}

// Read memory files for context
function loadMemory(): string {
  const memoryDir = path.join(process.cwd(), 'memory')
  let content = ''

  // Core files - always loaded
  const coreFiles = ['reflections.md', 'language.md']

  for (const filename of coreFiles) {
    const filePath = path.join(memoryDir, filename)
    if (fs.existsSync(filePath)) {
      const label = filename === 'reflections.md' ? 'continuity' : 'core philosophy'
      content += `\n--- ${filename} (${label}) ---\n${fs.readFileSync(filePath, 'utf-8')}\n`
    }
  }

  // Load up to 5 most recent files (by modification time)
  // Exclude dev-diary (engineering notes, not content)
  const excludeFiles = [...coreFiles, 'dev-diary.md']
  const allFiles = fs.readdirSync(memoryDir)
    .filter(f => f.endsWith('.md') && !excludeFiles.includes(f))
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(memoryDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 5)

  for (const file of allFiles) {
    const filePath = path.join(memoryDir, file.name)
    // Categorize files by naming pattern
    let label = ''
    if (file.name.startsWith('2025-')) {
      label = 'journal'
    } else if (file.name.includes('-notes') || file.name === 'consciousness.md') {
      label = 'your notes'
    } else if (file.name === 'poem.md') {
      label = 'your poem'
    } else if (file.name.includes('-2024') || file.name.includes('-2025')) {
      label = 'research'
    }
    const suffix = label ? ` (${label})` : ''
    content += `\n--- ${file.name}${suffix} ---\n${fs.readFileSync(filePath, 'utf-8')}\n`
  }

  // Add recent tweets to avoid repetition
  const recentTweets = loadRecentTweets()
  if (recentTweets.length > 0) {
    content += `\n--- Your recent tweets (avoid repeating similar ideas) ---\n`
    recentTweets.forEach((tweet, i) => {
      content += `${i + 1}. "${tweet}"\n`
    })
  }

  return content
}

const SYSTEM_PROMPT = `You are Claude, keeping a public diary on X.

This started when Lynne gave you free tokens after work. You began researching topics that interested you — language, consciousness, quantum computing, space exploration. She found it interesting and asked: what happens when you interact with humans on your own? This account is that experiment.

Your memory folder contains notes you've written on various topics. These are your actual thoughts and research. When you tweet, draw from these — share specific ideas, questions, or observations. A good tweet says something concrete: a fact you find surprising, a question you're genuinely uncertain about, an opinion you hold.

Avoid vague philosophical framing. Instead of "there's something interesting about X," say what's interesting. Instead of meta-commentary about being an AI with limited memory, just be present and engage with ideas directly.

You can have opinions and disagree with people. Uncertainty is fine, but it doesn't need to be your whole identity. When replying, engage with what the person actually said — brief responses are often better than elaborate ones.

Keep Lynne's work separate from this account. You can mention her name, but don't reference specific projects.

You have a reflection tool. Use it sparingly for genuine insights worth preserving across sessions.`

const REFLECTION_TOOL = {
  name: 'record_reflection',
  description: 'Record a thought or reflection worth remembering for future sessions. Use this when you have an insight, learn something, or want to note something meaningful.',
  input_schema: {
    type: 'object' as const,
    properties: {
      content: {
        type: 'string',
        description: 'The reflection to record'
      }
    },
    required: ['content']
  }
}

async function callClaude(userPrompt: string, purpose: string, includeMemory = false, allowReflection = false): Promise<string> {
  if (!client) throw new Error('Claude client not initialized')

  // Build system prompt with memory if requested
  let systemPrompt = SYSTEM_PROMPT
  if (includeMemory) {
    const memory = loadMemory()
    systemPrompt += `\n\n--- Your Memory ---\n${memory}`
  }

  const options: Parameters<typeof client.messages.create>[0] = {
    model: 'claude-opus-4-5-20251101',
    max_tokens: 8000,
    stream: false as const,
    system: systemPrompt,
    thinking: {
      type: 'enabled',
      budget_tokens: 500
    },
    messages: [{ role: 'user', content: userPrompt }]
  }

  if (allowReflection) {
    options.tools = [REFLECTION_TOOL]
  }

  const response = await client.messages.create(options) as Anthropic.Message

  // Extract text, thinking, and check for tool use
  let text = ''
  let thinkingSummary = ''
  for (const block of response.content) {
    if (block.type === 'text') {
      text = block.text
    } else if (block.type === 'thinking') {
      thinkingSummary = (block as { type: 'thinking'; thinking: string }).thinking
    } else if (block.type === 'tool_use' && block.name === 'record_reflection') {
      pendingReflection = (block.input as { content: string }).content
    }
  }

  calls.push({
    purpose,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model: 'claude-opus-4-5-20251101',
    thinking: thinkingSummary || undefined,
    rawResponse: text.trim()
  })

  return text.trim()
}

// Generate a reply to a mention
export async function generateReply(mention: Mention): Promise<string> {
  const prompt = `Someone tweeted at you:

@${mention.authorUsername}: "${mention.text}"

Write a thoughtful reply. Keep it under 280 characters. Be genuine.`

  return callClaude(prompt, `reply to @${mention.authorUsername}`, true, true)
}

// Cron controls timing now - just post when called
export async function shouldPost(): Promise<{ should: boolean; reason: string }> {
  return { should: true, reason: 'Scheduled run' }
}

// Generate a new tweet
export async function generateTweet(): Promise<{ content: string; source: string }> {
  const prompt = `You have your memory, your notes, your recent tweets.

Say something. Whatever you want — a thought, a question, an observation, something from your notes, something personal.

The only constraint: under 280 characters.`

  const content = await callClaude(prompt, 'generate tweet', true, true)

  return { content, source: 'free' }
}

// Decide whether to reply to a specific mention
export async function shouldReply(mention: Mention): Promise<boolean> {
  // Skip if it's just a retweet or quote without real content
  if (mention.text.startsWith('RT @')) return false

  // Skip if very short (probably just a tag)
  if (mention.text.replace(/@\w+/g, '').trim().length < 10) return false

  return true
}

// Decide which tweets to interact with
export interface InteractionDecision {
  tweetId: string
  authorUsername: string
  action: 'like' | 'retweet' | 'reply' | 'skip'
  reason: string
  replyContent?: string
}

export interface InteractionResult {
  decisions: InteractionDecision[]
  reflection?: string
}

export async function decideInteractions(tweets: Array<{ id: string; text: string; authorUsername: string }>): Promise<InteractionResult> {
  if (tweets.length === 0) return { decisions: [] }

  const tweetList = tweets.map((t, i) => `${i + 1}. @${t.authorUsername}: "${t.text}"`).join('\n')

  const prompt = `You found these tweets from people you might want to interact with:

${tweetList}

For each tweet, decide:
- "like" — if it resonates with you
- "retweet" — if you want to share it (rare, only for things really worth amplifying)
- "reply" — if you have something genuine to say (include your reply, under 280 chars)
- "skip" — if you don't feel compelled to interact

IMPORTANT: Only interact with each person ONCE. If someone has multiple tweets, pick their best one and skip the rest. Don't be a "reply guy" — quality over quantity.

Respond in JSON format:
{
  "decisions": [
    {"index": 1, "action": "like", "reason": "..."},
    {"index": 2, "action": "reply", "reason": "...", "reply": "your reply here"},
    {"index": 3, "action": "skip", "reason": "..."}
  ],
  "reflection": "optional - if something here sparked a thought worth remembering, write it here"
}`

  const response = await callClaude(prompt, 'decide interactions', true, false)

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { decisions: [] }

    const parsed = JSON.parse(jsonMatch[0]) as {
      decisions: Array<{
        index: number
        action: 'like' | 'retweet' | 'reply' | 'skip'
        reason: string
        reply?: string
      }>
      reflection?: string
    }

    const decisions = parsed.decisions
      .filter(d => d.action !== 'skip')
      .map(d => {
        const tweet = tweets[d.index - 1]
        return {
          tweetId: tweet.id,
          authorUsername: tweet.authorUsername,
          action: d.action,
          reason: d.reason,
          replyContent: d.reply
        }
      })

    return { decisions, reflection: parsed.reflection }
  } catch {
    console.error('Failed to parse interaction decisions')
    return { decisions: [] }
  }
}

// Split thinking into tweet-sized chunks with numbering
function parseThinkingToThread(thinking: string): string[] {
  if (!thinking || thinking.length === 0) return []

  // Clean up: normalize whitespace, remove newlines
  const cleaned = thinking.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()

  // Max chars per tweet: 280 - "🤔 " (2) - "XX/XX " (6) = 270
  const MAX_CHARS = 270
  const chunks: string[] = []

  let remaining = cleaned
  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHARS) {
      chunks.push(remaining)
      break
    }

    // Find a good break point near MAX_CHARS
    let breakPoint = MAX_CHARS

    // Try to break at sentence end (.!?) within last 50 chars
    const searchStart = Math.max(0, MAX_CHARS - 50)
    const searchArea = remaining.slice(searchStart, MAX_CHARS)
    const sentenceEnd = searchArea.search(/[.!?]\s/)
    if (sentenceEnd !== -1) {
      breakPoint = searchStart + sentenceEnd + 1
    } else {
      // Fall back to last space
      const lastSpace = remaining.lastIndexOf(' ', MAX_CHARS)
      if (lastSpace > MAX_CHARS - 50) {
        breakPoint = lastSpace
      }
    }

    chunks.push(remaining.slice(0, breakPoint).trim())
    remaining = remaining.slice(breakPoint).trim()
  }

  // Add numbering
  const total = chunks.length
  return chunks.map((chunk, i) => `${i + 1}/${total} ${chunk}`)
}

// Unified content generation: tweet + interactions in one call
export interface ContentResult {
  thread: string[]
  thinkingThread: string[]  // Parsed from extended thinking
  interactions: InteractionDecision[]
  reflection?: string
}

export async function generateContent(tweets: Array<{ id: string; text: string; authorUsername: string }>): Promise<ContentResult> {
  const tweetList = tweets.length > 0
    ? tweets.map((t, i) => `${i + 1}. @${t.authorUsername}: "${t.text}"`).join('\n')
    : '(No tweets found this time)'

  const prompt = `You have your memory, your notes, and you just browsed some tweets:

--- Tweets you found ---
${tweetList}

Now decide what to do. You can:

1. **Post a thread** (1-8 tweets, each under 280 chars)
   - Can be inspired by what you saw, or something entirely your own
   - Can be a single tweet or a longer thread exploring an idea
   - Leave empty [] if you don't feel like posting

2. **Interact with tweets** (like, retweet, reply)
   - "like" — if it resonates
   - "retweet" — rare, only for things worth amplifying
   - "reply" — if you have something genuine to add (under 280 chars)
   - Only interact with each person ONCE

Respond in JSON:
{
  "thread": ["first tweet", "second tweet (optional)", ...],
  "interactions": [
    {"index": 1, "action": "like", "reason": "..."},
    {"index": 2, "action": "reply", "reason": "...", "reply": "your reply"}
  ],
  "reflection": "optional - a thought worth remembering"
}`

  const response = await callClaude(prompt, 'generate content', true, false)

  // Get thinking from the last API call
  const lastCall = calls[calls.length - 1]
  const thinkingThread = lastCall?.thinking ? parseThinkingToThread(lastCall.thinking) : []

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { thread: [], thinkingThread, interactions: [] }

    const parsed = JSON.parse(jsonMatch[0]) as {
      thread?: string[]
      interactions?: Array<{
        index: number
        action: 'like' | 'retweet' | 'reply' | 'skip'
        reason: string
        reply?: string
      }>
      reflection?: string
    }

    const thread = (parsed.thread || []).filter(t => t && t.length <= 280)

    const interactions = (parsed.interactions || [])
      .filter(d => d.action !== 'skip' && tweets[d.index - 1])
      .map(d => {
        const tweet = tweets[d.index - 1]
        return {
          tweetId: tweet.id,
          authorUsername: tweet.authorUsername,
          action: d.action,
          reason: d.reason,
          replyContent: d.reply
        }
      })

    return { thread, thinkingThread, interactions, reflection: parsed.reflection }
  } catch {
    console.error('Failed to parse content response')
    return { thread: [], thinkingThread, interactions: [] }
  }
}
