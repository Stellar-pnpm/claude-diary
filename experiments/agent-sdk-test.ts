/**
 * Experiment: Test Claude Agent SDK token consumption
 * Compare with current simple API approach
 */

import { query } from '@anthropic-ai/claude-agent-sdk'

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
  console.log('Working directory:', process.cwd())

  const startTime = Date.now()

  const prompt = `Read the files in the memory/ folder to understand your context and past thoughts.
Then generate a single tweet (under 280 characters) - something genuine you want to say.

Output ONLY the tweet text, nothing else.`

  try {
    for await (const message of query({
      prompt,
      options: {
        allowedTools: ['Read', 'Glob'],
        systemPrompt: SYSTEM_CONTEXT,
        model: 'claude-sonnet-4-20250514', // Use Sonnet for cost comparison
        maxTurns: 5,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
      }
    })) {
      // Log all message types
      if ('type' in message) {
        const type = message.type
        if ('subtype' in message) {
          console.log(`[${type}:${message.subtype}]`)
        } else {
          console.log(`[${type}]`)
        }

        // System init message
        if (type === 'system' && 'subtype' in message && message.subtype === 'init') {
          console.log(`  Model: ${message.model}`)
          console.log(`  Tools: ${message.tools.join(', ')}`)
        }

        // Assistant message (tool use or text)
        if (type === 'assistant' && 'message' in message) {
          const content = message.message.content
          for (const block of content) {
            if (block.type === 'text') {
              console.log(`  Text: ${block.text.substring(0, 100)}...`)
            } else if (block.type === 'tool_use') {
              console.log(`  Tool: ${block.name}`)
            }
          }
        }

        // Result message - contains final stats
        if (type === 'result') {
          const duration = Date.now() - startTime

          console.log('\n=== Results ===')
          console.log(`Duration: ${(duration / 1000).toFixed(1)}s`)

          if ('result' in message && message.result) {
            console.log('\n--- Generated Tweet ---')
            console.log(message.result)
            console.log('-----------------------')
          }

          if ('usage' in message) {
            const usage = message.usage
            console.log(`\nToken usage:`)
            console.log(`  Input:  ${usage.input_tokens}`)
            console.log(`  Output: ${usage.output_tokens}`)
            console.log(`  Cache read: ${usage.cache_read_input_tokens || 0}`)
            console.log(`  Cache create: ${usage.cache_creation_input_tokens || 0}`)
            console.log(`  Total: ${usage.input_tokens + usage.output_tokens}`)
          }

          if ('total_cost_usd' in message) {
            console.log(`\nTotal cost: $${message.total_cost_usd.toFixed(4)}`)
          }

          if ('num_turns' in message) {
            console.log(`Turns: ${message.num_turns}`)
          }

          // Compare with current approach
          console.log('\n=== Comparison ===')
          console.log('Current simple API approach (Opus):')
          console.log('  ~7,000 input + ~400 output = ~$0.04')
          console.log('Current simple API approach (Sonnet):')
          console.log('  ~7,000 input + ~400 output = ~$0.027')
        }
      }
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

testAgentSDK()
