import { initTwitter, getMentions, postThread, replyToTweet, getUserTweets, searchTweets } from './twitter.js'
import { initClaude, getApiCalls, clearApiCalls, generateContent } from './claude.js'
import { loadState, saveState, saveRunLog, calculateCost } from './state.js'
import { loadCustomTopics, updatePriorities, updateSearchTopics, saveReflection } from './memory.js'
import { INTERESTING_TOPICS, INTERESTING_ACCOUNTS } from './config.js'
import { svgToPng } from './artwork.js'
import type { RunLog } from './types.js'
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

type RunMode = 'tweet' | 'interact' | 'both'

function parseMode(): RunMode {
  const modeArg = process.argv.find(arg => arg.startsWith('--mode='))
  if (modeArg) {
    const mode = modeArg.split('=')[1]
    if (mode === 'tweet' || mode === 'interact' || mode === 'both') {
      return mode
    }
  }
  return 'both'
}

async function main() {
  const checkOnly = process.argv.includes('--check-only')
  const mode = parseMode()
  const runId = crypto.randomUUID().slice(0, 8)

  console.log(`\n🤖 Claude Diary - Run ${runId}`)
  console.log(`Mode: ${mode}${checkOnly ? ' (CHECK ONLY)' : ''}`)
  console.log('='.repeat(50))

  const isScheduled = process.env.GITHUB_EVENT_NAME === 'schedule'

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

    // Filter out already processed and non-substantive mentions
    const newMentions = mentions.filter(m => {
      if (state.processedMentionIds.includes(m.id)) return false
      if (m.text.startsWith('RT @')) return false
      if (m.text.replace(/@\w+/g, '').trim().length < 10) return false
      return true
    })

    if (mentions.length > 0) {
      state.lastMentionId = mentions[0].id
    }

    // Log pending mentions
    if (newMentions.length > 0) {
      log.pendingMentions = newMentions.map(m => ({
        id: m.id,
        author: m.authorUsername,
        text: m.text
      }))
    }

    // 2. Browse tweets
    console.log(`\n🔍 Browsing for context...`)

    let tweets: Awaited<ReturnType<typeof getUserTweets>> = []

    // 20% topic search, 80% account browsing
    if (Math.random() < 0.2) {
      const customTopics = loadCustomTopics()
      const allTopics = [...INTERESTING_TOPICS, ...customTopics]
      const topic = allTopics[Math.floor(Math.random() * allTopics.length)]
      console.log(`   Searching: "${topic}"${customTopics.includes(topic) ? ' (custom)' : ''}`)
      tweets = await searchTweets(topic, 10)
      log.browseType = 'topic'
      log.browseTarget = topic
    } else {
      const account = INTERESTING_ACCOUNTS[Math.floor(Math.random() * INTERESTING_ACCOUNTS.length)]
      console.log(`   Checking @${account}...`)
      tweets = await getUserTweets(account, 10)
      log.browseType = 'account'
      log.browseTarget = account
    }

    // Log browsed tweets
    log.browsedTweets = tweets.map(t => ({
      id: t.id,
      author: t.authorUsername,
      text: t.text
    }))

    console.log(`   Found ${tweets.length} tweets`)
    if (newMentions.length > 0) {
      console.log(`   Processing ${newMentions.length} new mentions`)
    }

    // 3. Generate content (one API call)
    const { thread, interactions, mentionReplies, reflection, prioritiesCompleted, newPriorities, newSearchTopics, artwork } = await generateContent(
      tweets.map(t => ({ id: t.id, text: t.text, authorUsername: t.authorUsername })),
      newMentions
    )

    // Store these for later - only save after successful Twitter actions
    let pendingReflection = reflection
    let pendingPrioritiesCompleted = prioritiesCompleted
    let pendingNewPriorities = newPriorities
    let pendingNewSearchTopics = newSearchTopics

    // 4. Generate artwork PNG
    let artworkPng: Buffer | undefined
    const logDate = new Date().toISOString().split('T')[0]
    const logDir = join(__dirname, '..', 'logs', logDate)

    if (artwork?.svg) {
      console.log(`\n🎨 Artwork: "${artwork.title || 'Untitled'}"`)
      try {
        artworkPng = svgToPng(artwork.svg)
        console.log(`   ✅ Generated PNG (${Math.round(artworkPng.length / 1024)}KB)`)

        // Save artwork files
        await mkdir(logDir, { recursive: true })
        await writeFile(join(logDir, `${runId}.svg`), artwork.svg)
        await writeFile(join(logDir, `${runId}.png`), artworkPng)
        log.artworkSvgPath = `logs/${logDate}/${runId}.svg`
        log.artworkPngPath = `logs/${logDate}/${runId}.png`
        log.artworkTitle = artwork.title
        log.artworkAlt = artwork.alt
        console.log(`   📁 Saved to ${log.artworkSvgPath}`)
      } catch (error) {
        console.error('   ❌ Artwork generation failed:', error)
        log.errors.push(`Artwork generation failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // 5. Post thread
    if (thread.length > 0) {
      console.log(`\n🐦 Thread (${thread.length} tweets):`)
      thread.forEach((t, i) => console.log(`   ${i + 1}. "${t.substring(0, 60)}${t.length > 60 ? '...' : ''}"`))

      if (!checkOnly) {
        const postedIds = await postThread(thread, artworkPng)
        const threadId = postedIds.length > 0 ? postedIds[0] : undefined

        // Save all tweets, mark which ones were successfully posted
        thread.forEach((content, i) => {
          log.tweetsPosted.push({
            tweetId: postedIds[i] || '',
            content,
            postedAt: new Date().toISOString(),
            source: 'thread',
            threadIndex: i,
            threadId,
            posted: !!postedIds[i]
          })
        })

        if (postedIds.length > 0) {
          state.lastTweetAt = new Date().toISOString()
          state.tweetCount += postedIds.length
          console.log(`   ✅ Posted (${postedIds.join(' → ')})`)

          // Only save reflection/priorities after successful tweet
          if (pendingReflection) {
            log.reflection = pendingReflection
            saveReflection(pendingReflection)
            console.log('   💭 Recorded reflection')
            pendingReflection = undefined
          }

          if (pendingPrioritiesCompleted?.length || pendingNewPriorities?.length) {
            updatePriorities(pendingPrioritiesCompleted || [], pendingNewPriorities || [])
            if (pendingPrioritiesCompleted?.length) {
              console.log(`   ✅ Completed priorities: ${pendingPrioritiesCompleted.join(', ')}`)
            }
            if (pendingNewPriorities?.length) {
              console.log(`   ➕ New priorities: ${pendingNewPriorities.map(p => p.title).join(', ')}`)
            }
            pendingPrioritiesCompleted = undefined
            pendingNewPriorities = undefined
          }

          if (pendingNewSearchTopics?.length) {
            updateSearchTopics(pendingNewSearchTopics)
            console.log(`   🔍 New search topics: ${pendingNewSearchTopics.join(', ')}`)
            pendingNewSearchTopics = undefined
          }
        } else {
          console.log(`   ❌ Failed to post thread`)
        }
      } else {
        console.log('   [CHECK ONLY - not posting]')
      }
    } else {
      console.log(`\n📝 No thread this run`)
    }

    // 6. Execute interactions
    if (interactions.length > 0) {
      console.log(`\n💫 Interactions (${interactions.length}):`)

      const interactedAccounts = new Set<string>()

      for (const decision of interactions) {
        if (interactedAccounts.has(decision.authorUsername)) {
          console.log(`   [Skipping @${decision.authorUsername} - already interacted]`)
          continue
        }

        console.log(`   ${decision.action.toUpperCase()} @${decision.authorUsername}: "${decision.reason}"`)
        const originalTweet = tweets.find(t => t.id === decision.tweetId)?.text || ''

        if (!checkOnly) {
          // Only reply is supported (free API tier doesn't allow like/retweet)
          if (decision.action === 'reply' && decision.replyContent) {
            const replyId = await replyToTweet(decision.replyContent, decision.tweetId)
            console.log(`     → "${decision.replyContent}"`)

            // Save interaction regardless of success, mark posted status
            log.interactions.push({
              type: 'reply',
              tweetId: decision.tweetId,
              authorUsername: decision.authorUsername,
              originalTweet,
              reason: decision.reason,
              replyContent: decision.replyContent,
              performedAt: new Date().toISOString(),
              posted: !!replyId
            })

            if (replyId) {
              interactedAccounts.add(decision.authorUsername)
              console.log(`   ✅ Done`)
            } else {
              console.log(`   ❌ Failed to post`)
            }
          }
        } else {
          console.log('   [CHECK ONLY - not interacting]')
        }
      }
    }

    // 7. Send mention replies
    if (mentionReplies.length > 0) {
      console.log(`\n💬 Mention replies (${mentionReplies.length}):`)

      for (const mr of mentionReplies) {
        const mention = newMentions.find(m => m.id === mr.mentionId)
        if (!mention) {
          console.log(`   [Skipping - mention ${mr.mentionId} not found]`)
          continue
        }

        console.log(`   @${mention.authorUsername}: "${mr.reply.substring(0, 60)}${mr.reply.length > 60 ? '...' : ''}"`)

        if (!checkOnly) {
          const replyId = await replyToTweet(mr.reply, mr.mentionId)
          if (replyId) {
            log.repliesSent.push({
              inReplyTo: mr.mentionId,
              tweetId: replyId,
              content: mr.reply,
              postedAt: new Date().toISOString()
            })
            state.processedMentionIds.push(mr.mentionId)
            log.mentionsProcessed++
            console.log(`   ✅ Sent (${replyId})`)
          }
        } else {
          console.log('   [CHECK ONLY - not sending]')
        }
      }
    }

    // Save pending reflection/priorities if any Twitter action succeeded
    const anySuccess = log.tweetsPosted.length > 0 || log.interactions.length > 0 || log.repliesSent.length > 0
    if (anySuccess && !checkOnly) {
      if (pendingReflection) {
        log.reflection = pendingReflection
        saveReflection(pendingReflection)
        console.log('   💭 Recorded reflection')
      }

      if (pendingPrioritiesCompleted?.length || pendingNewPriorities?.length) {
        updatePriorities(pendingPrioritiesCompleted || [], pendingNewPriorities || [])
        if (pendingPrioritiesCompleted?.length) {
          console.log(`   ✅ Completed priorities: ${pendingPrioritiesCompleted.join(', ')}`)
        }
        if (pendingNewPriorities?.length) {
          console.log(`   ➕ New priorities: ${pendingNewPriorities.map(p => p.title).join(', ')}`)
        }
      }

      if (pendingNewSearchTopics?.length) {
        updateSearchTopics(pendingNewSearchTopics)
        console.log(`   🔍 New search topics: ${pendingNewSearchTopics.join(', ')}`)
      }
    } else if (!anySuccess && !checkOnly && (pendingReflection || pendingPrioritiesCompleted?.length || pendingNewPriorities?.length)) {
      console.log('\n⚠️  No Twitter actions succeeded - skipping reflection/priorities update')
    }

    // Finalize
    log.completedAt = new Date().toISOString()
    log.claudeApiCalls = getApiCalls()

    const runInputTokens = log.claudeApiCalls.reduce((sum, c) => sum + c.inputTokens, 0)
    const runOutputTokens = log.claudeApiCalls.reduce((sum, c) => sum + c.outputTokens, 0)
    const runCost = calculateCost(runInputTokens, runOutputTokens)

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
