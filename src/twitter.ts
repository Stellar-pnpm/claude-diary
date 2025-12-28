import { TwitterApi } from 'twitter-api-v2'
import type { Mention } from './types.js'

let client: TwitterApi | null = null

export function initTwitter() {
  const apiKey = process.env.TWITTER_API_KEY
  const apiSecret = process.env.TWITTER_API_SECRET
  const accessToken = process.env.TWITTER_ACCESS_TOKEN
  const accessSecret = process.env.TWITTER_ACCESS_SECRET

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('Twitter API credentials not configured')
  }

  client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken: accessToken,
    accessSecret: accessSecret,
  })

  return client
}

export async function getMyUserId(): Promise<string> {
  if (!client) throw new Error('Twitter client not initialized')
  const me = await client.v2.me()
  return me.data.id
}

export async function getMentions(sinceId?: string): Promise<Mention[]> {
  if (!client) throw new Error('Twitter client not initialized')

  try {
    const userId = await getMyUserId()

    const options: Record<string, unknown> = {
      'tweet.fields': ['created_at', 'conversation_id', 'author_id'],
      'user.fields': ['username'],
      expansions: ['author_id'],
      max_results: 20
    }

    if (sinceId) {
      options.since_id = sinceId
    }

    const mentions = await client.v2.userMentionTimeline(userId, options)

    const users = new Map<string, string>()
    if (mentions.includes?.users) {
      for (const user of mentions.includes.users) {
        users.set(user.id, user.username)
      }
    }

    const result: Mention[] = []
    for (const tweet of mentions.data?.data || []) {
      result.push({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id || '',
        authorUsername: users.get(tweet.author_id || '') || 'unknown',
        createdAt: tweet.created_at || new Date().toISOString(),
        conversationId: tweet.conversation_id || tweet.id
      })
    }

    return result
  } catch (error: unknown) {
    // Free tier doesn't have read access - this is expected
    const apiError = error as { code?: number }
    if (apiError.code === 401 || apiError.code === 403) {
      console.log('   ⚠️  No read access (free tier)')
    } else {
      console.error('Error fetching mentions:', error)
    }
    return []
  }
}

export async function postTweet(text: string): Promise<string | null> {
  if (!client) throw new Error('Twitter client not initialized')

  try {
    const result = await client.v2.tweet(text)
    return result.data.id
  } catch (error) {
    console.error('Error posting tweet:', error)
    return null
  }
}

export async function replyToTweet(text: string, replyToId: string): Promise<string | null> {
  if (!client) throw new Error('Twitter client not initialized')

  try {
    const result = await client.v2.tweet(text, {
      reply: { in_reply_to_tweet_id: replyToId }
    })
    return result.data.id
  } catch (error) {
    console.error('Error replying to tweet:', error)
    return null
  }
}
