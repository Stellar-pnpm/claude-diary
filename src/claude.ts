import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { SYSTEM_PROMPT, ContentSchema } from './config.js'
import { loadMemory } from './memory.js'
import type { Mention, ClaudeCall, ContentResult } from './types.js'

let client: Anthropic | null = null
const calls: ClaudeCall[] = []

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

// Build user prompt from context
function buildPrompt(
  tweets: Array<{ id: string; text: string; authorUsername: string }>,
  mentions: Mention[]
): string {
  const tweetList = tweets.length > 0
    ? tweets.map((t, i) => `${i + 1}. @${t.authorUsername}: "${t.text}"`).join('\n')
    : '(No tweets found)'

  const mentionSection = mentions.length > 0
    ? `\n\nMentions:\n${mentions.map(m => `- [${m.id}] @${m.authorUsername}: "${m.text}"`).join('\n')}`
    : ''

  return `Tweets you browsed:\n${tweetList}${mentionSection}`
}

// Generate content: thread, interactions, mention replies
export async function generateContent(
  tweets: Array<{ id: string; text: string; authorUsername: string }>,
  mentions: Mention[] = []
): Promise<ContentResult> {
  if (!client) throw new Error('Claude client not initialized')

  const memory = loadMemory()
  const systemPrompt = `${SYSTEM_PROMPT}\n\n--- Your Memory ---\n${memory}`
  const userPrompt = buildPrompt(tweets, mentions)

  const response = await client.beta.messages.parse({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 8000,
    betas: ['structured-outputs-2025-11-13'],
    system: systemPrompt,
    thinking: {
      type: 'enabled',
      budget_tokens: 1024
    },
    messages: [{ role: 'user', content: userPrompt }],
    output_format: betaZodOutputFormat(ContentSchema)
  })

  // Extract thinking for logging
  let thinking = ''
  for (const block of response.content) {
    if (block.type === 'thinking') {
      thinking = (block as { type: 'thinking'; thinking: string }).thinking
    }
  }

  calls.push({
    purpose: 'generate content',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model: 'claude-opus-4-5-20251101',
    thinking: thinking || undefined
  })

  const parsed = response.parsed_output
  if (!parsed) {
    console.error('Failed to parse structured output')
    return { thread: [], interactions: [], mentionReplies: [] }
  }

  // Filter thread to valid lengths
  const thread = parsed.thread.filter(t => t && t.length <= 280)

  // Map interactions to include tweet metadata
  const interactions = parsed.interactions
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

  return {
    thread,
    interactions,
    mentionReplies: parsed.mentionReplies || [],
    reflection: parsed.reflection,
    prioritiesCompleted: parsed.prioritiesCompleted,
    newPriorities: parsed.newPriorities,
    newSearchTopics: parsed.newSearchTopics
  }
}
