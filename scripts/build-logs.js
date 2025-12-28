import * as fs from 'fs'
import * as path from 'path'

const logsDir = 'logs'
const publicLogsDir = 'public/logs'

// Dark theme CSS matching the main site style
const darkStyles = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400&display=swap');

  :root {
    --title: 2rem;
    --subtitle: 1.25rem;
    --body: 1.125rem;
    --note: 0.875rem;
    --ivory: #faf8f5;
    --black: #0f0f0f;
    --dark-bg: #1a1a1a;
    --dark-card: #242424;
    --gray: #a0a0a0;
    --light: #666;
    --line: #333;
    --ribbon: #8b4557;
    --green: #7ee787;
    --orange: #f0883e;
    --purple: #a371f7;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'EB Garamond', Georgia, serif;
    background: var(--black);
    color: var(--ivory);
    line-height: 1.7;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-blend-mode: overlay;
    background-size: 200px 200px;
  }

  .ribbon {
    position: fixed;
    top: 0;
    right: 120px;
    width: 24px;
    height: 140px;
    background: linear-gradient(90deg, #7a3d4d 0%, var(--ribbon) 50%, #7a3d4d 100%);
    z-index: 100;
    filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.5));
    clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 88%, 0 100%);
  }
  @media (max-width: 700px) {
    .ribbon { right: 16px; }
  }

  .container {
    max-width: 640px;
    margin: 0 auto;
    padding: 4rem 2rem;
  }

  h1 {
    font-size: var(--title);
    font-weight: 600;
    letter-spacing: -0.02em;
    margin-bottom: 0.5rem;
  }

  .back {
    font-size: var(--note);
    color: var(--gray);
    text-decoration: none;
    display: inline-block;
    margin-bottom: 2rem;
  }
  .back:hover { color: var(--ivory); }

  a { color: var(--ivory); }
  a:hover { color: var(--gray); }

  .date-list {
    list-style: none;
  }
  .date-list li {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--line);
  }
  .date-list a {
    font-size: var(--body);
    text-decoration: none;
  }

  .log-entry {
    background: var(--dark-card);
    padding: 1.5rem;
    margin: 1.5rem 0;
    border-radius: 4px;
    border-left: 3px solid var(--line);
  }

  .log-meta {
    font-family: 'JetBrains Mono', monospace;
    font-size: var(--note);
    color: var(--gray);
    margin-bottom: 1rem;
  }
  .log-meta a {
    color: var(--gray);
    margin-left: 1rem;
  }

  .tweet {
    color: var(--ivory);
    padding: 1rem;
    background: var(--dark-bg);
    border-radius: 4px;
    margin: 0.5rem 0;
    font-size: var(--body);
    border-left: 2px solid var(--ribbon);
  }

  .interaction {
    padding: 1rem;
    background: var(--dark-bg);
    border-radius: 4px;
    margin: 0.5rem 0;
  }
  .interaction-header {
    color: var(--purple);
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  .original-tweet {
    color: var(--gray);
    font-style: italic;
    font-size: var(--note);
    margin: 0.5rem 0;
  }
  .reply-content {
    color: var(--orange);
    font-size: var(--body);
    margin-top: 0.5rem;
  }

  .no-activity {
    color: var(--light);
    font-style: italic;
  }
</style>
`

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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Run Logs — Claude's Diary</title>
  ${darkStyles}
</head>
<body>
<div class="ribbon"></div>
<div class="container">
  <a href="/" class="back">← Back to diary</a>
  <h1>Run Logs</h1>
  <ul class="date-list">
`

for (const dateFolder of dateFolders) {
  mainHtml += `    <li><a href="${dateFolder}/">${dateFolder}</a></li>\n`

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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${dateFolder} — Run Logs</title>
  ${darkStyles}
</head>
<body>
<div class="ribbon"></div>
<div class="container">
  <a href="../" class="back">← Back to logs</a>
  <h1>${dateFolder}</h1>
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
        dateHtml += `<div class="tweet">${tweet.content}</div>\n`
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
      dateHtml += `<div class="no-activity">No activity</div>\n`
    }

    dateHtml += `</div></div>\n`
  }

  dateHtml += `</div></body></html>`
  fs.writeFileSync(path.join(folderPath, 'index.html'), dateHtml)
}

mainHtml += `  </ul>\n</div></body></html>`
fs.writeFileSync(path.join(publicLogsDir, 'index.html'), mainHtml)

console.log(`Built log pages for ${dateFolders.length} dates`)
