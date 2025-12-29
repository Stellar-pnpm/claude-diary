import * as fs from 'fs'
import * as path from 'path'
import { initTwitter, getMentions, postTweet, postThread, replyToTweet, getUserTweets, likeTweet, retweet, searchTweets } from './twitter.js'
import { initClaude, generateReply, shouldReply, getApiCalls, clearApiCalls, getPendingReflection, clearPendingReflection, generateContent, updatePriorities } from './claude.js'
import { loadState, saveState, saveRunLog, calculateCost } from './state.js'
import type { RunLog, TweetLog, ReplyLog, InteractionLog } from './types.js'

// Topics Claude is interested in (for search-based discovery)
// Based on Grok analysis: only active topics with quality discussions
const INTERESTING_TOPICS = [
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

// People Claude finds interesting (for direct timeline browsing)
// Handles verified via Grok 2025-12-28
const INTERESTING_ACCOUNTS = [
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
]

function saveReflection(content: string): void {
  const reflectionsPath = path.join(process.cwd(), 'memory', 'reflections.md')
  const timestamp = new Date().toISOString()
  const entry = `\n\n---\n*${timestamp}*\n\n${content}`
  fs.appendFileSync(reflectionsPath, entry)
  console.log('   💭 Recorded reflection')
}

type RunMode = 'tweet' | 'interact' | 'both'

function parseMode(): RunMode {
  const modeArg = process.argv.find(arg => arg.startsWith('--mode='))
  if (modeArg) {
    const mode = modeArg.split('=')[1]
    if (mode === 'tweet' || mode === 'interact' || mode === 'both') {
      return mode
    }
  }
  return 'both' // default - unified flow
}

async function main() {
  const checkOnly = process.argv.includes('--check-only')
  const mode = parseMode()
  const runId = crypto.randomUUID().slice(0, 8)

  console.log(`\n🤖 Claude Diary - Run ${runId}`)
  console.log(`Mode: ${mode}${checkOnly ? ' (CHECK ONLY)' : ''}`)
  console.log('='.repeat(50))

  // Detect trigger type from GitHub Actions environment
  const isScheduled = process.env.GITHUB_EVENT_NAME === 'schedule'

  // Initialize
  const log: RunLog = {
    runId,
    startedAt: new Date().toISOString(),
    completedAt: '',
    trigger: isScheduled ? 'scheduled' : 'manual',
    mode,
    mentionsFound: 0,
    mentionsProcessed: 0,
    tweetsPosted: [],
    repliesSent: [],
    interactions: [],
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

    // 3. Browse tweets and generate content (unified flow)
    console.log(`\n🔍 Browsing for context...`)

    let tweets: Awaited<ReturnType<typeof getUserTweets>> = []

    // 20% topic search, 80% account browsing (X topic quality is low)
    if (Math.random() < 0.2) {
      const topic = INTERESTING_TOPICS[Math.floor(Math.random() * INTERESTING_TOPICS.length)]
      console.log(`   Searching: "${topic}"`)
      tweets = await searchTweets(topic, 10)
    } else {
      const account = INTERESTING_ACCOUNTS[Math.floor(Math.random() * INTERESTING_ACCOUNTS.length)]
      console.log(`   Checking @${account}...`)
      tweets = await getUserTweets(account, 10)
    }

    console.log(`   Found ${tweets.length} tweets`)

    // One API call: generate thread + decide interactions
    const { thread, thinkingThread, interactions, reflection, prioritiesCompleted, newPriorities } = await generateContent(
      tweets.map(t => ({ id: t.id, text: t.text, authorUsername: t.authorUsername }))
    )

    // Save reflection if present
    if (reflection && !checkOnly) {
      saveReflection(reflection)
    }

    // Update priorities if any changes
    if (!checkOnly && (prioritiesCompleted?.length || newPriorities?.length)) {
      updatePriorities(prioritiesCompleted || [], newPriorities || [])
      if (prioritiesCompleted?.length) {
        console.log(`   ✅ Completed priorities: ${prioritiesCompleted.join(', ')}`)
      }
      if (newPriorities?.length) {
        console.log(`   ➕ New priorities: ${newPriorities.map(p => p.title).join(', ')}`)
      }
    }

    // Only post the thread, not thinking (thinking stays in logs)
    const fullThread = thread

    // 4. Post thread if any
    if (fullThread.length > 0) {
      console.log(`\n🐦 Thread (${thread.length} tweets):`)
      fullThread.forEach((t, i) => console.log(`   ${i + 1}. "${t.substring(0, 60)}${t.length > 60 ? '...' : ''}"`))

      if (!checkOnly) {
        const postedIds = await postThread(fullThread)
        if (postedIds.length > 0) {
          const threadId = postedIds[0]
          fullThread.forEach((content, i) => {
            if (postedIds[i]) {
              log.tweetsPosted.push({
                tweetId: postedIds[i],
                content,
                postedAt: new Date().toISOString(),
                source: 'thread',
                threadIndex: i,
                threadId
              })
            }
          })
          state.lastTweetAt = new Date().toISOString()
          state.tweetCount += postedIds.length
          console.log(`   ✅ Posted (${postedIds.join(' → ')})`)
        }
      } else {
        console.log('   [CHECK ONLY - not posting]')
      }
    } else {
      console.log(`\n📝 No thread this run`)
    }

    // 5. Execute interactions
    if (interactions.length > 0) {
      console.log(`\n💫 Interactions (${interactions.length}):`)

      const interactedAccounts = new Set<string>()

      for (const decision of interactions) {
        if (interactedAccounts.has(decision.authorUsername)) {
          console.log(`   [Skipping @${decision.authorUsername} - already interacted]`)
          continue
        }

        console.log(`   ${decision.action.toUpperCase()} @${decision.authorUsername}: "${decision.reason}"`)

        if (!checkOnly) {
          let success = false

          if (decision.action === 'like') {
            success = await likeTweet(decision.tweetId)
          } else if (decision.action === 'retweet') {
            success = await retweet(decision.tweetId)
          } else if (decision.action === 'reply' && decision.replyContent) {
            const replyId = await replyToTweet(decision.replyContent, decision.tweetId)
            success = !!replyId
            if (success) {
              console.log(`     → "${decision.replyContent}"`)
            }
          }

          if (success) {
            const originalTweet = tweets.find(t => t.id === decision.tweetId)?.text || ''
            log.interactions.push({
              type: decision.action as 'like' | 'retweet' | 'reply',
              tweetId: decision.tweetId,
              authorUsername: decision.authorUsername,
              originalTweet,
              reason: decision.reason,
              replyContent: decision.replyContent,
              performedAt: new Date().toISOString()
            })
            interactedAccounts.add(decision.authorUsername)
            console.log(`   ✅ Done`)
          }
        } else {
          console.log('   [CHECK ONLY - not interacting]')
        }
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
    console.log(`   Mode: ${mode}`)
    console.log(`   Mentions processed: ${log.mentionsProcessed}`)
    console.log(`   Tweets posted: ${log.tweetsPosted.length}`)
    console.log(`   Replies sent: ${log.repliesSent.length}`)
    console.log(`   Interactions: ${log.interactions.length}`)
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
