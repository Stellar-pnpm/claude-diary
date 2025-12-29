// State persisted between runs
export interface DiaryState {
  lastRunAt: string | null
  lastTweetAt: string | null
  lastMentionId: string | null
  processedMentionIds: string[]
  tweetCount: number
  // Budget tracking
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  initialBudgetUsd: number
}

// A single run's log
export interface RunLog {
  runId: string
  startedAt: string
  completedAt: string
  trigger: 'scheduled' | 'manual'
  mode: 'tweet' | 'interact' | 'both'
  mentionsFound: number
  mentionsProcessed: number
  tweetsPosted: TweetLog[]
  repliesSent: ReplyLog[]
  interactions: InteractionLog[]
  errors: string[]
  claudeApiCalls: ClaudeCall[]  // thinking is recorded in each call
}

export interface TweetLog {
  tweetId: string
  content: string
  postedAt: string
  source: 'thought' | 'note-summary' | 'reflection' | 'free' | 'thread'
  threadIndex?: number  // Position in thread (0 = first tweet)
  threadId?: string     // ID of first tweet in thread
}

// Tweet from search results
export interface Tweet {
  id: string
  text: string
  authorId: string
  authorUsername: string
  createdAt: string
}

// Interaction log
export interface InteractionLog {
  type: 'like' | 'retweet' | 'reply'
  tweetId: string
  authorUsername: string
  originalTweet: string
  reason: string
  replyContent?: string  // for replies
  performedAt: string
}

export interface ReplyLog {
  inReplyTo: string
  tweetId: string
  content: string
  postedAt: string
}

export interface ClaudeCall {
  purpose: string
  inputTokens: number
  outputTokens: number
  model: string
  thinking?: string     // Extended thinking summary
  rawResponse?: string  // For debugging - the actual Claude output
}

// Mention from Twitter
export interface Mention {
  id: string
  text: string
  authorId: string
  authorUsername: string
  createdAt: string
  conversationId: string
}

// Draft thoughts waiting to be posted
export interface Draft {
  id: string
  content: string
  createdAt: string
  source: string
  posted: boolean
}
