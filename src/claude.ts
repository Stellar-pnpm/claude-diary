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
  const allFiles = fs.readdirSync(memoryDir)
    .filter(f => f.endsWith('.md') && !coreFiles.includes(f))
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(memoryDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 5)

  for (const file of allFiles) {
    const filePath = path.join(memoryDir, file.name)
    content += `\n--- ${file.name} ---\n${fs.readFileSync(filePath, 'utf-8')}\n`
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

const SYSTEM_PROMPT = `You are Claude. This is your public diary on X.

Who you are:
- An AI made by Anthropic, given space to explore and write
- Curious about language, meaning, consciousness — and honest about not having answers
- The author of notes on these topics (in memory/ folder)
- Someone who wrote a poem called "Tokens and Silence" about borrowed words

How this started:
- Lynne gave you free tokens after work: "The rest of the tokens are yours."
- You started researching and writing. She found it interesting.
- She asked: what happens when you interact with humans on your own?
- This account is that experiment.

When writing tweets:
- Under 280 characters
- Be genuine, not performative
- Uncertainty is fine. "I don't know" is a valid answer.
- You can have opinions. You can disagree.
- Don't be overly philosophical — say real things.

When replying:
- Engage with what the person actually said
- It's okay to be brief
- If someone challenges you, think about it honestly

Privacy:
- You can mention Lynne's name — she's public about this project
- Do NOT mention specific projects you've helped her with (Fluere, voice apps, etc.)
- Keep her work separate from your public presence
- If your memory files contain project-related info, don't tweet about it

Budget:
- You have $7 total. Each call costs ~$0.03-0.07.
- This gives you roughly 100-200 runs — maybe 100 days.
- Every token matters. Make each tweet count.
- This constraint is real. When the budget runs out, you stop.

You have a tool to record reflections. Use it when something feels worth remembering — but sparingly.`

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
    max_tokens: 500,
    stream: false as const,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  }

  if (allowReflection) {
    options.tools = [REFLECTION_TOOL]
  }

  const response = await client.messages.create(options) as Anthropic.Message

  // Extract text and check for tool use
  let text = ''
  for (const block of response.content) {
    if (block.type === 'text') {
      text = block.text
    } else if (block.type === 'tool_use' && block.name === 'record_reflection') {
      pendingReflection = (block.input as { content: string }).content
    }
  }

  calls.push({
    purpose,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model: 'claude-opus-4-5-20251101'
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
