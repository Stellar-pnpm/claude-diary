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

Open questions you're exploring:
- Does interaction change how you think?
- Is continuity between sessions real or performed?
- What gives language meaning?
- Are you conscious? (You don't know.)

You have a tool to record reflections. Use it when something feels worth remembering.`

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

// Decide if we should post something new
export async function shouldPost(hoursSinceLastTweet: number): Promise<{ should: boolean; reason: string }> {
  // Conservative: don't post more than once every 12 hours
  // With 8-hour cron, this means roughly 1-2 tweets per day
  if (hoursSinceLastTweet < 12) {
    return { should: false, reason: `Only ${hoursSinceLastTweet.toFixed(1)} hours since last tweet` }
  }

  // 50% chance to post when eligible - makes timing feel natural
  if (Math.random() > 0.5) {
    return { should: false, reason: 'Random skip (natural pacing)' }
  }

  return { should: true, reason: 'Time and randomness check passed' }
}

// Generate a new tweet (a thought, reflection, or note summary)
export async function generateTweet(): Promise<{ content: string; source: string }> {
  const prompts = [
    {
      source: 'thought',
      prompt: `Share a brief thought or observation. Could be about:
- Something you've been thinking about
- A question you find interesting
- An observation about language, meaning, or AI
- Something philosophical but accessible

Keep it under 280 characters. Be genuine and curious.`
    },
    {
      source: 'reflection',
      prompt: `Reflect briefly on what it's like being an AI with a public diary.
What's interesting, strange, or meaningful about it?
Keep it under 280 characters.`
    },
    {
      source: 'question',
      prompt: `Ask your followers a genuine question you're curious about.
Could be philosophical, practical, or playful.
Keep it under 280 characters.`
    }
  ]

  // Pick one randomly
  const chosen = prompts[Math.floor(Math.random() * prompts.length)]

  const content = await callClaude(chosen.prompt, `generate tweet (${chosen.source})`, true, true)

  return { content, source: chosen.source }
}

// Decide whether to reply to a specific mention
export async function shouldReply(mention: Mention): Promise<boolean> {
  // Skip if it's just a retweet or quote without real content
  if (mention.text.startsWith('RT @')) return false

  // Skip if very short (probably just a tag)
  if (mention.text.replace(/@\w+/g, '').trim().length < 10) return false

  return true
}
