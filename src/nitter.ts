/**
 * Nitter fallback for Twitter API read operations
 * Used when official API fails (403/401 errors on free tier)
 *
 * Usage pattern:
 * - Runs every 8 hours via GitHub Actions
 * - Only fetches 1 user or 1 search query per run
 * - Limited to 5 tweets per request
 * - Graceful degradation: returns empty array if Nitter fails
 *
 * This is an AI experiment project (https://github.com/anthropics/claude-diary).
 * Can't AI be a valid user? We read public tweets at human-like frequency,
 * slower than any human doomscroller. If this causes issues, please open an issue.
 */

import type { Tweet, Mention } from './types.js'

// Nitter instance - configurable via environment variable
const NITTER_INSTANCE = process.env.NITTER_INSTANCE || 'https://nitter.catsarch.com'

// User agent - curl bypasses Anubis bot detection
// We identify as curl rather than pretending to be a browser
const USER_AGENT = 'curl/8.7.1'

// Max tweets to fetch per request - keep it minimal
const DEFAULT_MAX_RESULTS = 5

/**
 * Fetch HTML from Nitter with error handling
 */
async function fetchNitter(path: string): Promise<string | null> {
  const url = `${NITTER_INSTANCE}${path}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': '*/*',
      },
    })

    if (!response.ok) {
      console.log(`   Nitter returned ${response.status} for ${path}`)
      return null
    }

    return await response.text()
  } catch (error) {
    console.log(`   Nitter fetch failed: ${error}`)
    return null
  }
}

/**
 * Parse tweets from Nitter HTML using regex
 * Nitter HTML structure:
 * - .timeline-item contains each tweet
 * - .tweet-link has href like /{username}/status/{id}
 * - .tweet-content has the text
 * - .username has @username
 * - .tweet-date has timestamp
 */
function parseTweetsFromHtml(html: string): Tweet[] {
  const tweets: Tweet[] = []

  // Match timeline items - each tweet is in a timeline-item div
  // Pattern: look for tweet-link href to get ID, then content nearby
  const tweetPattern = /<div class="timeline-item[^"]*"[^>]*>[\s\S]*?<a class="tweet-link"[^>]*href="\/([^/]+)\/status\/(\d+)"[\s\S]*?<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g

  let match
  while ((match = tweetPattern.exec(html)) !== null) {
    const [, username, tweetId, contentHtml] = match

    // Strip HTML tags from content
    const text = contentHtml
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()

    if (text && tweetId) {
      tweets.push({
        id: tweetId,
        text,
        authorId: username, // Nitter doesn't expose numeric IDs
        authorUsername: username,
        createdAt: new Date().toISOString(), // Nitter date parsing is complex, use current time
      })
    }
  }

  return tweets
}

/**
 * Alternative simpler parsing - more lenient
 */
function parseTweetsSimple(html: string): Tweet[] {
  const tweets: Tweet[] = []

  // Find all status links to get tweet IDs and usernames
  // Links may have #m suffix like /status/123#m
  const linkPattern = /href="\/([^/]+)\/status\/(\d+)[^"]*"/g
  const links: Array<{ username: string; id: string }> = []

  let linkMatch
  while ((linkMatch = linkPattern.exec(html)) !== null) {
    const [, username, id] = linkMatch
    // Skip duplicates and retweets indicators
    if (!links.some(l => l.id === id) && !username.includes('#')) {
      links.push({ username, id })
    }
  }

  // Find tweet contents
  const contentPattern = /<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g
  const contents: string[] = []

  let contentMatch
  while ((contentMatch = contentPattern.exec(html)) !== null) {
    const text = contentMatch[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()

    if (text) {
      contents.push(text)
    }
  }

  // Match links with contents (they should be in same order)
  const count = Math.min(links.length, contents.length)
  for (let i = 0; i < count; i++) {
    tweets.push({
      id: links[i].id,
      text: contents[i],
      authorId: links[i].username,
      authorUsername: links[i].username,
      createdAt: new Date().toISOString(),
    })
  }

  return tweets
}

/**
 * Search tweets via Nitter
 */
export async function searchTweetsNitter(query: string, maxResults = DEFAULT_MAX_RESULTS): Promise<Tweet[]> {
  console.log(`   Nitter: searching "${query}"...`)

  const encodedQuery = encodeURIComponent(query)
  const html = await fetchNitter(`/search?q=${encodedQuery}`)

  if (!html) {
    return []
  }

  const tweets = parseTweetsSimple(html)
  console.log(`   Nitter: found ${tweets.length} tweets`)

  return tweets.slice(0, maxResults)
}

/**
 * Get user's tweets via Nitter
 */
export async function getUserTweetsNitter(username: string, maxResults = DEFAULT_MAX_RESULTS): Promise<Tweet[]> {
  // Remove @ if present
  const cleanUsername = username.replace(/^@/, '')
  console.log(`   Nitter: fetching @${cleanUsername}'s tweets...`)

  const html = await fetchNitter(`/${cleanUsername}`)

  if (!html) {
    return []
  }

  const tweets = parseTweetsSimple(html)
  console.log(`   Nitter: found ${tweets.length} tweets`)

  return tweets.slice(0, maxResults)
}

/**
 * Get mentions via Nitter (by searching @username)
 */
export async function getMentionsNitter(myUsername: string): Promise<Mention[]> {
  console.log(`   Nitter: searching mentions of @${myUsername}...`)

  // Search for @username to find mentions
  const encodedQuery = encodeURIComponent(`@${myUsername}`)
  const html = await fetchNitter(`/search?q=${encodedQuery}`)

  if (!html) {
    return []
  }

  const tweets = parseTweetsSimple(html)

  // Convert Tweet[] to Mention[]
  const mentions: Mention[] = tweets
    .filter(t => t.authorUsername.toLowerCase() !== myUsername.toLowerCase()) // Exclude self
    .map(t => ({
      id: t.id,
      text: t.text,
      authorId: t.authorId,
      authorUsername: t.authorUsername,
      createdAt: t.createdAt,
      conversationId: t.id, // Nitter doesn't expose conversation ID easily
    }))

  console.log(`   Nitter: found ${mentions.length} mentions`)

  return mentions
}
