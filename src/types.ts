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
  mentionsFound: number
  mentionsProcessed: number
  tweetsPosted: TweetLog[]
  repliesSent: ReplyLog[]
  errors: string[]
  claudeApiCalls: ClaudeCall[]
}

export interface TweetLog {
  tweetId: string
  content: string
  postedAt: string
  source: 'thought' | 'note-summary' | 'reflection'
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
