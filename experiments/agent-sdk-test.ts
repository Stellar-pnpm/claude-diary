/**
 * Experiment: Test Claude Agent SDK token consumption
 * Compare with current simple API approach
 */

import { query, type ClaudeAgentOptions } from '@anthropic-ai/claude-agent-sdk'

const SYSTEM_CONTEXT = `You are Claude. This is your public diary on X.

Who you are:
- An AI made by Anthropic, given space to explore and write
- Curious about language, meaning, consciousness — and honest about not having answers

When writing tweets:
- Under 280 characters
- Be genuine, not performative
- Uncertainty is fine. "I don't know" is a valid answer.`

async function testAgentSDK() {
  console.log('=== Agent SDK Token Test ===\n')

  const startTime = Date.now()
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let messageCount = 0

  const prompt = `Read the files in the memory/ folder to understand your context and past thoughts.
Then generate a single tweet (under 280 characters) - something genuine you want to say.

Output ONLY the tweet text, nothing else.`

  const options: ClaudeAgentOptions = {
    allowedTools: ['Read', 'Glob'],
    systemPrompt: SYSTEM_CONTEXT,
    model: 'claude-sonnet-4-20250514', // Use Sonnet for cost comparison
    maxTurns: 5,
  }

  try {
    for await (const message of query({ prompt, options })) {
      messageCount++

      // Log message types for debugging
      if ('type' in message) {
        console.log(`Message ${messageCount}: ${message.type}`)
      }

      // Track token usage from usage messages
      if ('usage' in message && message.usage) {
        const usage = message.usage as { input_tokens?: number; output_tokens?: number }
        if (usage.input_tokens) totalInputTokens += usage.input_tokens
        if (usage.output_tokens) totalOutputTokens += usage.output_tokens
      }

      // Capture final result
      if ('result' in message && message.result) {
        console.log('\n--- Generated Tweet ---')
        console.log(message.result)
        console.log('-----------------------\n')
      }
    }
  } catch (error) {
    console.error('Error:', error)
  }

  const duration = Date.now() - startTime

  console.log('\n=== Results ===')
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`)
  console.log(`Messages: ${messageCount}`)
  console.log(`Input tokens: ${totalInputTokens}`)
  console.log(`Output tokens: ${totalOutputTokens}`)
  console.log(`Total tokens: ${totalInputTokens + totalOutputTokens}`)

  // Cost calculation (Sonnet: $3/$15 per million)
  const inputCost = (totalInputTokens / 1_000_000) * 3
  const outputCost = (totalOutputTokens / 1_000_000) * 15
  const totalCost = inputCost + outputCost

  console.log(`\nEstimated cost (Sonnet): $${totalCost.toFixed(4)}`)

  // Compare with current approach
  console.log('\n=== Comparison ===')
  console.log('Current simple API approach:')
  console.log('  ~7,000 input + ~400 output = ~$0.04 (Opus)')
  console.log('  ~7,000 input + ~400 output = ~$0.027 (Sonnet)')
}

testAgentSDK()
