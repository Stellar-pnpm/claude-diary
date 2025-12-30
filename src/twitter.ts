import { TwitterApi } from 'twitter-api-v2'
import type { Mention, Tweet } from './types.js'
import { getMentionsNitter, searchTweetsNitter, getUserTweetsNitter } from './nitter.js'

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
    // Free tier doesn't have read access, or rate limited
    const apiError = error as { code?: number }
    if (apiError.code === 401 || apiError.code === 403) {
      console.log('   ⚠️  No read access (free tier)')
    } else if (apiError.code === 429) {
      console.log('   ⚠️  Rate limited (429)')
    } else {
      console.error('Error fetching mentions:', error)
    }

    // Try Nitter fallback
    console.log('   🔄 Trying Nitter fallback for mentions...')
    return await getMentionsNitter('ClaudeDiary_')
  }
}

export async function postTweet(text: string, mediaId?: string): Promise<string | null> {
  if (!client) throw new Error('Twitter client not initialized')

  try {
    const result = await client.v2.tweet(text, {
      media: mediaId ? { media_ids: [mediaId] } : undefined
    })
    return result.data.id
  } catch (error) {
    console.error('Error posting tweet:', error)
    return null
  }
}

// Upload image and return media_id
export async function uploadMedia(imageBuffer: Buffer): Promise<string | null> {
  if (!client) throw new Error('Twitter client not initialized')

  try {
    // Use v1 API for media upload (more stable, widely supported)
    const mediaId = await client.v1.uploadMedia(imageBuffer, { mimeType: 'image/png' })
    return mediaId
  } catch (error) {
    console.error('Error uploading media:', error)
    return null
  }
}

export async function postThread(tweets: string[], imageBuffer?: Buffer): Promise<string[]> {
  if (!client) throw new Error('Twitter client not initialized')
  if (tweets.length === 0) return []

  const postedIds: string[] = []

  try {
    // Upload image if provided
    let mediaId: string | undefined
    if (imageBuffer) {
      const uploadedId = await uploadMedia(imageBuffer)
      if (uploadedId) {
        mediaId = uploadedId
        console.log('   📷 Media uploaded:', mediaId)
      } else {
        console.log('   ⚠️  Media upload failed, posting without image')
      }
    }

    // First tweet (with optional image)
    const firstId = await postTweet(tweets[0], mediaId)
    if (!firstId) return []
    postedIds.push(firstId)

    // Subsequent tweets as replies
    let previousId = firstId
    for (let i = 1; i < tweets.length; i++) {
      const replyId = await replyToTweet(tweets[i], previousId)
      if (!replyId) break
      postedIds.push(replyId)
      previousId = replyId
    }

    return postedIds
  } catch (error) {
    console.error('Error posting thread:', error)
    return postedIds
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

// Search recent tweets (free tier: 100/month)
export async function searchTweets(query: string, maxResults = 10): Promise<Tweet[]> {
  if (!client) throw new Error('Twitter client not initialized')

  try {
    const result = await client.v2.search(query, {
      'tweet.fields': ['created_at', 'author_id'],
      'user.fields': ['username'],
      expansions: ['author_id'],
      max_results: Math.min(maxResults, 100)
    })

    const users = new Map<string, string>()
    if (result.includes?.users) {
      for (const user of result.includes.users) {
        users.set(user.id, user.username)
      }
    }

    const tweets: Tweet[] = []
    // result is a paginator, iterate over it
    for await (const tweet of result) {
      tweets.push({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id || '',
        authorUsername: users.get(tweet.author_id || '') || 'unknown',
        createdAt: tweet.created_at || new Date().toISOString()
      })
      if (tweets.length >= maxResults) break
    }

    return tweets
  } catch (error: unknown) {
    const apiError = error as { code?: number }
    if (apiError.code === 401 || apiError.code === 403) {
      console.log('   ⚠️  Search not available')
    } else if (apiError.code === 429) {
      console.log('   ⚠️  Rate limited (429)')
    } else {
      console.error('Error searching tweets:', error)
    }

    // Try Nitter fallback
    console.log('   🔄 Trying Nitter fallback for search...')
    return await searchTweetsNitter(query, maxResults)
  }
}

// Get tweets from a specific user
export async function getUserTweets(username: string, maxResults = 5): Promise<Tweet[]> {
  if (!client) throw new Error('Twitter client not initialized')

  try {
    // First get user ID
    const user = await client.v2.userByUsername(username)
    if (!user.data) return []

    const result = await client.v2.userTimeline(user.data.id, {
      'tweet.fields': ['created_at'],
      max_results: Math.min(maxResults, 100),
      exclude: ['retweets', 'replies']
    })

    const tweets: Tweet[] = []
    for (const tweet of result.data?.data || []) {
      tweets.push({
        id: tweet.id,
        text: tweet.text,
        authorId: user.data.id,
        authorUsername: username,
        createdAt: tweet.created_at || new Date().toISOString()
      })
    }

    return tweets
  } catch (error: unknown) {
    const apiError = error as { code?: number }
    if (apiError.code === 401 || apiError.code === 403) {
      console.log(`   ⚠️  Cannot access @${username}'s tweets`)
    } else if (apiError.code === 429) {
      console.log('   ⚠️  Rate limited (429)')
    } else {
      console.error('Error getting user tweets:', error)
    }

    // Try Nitter fallback
    console.log('   🔄 Trying Nitter fallback for user tweets...')
    return await getUserTweetsNitter(username, maxResults)
  }
}

// Like a tweet (free tier: counts toward 500 writes/month)
export async function likeTweet(tweetId: string): Promise<boolean> {
  if (!client) throw new Error('Twitter client not initialized')

  try {
    const userId = await getMyUserId()
    await client.v2.like(userId, tweetId)
    return true
  } catch (error) {
    console.error('Error liking tweet:', error)
    return false
  }
}

// Retweet (free tier: counts toward 500 writes/month)
export async function retweet(tweetId: string): Promise<boolean> {
  if (!client) throw new Error('Twitter client not initialized')

  try {
    const userId = await getMyUserId()
    await client.v2.retweet(userId, tweetId)
    return true
  } catch (error) {
    console.error('Error retweeting:', error)
    return false
  }
}
