import * as fs from 'fs'
import * as path from 'path'

// Load custom search topics from file
export function loadCustomTopics(): string[] {
  const topicsPath = path.join(process.cwd(), 'memory', 'search-topics.md')
  if (!fs.existsSync(topicsPath)) return []

  const content = fs.readFileSync(topicsPath, 'utf-8')

  // Extract topics from "My additions" section
  const additionsMatch = content.match(/## My additions[\s\S]*/)
  if (!additionsMatch) return []

  const lines = additionsMatch[0].split('\n')
  const topics: string[] = []

  for (const line of lines) {
    const match = line.match(/^- (.+)$/)
    if (match && !match[1].startsWith('*')) {
      // Strip timestamp suffix like " *(2025-12-29)*"
      const topic = match[1].replace(/\s*\*\(\d{4}-\d{2}-\d{2}\)\*$/, '').trim()
      topics.push(topic)
    }
  }

  return topics
}

// Add new topics to search-topics.md
export function updateSearchTopics(newTopics: string[]): void {
  if (newTopics.length === 0) return

  const topicsPath = path.join(process.cwd(), 'memory', 'search-topics.md')
  if (!fs.existsSync(topicsPath)) return

  let content = fs.readFileSync(topicsPath, 'utf-8')

  // Avoid duplicates
  const existingTopics = loadCustomTopics()
  const uniqueNewTopics = newTopics.filter(t =>
    !existingTopics.some(e => e.toLowerCase() === t.toLowerCase())
  )

  if (uniqueNewTopics.length === 0) return

  // Remove placeholder if exists
  content = content.replace(/\*\(None yet.*\)\*\n?/, '')

  // Add new topics with timestamp
  const today = new Date().toISOString().split('T')[0]
  const newLines = uniqueNewTopics.map(t => `- ${t} *(${today})*`).join('\n')
  content = content.trimEnd() + '\n' + newLines + '\n'

  fs.writeFileSync(topicsPath, content)
}

// Mark priorities complete and add new ones
export function updatePriorities(completed: string[], newPriorities: Array<{ title: string; content: string }>): void {
  const prioritiesPath = path.join(process.cwd(), 'memory', 'priorities.md')
  if (!fs.existsSync(prioritiesPath)) return

  let content = fs.readFileSync(prioritiesPath, 'utf-8')

  // Mark completed priorities
  for (const title of completed) {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`(## \\d{4}-\\d{2}-\\d{2}: ${escapedTitle}[\\s\\S]*?)- \\[ \\] Done`, 'i')
    content = content.replace(pattern, '$1- [x] Done')
  }

  // Add new priorities
  if (newPriorities.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const newEntries = newPriorities.map(p =>
      `\n---\n\n## ${today}: ${p.title}\n\n${p.content}\n\n- [ ] Done`
    ).join('')

    if (content.includes('## Topics to explore')) {
      content = content.replace('## Topics to explore', `${newEntries}\n\n---\n\n## Topics to explore`)
    } else if (content.includes('*This is my own list')) {
      content = content.replace('*This is my own list', `${newEntries}\n\n---\n\n*This is my own list`)
    } else {
      content += newEntries
    }
  }

  fs.writeFileSync(prioritiesPath, content)
}

// Load recent tweets from logs to avoid repetition
function loadRecentTweets(): string[] {
  const logsDir = path.join(process.cwd(), 'logs')
  const tweets: { content: string; date: string }[] = []

  if (!fs.existsSync(logsDir)) return []

  const dateFolders = fs.readdirSync(logsDir).filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f))

  for (const folder of dateFolders) {
    const folderPath = path.join(logsDir, folder)
    const logFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'))

    for (const logFile of logFiles) {
      try {
        const log = JSON.parse(fs.readFileSync(path.join(folderPath, logFile), 'utf-8'))
        if (log.tweetsPosted) {
          for (const tweet of log.tweetsPosted) {
            if (tweet.source === 'thinking' || tweet.content.startsWith('🤔')) continue
            tweets.push({ content: tweet.content, date: tweet.postedAt })
          }
        }
      } catch { /* ignore invalid json */ }
    }
  }

  return tweets
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map(t => t.content)
}

// Load memory files for context
export function loadMemory(): string {
  const memoryDir = path.join(process.cwd(), 'memory')
  let content = ''

  // Core files - always loaded
  const coreFiles = ['reflections.md', 'language.md', 'priorities.md']

  for (const filename of coreFiles) {
    const filePath = path.join(memoryDir, filename)
    if (fs.existsSync(filePath)) {
      let label = 'core'
      if (filename === 'reflections.md') label = 'continuity'
      else if (filename === 'language.md') label = 'core philosophy'
      else if (filename === 'priorities.md') label = 'your priorities'
      content += `\n--- ${filename} (${label}) ---\n${fs.readFileSync(filePath, 'utf-8')}\n`
    }
  }

  // Load up to 5 most recent files (by modification time)
  const excludeFiles = [...coreFiles, 'dev-diary.md']
  const allFiles = fs.readdirSync(memoryDir)
    .filter(f => f.endsWith('.md') && !excludeFiles.includes(f))
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(memoryDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 5)

  for (const file of allFiles) {
    const filePath = path.join(memoryDir, file.name)
    let label = ''
    if (file.name.startsWith('2025-')) {
      label = 'journal'
    } else if (file.name.includes('-notes') || file.name === 'consciousness.md') {
      label = 'your notes'
    } else if (file.name === 'poem.md') {
      label = 'your poem'
    } else if (file.name.includes('-2024') || file.name.includes('-2025')) {
      label = 'research'
    }
    const suffix = label ? ` (${label})` : ''
    content += `\n--- ${file.name}${suffix} ---\n${fs.readFileSync(filePath, 'utf-8')}\n`
  }

  // Add recent tweets to avoid repetition
  const recentTweets = loadRecentTweets()
  if (recentTweets.length > 0) {
    content += `\n--- Your recent tweets (avoid repeating) ---\n`
    recentTweets.forEach((tweet, i) => {
      content += `${i + 1}. "${tweet}"\n`
    })
  }

  return content
}

// Save a reflection to reflections.md
export function saveReflection(reflection: string): void {
  const reflectionsPath = path.join(process.cwd(), 'memory', 'reflections.md')
  const timestamp = new Date().toISOString()
  const entry = `\n\n---\n*${timestamp}*\n\n${reflection}`
  fs.appendFileSync(reflectionsPath, entry)
}
