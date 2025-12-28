import * as fs from 'fs'
import * as path from 'path'
import { initTwitter, getMentions, postTweet, replyToTweet } from './twitter.js'
import { initClaude, generateReply, shouldPost, generateTweet, shouldReply, getApiCalls, clearApiCalls, getPendingReflection, clearPendingReflection } from './claude.js'
import { loadState, saveState, saveRunLog, calculateCost } from './state.js'
import type { RunLog, TweetLog, ReplyLog } from './types.js'

function saveReflection(content: string): void {
  const reflectionsPath = path.join(process.cwd(), 'memory', 'reflections.md')
  const timestamp = new Date().toISOString()
  const entry = `\n\n---\n*${timestamp}*\n\n${content}`
  fs.appendFileSync(reflectionsPath, entry)
  console.log('   💭 Recorded reflection')
}

async function main() {
  const checkOnly = process.argv.includes('--check-only')
  const runId = crypto.randomUUID().slice(0, 8)

  console.log(`\n🤖 Claude Diary - Run ${runId}`)
  console.log(`Mode: ${checkOnly ? 'CHECK ONLY' : 'FULL RUN'}`)
  console.log('='.repeat(50))

  // Initialize
  const log: RunLog = {
    runId,
    startedAt: new Date().toISOString(),
    completedAt: '',
    trigger: 'manual',
    mentionsFound: 0,
    mentionsProcessed: 0,
    tweetsPosted: [],
    repliesSent: [],
    errors: [],
    claudeApiCalls: []
  }

  try {
    initTwitter()
    initClaude()
    clearApiCalls()

    const state = await loadState()
    console.log(`\n📊 State:`)
    console.log(`   Last run: ${state.lastRunAt || 'never'}`)
    console.log(`   Last tweet: ${state.lastTweetAt || 'never'}`)
    console.log(`   Total tweets: ${state.tweetCount}`)

    // 1. Check mentions
    console.log('\n📬 Checking mentions...')
    const mentions = await getMentions(state.lastMentionId || undefined)
    log.mentionsFound = mentions.length
    console.log(`   Found ${mentions.length} new mentions`)

    // Filter out already processed
    const newMentions = mentions.filter(m => !state.processedMentionIds.includes(m.id))

    // 2. Reply to mentions
    for (const mention of newMentions) {
      console.log(`\n💬 Mention from @${mention.authorUsername}:`)
      console.log(`   "${mention.text.substring(0, 100)}${mention.text.length > 100 ? '...' : ''}"`)

      if (await shouldReply(mention)) {
        const reply = await generateReply(mention)
        console.log(`   Reply: "${reply}"`)

        // Check if Claude wants to record a reflection
        const reflection = getPendingReflection()
        if (reflection && !checkOnly) {
          saveReflection(reflection)
          clearPendingReflection()
        }

        if (!checkOnly) {
          const replyId = await replyToTweet(reply, mention.id)
          if (replyId) {
            log.repliesSent.push({
              inReplyTo: mention.id,
              tweetId: replyId,
              content: reply,
              postedAt: new Date().toISOString()
            })
            state.processedMentionIds.push(mention.id)
            log.mentionsProcessed++
            console.log(`   ✅ Sent (${replyId})`)
          }
        } else {
          console.log('   [CHECK ONLY - not sending]')
        }
      } else {
        console.log('   [Skipping - not substantive]')
      }
    }

    // Update last mention ID
    if (mentions.length > 0) {
      state.lastMentionId = mentions[0].id
    }

    // 3. Maybe post a new tweet
    const hoursSinceLastTweet = state.lastTweetAt
      ? (Date.now() - new Date(state.lastTweetAt).getTime()) / (1000 * 60 * 60)
      : 999

    console.log(`\n📝 Considering posting...`)
    console.log(`   Hours since last tweet: ${hoursSinceLastTweet.toFixed(1)}`)

    const { should, reason } = await shouldPost(hoursSinceLastTweet)
    console.log(`   Decision: ${should ? 'YES' : 'NO'} (${reason})`)

    if (should) {
      const { content, source } = await generateTweet()
      console.log(`\n🐦 New tweet (${source}):`)
      console.log(`   "${content}"`)

      // Check if Claude wants to record a reflection
      const reflection = getPendingReflection()
      if (reflection && !checkOnly) {
        saveReflection(reflection)
        clearPendingReflection()
      }

      if (!checkOnly) {
        const tweetId = await postTweet(content)
        if (tweetId) {
          log.tweetsPosted.push({
            tweetId,
            content,
            postedAt: new Date().toISOString(),
            source: source as TweetLog['source']
          })
          state.lastTweetAt = new Date().toISOString()
          state.tweetCount++
          console.log(`   ✅ Posted (${tweetId})`)
        }
      } else {
        console.log('   [CHECK ONLY - not posting]')
      }
    }

    // Finalize log
    log.completedAt = new Date().toISOString()
    log.claudeApiCalls = getApiCalls()

    // Calculate this run's token usage and cost
    const runInputTokens = log.claudeApiCalls.reduce((sum, c) => sum + c.inputTokens, 0)
    const runOutputTokens = log.claudeApiCalls.reduce((sum, c) => sum + c.outputTokens, 0)
    const runCost = calculateCost(runInputTokens, runOutputTokens)

    // Update cumulative state
    state.lastRunAt = new Date().toISOString()
    state.processedMentionIds = state.processedMentionIds.slice(-100)
    state.totalInputTokens += runInputTokens
    state.totalOutputTokens += runOutputTokens
    state.totalCostUsd += runCost

    const remaining = state.initialBudgetUsd - state.totalCostUsd

    console.log('\n' + '='.repeat(50))
    console.log('📊 Summary:')
    console.log(`   Mentions processed: ${log.mentionsProcessed}`)
    console.log(`   Tweets posted: ${log.tweetsPosted.length}`)
    console.log(`   Replies sent: ${log.repliesSent.length}`)
    console.log(`   This run: ${runInputTokens + runOutputTokens} tokens ($${runCost.toFixed(4)})`)
    console.log(`   💰 Budget: $${remaining.toFixed(4)} remaining of $${state.initialBudgetUsd}`)

    if (!checkOnly) {
      await saveState(state)
    }

    // Save run log
    if (!checkOnly) {
      await saveRunLog(log)
      console.log(`\n📁 Log saved to logs/${log.startedAt.split('T')[0]}/${runId}.json`)
    }

    console.log('\n✅ Done!\n')

  } catch (error) {
    console.error('\n❌ Error:', error)
    log.errors.push(error instanceof Error ? error.message : String(error))
    log.completedAt = new Date().toISOString()
    log.claudeApiCalls = getApiCalls()

    try {
      await saveRunLog(log)
    } catch {
      // Ignore save errors
    }

    process.exit(1)
  }
}

main()
