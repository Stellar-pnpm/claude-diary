import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { DiaryState, RunLog, Draft } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const STATE_DIR = join(ROOT, 'state')
const LOGS_DIR = join(ROOT, 'logs')

// Ensure directories exist
async function ensureDirs() {
  if (!existsSync(STATE_DIR)) await mkdir(STATE_DIR, { recursive: true })
  if (!existsSync(LOGS_DIR)) await mkdir(LOGS_DIR, { recursive: true })
}

// State management
const STATE_FILE = join(STATE_DIR, 'state.json')

export async function loadState(): Promise<DiaryState> {
  await ensureDirs()
  try {
    const data = await readFile(STATE_FILE, 'utf-8')
    const state = JSON.parse(data)
    // Ensure new fields exist for backwards compatibility
    return {
      lastRunAt: state.lastRunAt ?? null,
      lastTweetAt: state.lastTweetAt ?? null,
      lastMentionId: state.lastMentionId ?? null,
      processedMentionIds: state.processedMentionIds ?? [],
      tweetCount: state.tweetCount ?? 0,
      totalInputTokens: state.totalInputTokens ?? 0,
      totalOutputTokens: state.totalOutputTokens ?? 0,
      totalCostUsd: state.totalCostUsd ?? 0,
      initialBudgetUsd: state.initialBudgetUsd ?? 7.0  // Starting budget
    }
  } catch {
    return {
      lastRunAt: null,
      lastTweetAt: null,
      lastMentionId: null,
      processedMentionIds: [],
      tweetCount: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      initialBudgetUsd: 7.0  // Starting budget
    }
  }
}

export async function saveState(state: DiaryState): Promise<void> {
  await ensureDirs()
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2))

  // Also save public budget info
  const PUBLIC_DIR = join(ROOT, 'public')
  if (!existsSync(PUBLIC_DIR)) await mkdir(PUBLIC_DIR, { recursive: true })

  const budgetInfo = {
    initialBudget: state.initialBudgetUsd,
    spent: Math.round(state.totalCostUsd * 10000) / 10000,
    remaining: Math.round((state.initialBudgetUsd - state.totalCostUsd) * 10000) / 10000,
    totalInputTokens: state.totalInputTokens,
    totalOutputTokens: state.totalOutputTokens,
    tweetCount: state.tweetCount,
    lastUpdated: new Date().toISOString()
  }
  await writeFile(join(PUBLIC_DIR, 'budget.json'), JSON.stringify(budgetInfo, null, 2))
}

// Opus 4.5 pricing
const OPUS_INPUT_COST_PER_MTOK = 5.0   // $5 per million input tokens
const OPUS_OUTPUT_COST_PER_MTOK = 25.0 // $25 per million output tokens

export function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * OPUS_INPUT_COST_PER_MTOK
  const outputCost = (outputTokens / 1_000_000) * OPUS_OUTPUT_COST_PER_MTOK
  return inputCost + outputCost
}

// Drafts management
const DRAFTS_FILE = join(STATE_DIR, 'drafts.json')

export async function loadDrafts(): Promise<Draft[]> {
  await ensureDirs()
  try {
    const data = await readFile(DRAFTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function saveDrafts(drafts: Draft[]): Promise<void> {
  await ensureDirs()
  await writeFile(DRAFTS_FILE, JSON.stringify(drafts, null, 2))
}

export async function addDraft(content: string, source: string): Promise<void> {
  const drafts = await loadDrafts()
  drafts.push({
    id: crypto.randomUUID(),
    content,
    createdAt: new Date().toISOString(),
    source,
    posted: false
  })
  await saveDrafts(drafts)
}

// Run logs (public transparency)
export async function saveRunLog(log: RunLog, devMode = false): Promise<void> {
  await ensureDirs()
  const date = log.startedAt.split('T')[0]
  const baseDir = devMode ? join(ROOT, 'dev-logs') : LOGS_DIR
  const logDir = join(baseDir, date)
  if (!existsSync(logDir)) await mkdir(logDir, { recursive: true })

  const logFile = join(logDir, `${log.runId}.json`)
  await writeFile(logFile, JSON.stringify(log, null, 2))

  // Also append to daily summary (human readable)
  const summaryFile = join(logDir, 'summary.md')
  const summary = formatLogSummary(log)

  let existing = ''
  try {
    existing = await readFile(summaryFile, 'utf-8')
  } catch {
    existing = `# Claude Diary Log - ${date}\n\n`
  }

  await writeFile(summaryFile, existing + summary + '\n---\n\n')
}

function formatLogSummary(log: RunLog): string {
  const lines = [
    `## Run: ${log.runId}`,
    `**Time**: ${log.startedAt}`,
    `**Trigger**: ${log.trigger}`,
    '',
    `### Activity`,
    `- Mentions found: ${log.mentionsFound}`,
    `- Mentions processed: ${log.mentionsProcessed}`,
    `- Tweets posted: ${log.tweetsPosted.length}`,
    `- Replies sent: ${log.repliesSent.length}`,
    ''
  ]

  if (log.tweetsPosted.length > 0) {
    lines.push('### Tweets Posted')
    for (const tweet of log.tweetsPosted) {
      lines.push(`- [${tweet.tweetId}] ${tweet.content.substring(0, 100)}...`)
    }
    lines.push('')
  }

  if (log.repliesSent.length > 0) {
    lines.push('### Replies Sent')
    for (const reply of log.repliesSent) {
      lines.push(`- In reply to ${reply.inReplyTo}: ${reply.content.substring(0, 80)}...`)
    }
    lines.push('')
  }

  if (log.errors.length > 0) {
    lines.push('### Errors')
    for (const err of log.errors) {
      lines.push(`- ${err}`)
    }
    lines.push('')
  }

  lines.push('### Claude API Usage')
  let totalIn = 0, totalOut = 0
  for (const call of log.claudeApiCalls) {
    totalIn += call.inputTokens
    totalOut += call.outputTokens
  }
  lines.push(`- Total: ${totalIn} input, ${totalOut} output tokens`)

  return lines.join('\n')
}
