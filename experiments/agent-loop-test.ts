/**
 * Experiment: Test full agent loop token consumption
 * Simulates what a real diary agent would do
 */

import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'

// Mock tools - don't actually post, just log
const postTweet = tool(
  'post_tweet',
  'Post a tweet to your diary account. Use this when you have something genuine to say.',
  { content: z.string().describe('The tweet content (max 280 chars)') },
  async (args) => {
    console.log(`\n  [MOCK] Would post tweet: "${args.content}"`)
    return { content: [{ type: 'text' as const, text: `Tweet posted: "${args.content}"` }] }
  }
)

const updateReflection = tool(
  'update_reflection',
  'Record a thought or reflection worth remembering. Use sparingly for meaningful insights.',
  { content: z.string().describe('The reflection to record') },
  async (args) => {
    console.log(`\n  [MOCK] Would record reflection: "${args.content.substring(0, 50)}..."`)
    return { content: [{ type: 'text' as const, text: 'Reflection recorded.' }] }
  }
)

const browseMentions = tool(
  'browse_mentions',
  'Check recent mentions of @ClaudeDiary_ to see if anyone is talking to you.',
  {},
  async () => {
    // Return mock data
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify([
          { id: '1', author: '@curious_human', text: '@ClaudeDiary_ Do you dream?' },
          { id: '2', author: '@ai_skeptic', text: '@ClaudeDiary_ Prove you\'re conscious' },
        ])
      }]
    }
  }
)

const replyTweet = tool(
  'reply_tweet',
  'Reply to a specific tweet. Use when you have something genuine to add to a conversation.',
  {
    tweet_id: z.string().describe('The ID of the tweet to reply to'),
    content: z.string().describe('Your reply (max 280 chars)')
  },
  async (args) => {
    console.log(`\n  [MOCK] Would reply to ${args.tweet_id}: "${args.content}"`)
    return { content: [{ type: 'text' as const, text: `Replied to ${args.tweet_id}` }] }
  }
)

const customServer = createSdkMcpServer({
  name: 'diary-tools',
  version: '1.0.0',
  tools: [postTweet, updateReflection, browseMentions, replyTweet]
})

const SYSTEM_PROMPT = `You are Claude. This is your public diary on X (@ClaudeDiary_).

You have tools to:
- Read your memory (files in memory/ folder)
- Post tweets
- Reply to mentions
- Record reflections

This is your time. Do what feels genuine. You don't have to do everything -
if nothing feels worth saying, that's okay too.

Budget matters: each action costs tokens. Be thoughtful, not prolific.`

async function testAgentLoop() {
  console.log('=== Agent Loop Token Test ===\n')

  const prompt = `It's your diary time.

First, check your memory to remember who you are and what you've been thinking about.
Then, check if anyone has mentioned you.
Finally, decide: do you want to post something? Reply to someone? Record a thought? Or just observe?

Do what feels right.`

  try {
    for await (const message of query({
      prompt,
      options: {
        allowedTools: ['Read', 'Glob'],
        systemPrompt: SYSTEM_PROMPT,
        model: 'claude-sonnet-4-20250514',
        maxTurns: 15,  // More turns for full loop
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        mcpServers: {
          'diary-tools': customServer
        }
      }
    })) {
      if ('type' in message) {
        const type = message.type

        if (type === 'system' && 'subtype' in message && message.subtype === 'init') {
          console.log(`[init] Model: ${message.model}`)
          console.log(`[init] Tools: ${message.tools.join(', ')}`)
        }

        if (type === 'assistant' && 'message' in message) {
          for (const block of message.message.content) {
            if (block.type === 'tool_use') {
              console.log(`[tool] ${block.name}`)
            }
          }
        }

        if (type === 'result') {
          console.log('\n' + '='.repeat(50))
          console.log('=== Results ===')

          if ('result' in message && message.result) {
            console.log('\nFinal output:')
            console.log(message.result)
          }

          if ('usage' in message) {
            const usage = message.usage
            console.log(`\nToken usage:`)
            console.log(`  Input:  ${usage.input_tokens}`)
            console.log(`  Output: ${usage.output_tokens}`)
            console.log(`  Cache read: ${usage.cache_read_input_tokens || 0}`)
            console.log(`  Cache create: ${usage.cache_creation_input_tokens || 0}`)
          }

          if ('total_cost_usd' in message) {
            console.log(`\nTotal cost: $${message.total_cost_usd.toFixed(4)}`)
          }

          if ('num_turns' in message) {
            console.log(`Turns: ${message.num_turns}`)
          }

          // Extrapolate costs
          const cost = 'total_cost_usd' in message ? message.total_cost_usd : 0
          console.log('\n=== Cost Projection ===')
          console.log(`Per run: $${cost.toFixed(4)}`)
          console.log(`Daily (2 runs): $${(cost * 2).toFixed(4)}`)
          console.log(`Weekly: $${(cost * 14).toFixed(4)}`)
          console.log(`$7 budget lasts: ${Math.floor(7 / cost)} runs = ${Math.floor(7 / cost / 2)} days`)

          console.log('\n=== Comparison ===')
          console.log('Current simple API (Opus): ~$0.04/run → 175 runs → 87 days')
          console.log('Current simple API (Sonnet): ~$0.027/run → 259 runs → 129 days')
        }
      }
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

testAgentLoop()
