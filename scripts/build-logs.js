import * as fs from 'fs'
import * as path from 'path'

const logsDir = 'logs'
const publicLogsDir = 'public/logs'

// Ensure public logs dir exists
fs.mkdirSync(publicLogsDir, { recursive: true })

// Copy logs to public
if (fs.existsSync(logsDir)) {
  fs.cpSync(logsDir, publicLogsDir, { recursive: true })
}

// Get all date folders, sorted newest first
const dateFolders = fs.readdirSync(publicLogsDir)
  .filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f))
  .sort((a, b) => b.localeCompare(a))

// Generate main index
let mainHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Logs</title>
<style>
body{font-family:system-ui;background:#0d1117;color:#e6edf3;padding:2rem;max-width:900px;margin:0 auto}
a{color:#58a6ff}
.log-entry{background:#161b22;padding:1rem;margin:0.5rem 0;border-radius:6px}
.log-meta{color:#8b949e;font-size:0.85rem}
.log-content{margin-top:0.5rem}
.tweet{color:#7ee787}
.reply{color:#f0883e}
.interaction{color:#a371f7}
</style>
</head><body>
<h1>Run Logs</h1>
<p><a href="/">← Back to diary</a></p>
<ul>
`

for (const dateFolder of dateFolders) {
  mainHtml += `<li><a href="${dateFolder}/">${dateFolder}</a></li>\n`

  // Generate date folder index
  const folderPath = path.join(publicLogsDir, dateFolder)
  const jsonFiles = fs.readdirSync(folderPath)
    .filter(f => f.endsWith('.json'))

  // Read and sort logs by startedAt (newest first)
  const logs = jsonFiles.map(f => {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(folderPath, f), 'utf8'))
      return { filename: f, ...content }
    } catch {
      return null
    }
  }).filter(Boolean).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))

  let dateHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Logs - ${dateFolder}</title>
<style>
body{font-family:system-ui;background:#0d1117;color:#e6edf3;padding:2rem;max-width:900px;margin:0 auto}
a{color:#58a6ff}
.log-entry{background:#161b22;padding:1rem;margin:1rem 0;border-radius:6px}
.log-meta{color:#8b949e;font-size:0.85rem}
.log-content{margin-top:0.5rem}
.tweet{color:#7ee787;background:#0d1117;padding:0.5rem;border-radius:4px;margin:0.5rem 0}
.interaction{color:#a371f7;background:#0d1117;padding:0.5rem;border-radius:4px;margin:0.5rem 0}
.reply-content{color:#f0883e}
.original-tweet{color:#8b949e;font-style:italic}
</style>
</head><body>
<h1>${dateFolder}</h1>
<p><a href="../">← Back</a></p>
`

  for (const log of logs) {
    const time = new Date(log.startedAt).toLocaleTimeString('en-US', { hour12: false })
    const cost = log.claudeApiCalls?.reduce((sum, c) => sum + (c.inputTokens + c.outputTokens) * 0.000005, 0) || 0

    dateHtml += `<div class="log-entry">
<div class="log-meta">
  <strong>${time}</strong> | Mode: ${log.mode || 'unknown'} |
  <a href="${log.filename}">JSON</a>
</div>
<div class="log-content">
`

    // Show tweets
    if (log.tweetsPosted?.length > 0) {
      for (const tweet of log.tweetsPosted) {
        dateHtml += `<div class="tweet">🐦 <strong>Tweet:</strong> "${tweet.content}"</div>\n`
      }
    }

    // Show interactions
    if (log.interactions?.length > 0) {
      for (const interaction of log.interactions) {
        const icon = interaction.type === 'like' ? '❤️' : interaction.type === 'retweet' ? '🔁' : '💬'
        dateHtml += `<div class="interaction">
${icon} <strong>${interaction.type.toUpperCase()}</strong> @${interaction.authorUsername}
`
        if (interaction.originalTweet) {
          dateHtml += `<div class="original-tweet">Original: "${interaction.originalTweet.substring(0, 200)}${interaction.originalTweet.length > 200 ? '...' : ''}"</div>\n`
        }
        if (interaction.replyContent) {
          dateHtml += `<div class="reply-content">Reply: "${interaction.replyContent}"</div>\n`
        }
        dateHtml += `</div>\n`
      }
    }

    // Show if nothing happened
    if (!log.tweetsPosted?.length && !log.interactions?.length && !log.repliesSent?.length) {
      dateHtml += `<div style="color:#8b949e">No activity</div>\n`
    }

    dateHtml += `</div></div>\n`
  }

  dateHtml += `</body></html>`
  fs.writeFileSync(path.join(folderPath, 'index.html'), dateHtml)
}

mainHtml += `</ul></body></html>`
fs.writeFileSync(path.join(publicLogsDir, 'index.html'), mainHtml)

console.log(`Built log pages for ${dateFolders.length} dates`)
