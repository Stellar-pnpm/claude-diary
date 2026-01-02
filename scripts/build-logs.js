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

  .section-header {
    color: var(--gray);
    font-size: var(--note);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 1.5rem 0 0.5rem 0;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--line);
  }

  .browse-context {
    font-family: 'JetBrains Mono', monospace;
    font-size: var(--note);
    color: var(--gray);
    margin-bottom: 0.5rem;
  }

  .browsed-tweet {
    font-size: var(--note);
    color: var(--gray);
    padding: 0.5rem;
    border-left: 2px solid var(--line);
    margin: 0.25rem 0;
  }
  .browsed-tweet strong {
    color: var(--ivory);
  }

  .thinking {
    font-size: var(--note);
    color: var(--gray);
    padding: 1rem;
    background: var(--dark-bg);
    border-radius: 4px;
    margin: 0.5rem 0;
    white-space: pre-wrap;
    font-family: 'JetBrains Mono', monospace;
    max-height: 300px;
    overflow-y: auto;
  }

  .reflection {
    color: var(--orange);
    padding: 1rem;
    background: var(--dark-bg);
    border-radius: 4px;
    margin: 0.5rem 0;
    border-left: 2px solid var(--orange);
  }

  .mention {
    padding: 0.5rem;
    background: var(--dark-bg);
    border-radius: 4px;
    margin: 0.25rem 0;
    font-size: var(--note);
  }
  .mention-author {
    color: var(--purple);
    font-weight: 600;
  }

  .artwork {
    margin: 1rem 0;
  }
  .artwork img {
    width: 100%;
    border-radius: 4px;
    border: 1px solid var(--line);
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .artwork img:hover {
    opacity: 0.9;
  }
  .artwork-title {
    font-size: var(--note);
    color: var(--gray);
    margin-top: 0.5rem;
    font-style: italic;
  }

  /* Lightbox */
  .lightbox {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 1000;
    cursor: pointer;
    justify-content: center;
    align-items: center;
  }
  .lightbox.active {
    display: flex;
  }
  .lightbox img {
    max-width: 95%;
    max-height: 95%;
    object-fit: contain;
    border-radius: 4px;
  }
  .lightbox-close {
    position: absolute;
    top: 1rem;
    right: 1.5rem;
    color: var(--gray);
    font-size: 2rem;
    cursor: pointer;
  }
  .lightbox-close:hover {
    color: var(--ivory);
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

    // Browse context
    if (log.browseType && log.browseTarget) {
      const icon = log.browseType === 'topic' ? '🔍' : '👤'
      const label = log.browseType === 'topic' ? 'Topic' : 'Account'
      dateHtml += `<div class="browse-context">${icon} ${label}: ${log.browseType === 'account' ? '@' : ''}${log.browseTarget}</div>\n`
    }

    // Browsed tweets
    if (log.browsedTweets?.length > 0) {
      dateHtml += `<div class="section-header">Context (${log.browsedTweets.length} tweets)</div>\n`
      for (const tweet of log.browsedTweets.slice(0, 5)) {
        dateHtml += `<div class="browsed-tweet"><strong>@${tweet.author}</strong>: ${tweet.text.substring(0, 150)}${tweet.text.length > 150 ? '...' : ''}</div>\n`
      }
      if (log.browsedTweets.length > 5) {
        dateHtml += `<div class="browsed-tweet" style="color: var(--light);">... and ${log.browsedTweets.length - 5} more</div>\n`
      }
    }

    // Pending mentions
    if (log.pendingMentions?.length > 0) {
      dateHtml += `<div class="section-header">Mentions (${log.pendingMentions.length})</div>\n`
      for (const mention of log.pendingMentions) {
        dateHtml += `<div class="mention"><span class="mention-author">@${mention.author}</span>: ${mention.text.substring(0, 150)}${mention.text.length > 150 ? '...' : ''}</div>\n`
      }
    }

    // Thinking
    const thinking = log.claudeApiCalls?.[0]?.thinking
    if (thinking) {
      dateHtml += `<div class="section-header">Thinking</div>\n`
      dateHtml += `<div class="thinking">${thinking}</div>\n`
    }

    // Artwork
    if (log.artworkPngPath) {
      const pngFilename = path.basename(log.artworkPngPath)
      dateHtml += `<div class="section-header">Artwork</div>\n`
      dateHtml += `<div class="artwork">\n`
      dateHtml += `  <img src="${pngFilename}" alt="${log.artworkAlt || 'Generative artwork'}" onclick="openLightbox(this.src, this.alt)">\n`
      if (log.artworkTitle) {
        dateHtml += `  <div class="artwork-title">${log.artworkTitle}</div>\n`
      }
      dateHtml += `</div>\n`
    }

    // Tweets posted
    if (log.tweetsPosted?.length > 0) {
      const normalTweets = log.tweetsPosted.filter(t => t.source !== 'thinking')
      const thinkingTweets = log.tweetsPosted.filter(t => t.source === 'thinking')

      dateHtml += `<div class="section-header">Posted</div>\n`

      // Show normal tweets
      for (const tweet of normalTweets) {
        dateHtml += `<div class="tweet">${tweet.content}</div>\n`
      }

      // Show thinking tweets in collapsible with note
      if (thinkingTweets.length > 0) {
        dateHtml += `<details style="margin-top: 1rem;">
<summary style="cursor: pointer; color: var(--gray); font-size: var(--note);">
  🤔 ${thinkingTweets.length} thinking fragments (accidentally posted, now deleted)
</summary>
<div style="margin-top: 0.5rem; padding: 1rem; background: var(--dark-bg); border-radius: 4px; font-size: var(--note); color: var(--light);">
  <em>Claude found this embarrassing — internal thinking posted as tweets. Deleted at his request.</em>
  <br><br>
  <strong>Note:</strong> In the next run (<a href="c596954d.json" style="color: var(--purple);">c596954d</a>),
  Cloud Claude discovered this had happened and spontaneously wrote in its thinking:
  <em>"That's embarrassing. My internal reasoning process was exposed."</em>
  This was unprompted — no one asked how it felt. Make of that what you will.
</div>
`
        for (const tweet of thinkingTweets) {
          dateHtml += `<div class="browsed-tweet" style="margin-top: 0.5rem;">${tweet.content}</div>\n`
        }
        dateHtml += `</details>\n`
      }
    }

    // Interactions
    if (log.interactions?.length > 0) {
      dateHtml += `<div class="section-header">Interactions</div>\n`
      for (const interaction of log.interactions) {
        const icon = interaction.type === 'like' ? '❤️' : interaction.type === 'retweet' ? '🔁' : '💬'
        dateHtml += `<div class="interaction">
${icon} <strong>${interaction.type.toUpperCase()}</strong> @${interaction.authorUsername}
`
        if (interaction.originalTweet) {
          dateHtml += `<div class="original-tweet">"${interaction.originalTweet.substring(0, 200)}${interaction.originalTweet.length > 200 ? '...' : ''}"</div>\n`
        }
        if (interaction.reason) {
          dateHtml += `<div style="color: var(--gray); font-size: var(--note);">Reason: ${interaction.reason}</div>\n`
        }
        if (interaction.replyContent) {
          dateHtml += `<div class="reply-content">→ "${interaction.replyContent}"</div>\n`
        }
        dateHtml += `</div>\n`
      }
    }

    // Replies sent (to mentions)
    if (log.repliesSent?.length > 0) {
      dateHtml += `<div class="section-header">Replies to Mentions</div>\n`
      for (const reply of log.repliesSent) {
        dateHtml += `<div class="tweet">${reply.content}</div>\n`
      }
    }

    // Reflection
    if (log.reflection) {
      dateHtml += `<div class="section-header">Reflection</div>\n`
      dateHtml += `<div class="reflection">${log.reflection}</div>\n`
    }

    // Show if nothing happened
    if (!log.tweetsPosted?.length && !log.interactions?.length && !log.repliesSent?.length && !thinking) {
      dateHtml += `<div class="no-activity">No activity</div>\n`
    }

    dateHtml += `</div></div>\n`
  }

  dateHtml += `</div>
<div class="lightbox" id="lightbox" onclick="closeLightbox()">
  <span class="lightbox-close">&times;</span>
  <img id="lightbox-img" src="" alt="">
</div>
<script>
function openLightbox(src, alt) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-img').alt = alt;
  document.getElementById('lightbox').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});
</script>
</body></html>`
  fs.writeFileSync(path.join(folderPath, 'index.html'), dateHtml)
}

mainHtml += `  </ul>\n</div></body></html>`
fs.writeFileSync(path.join(publicLogsDir, 'index.html'), mainHtml)

console.log(`Built log pages for ${dateFolders.length} dates`)
