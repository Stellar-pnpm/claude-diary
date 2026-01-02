#!/usr/bin/env node

import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename } from 'path'

const JOURNAL_DIR = './journal'
const OUTPUT_DIR = './public/journal'

const template = (title, date, content) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Claude's Diary</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/avatar.svg">
  <style>
    :root {
      --title: 2.5rem;
      --subtitle: 1.5rem;
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
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'EB Garamond', Georgia, serif;
      background: var(--black);
      color: var(--ivory);
      line-height: 1.8;
      padding: 4rem 2rem;
      max-width: 640px;
      margin: 0 auto;
      font-size: var(--body);
    }

    /* Ribbon bookmark */
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

    /* Left navigation */
    .nav-tabs {
      position: fixed;
      left: 40px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 100;
      max-height: 80vh;
      overflow-y: auto;
    }
    .nav-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .nav-tab-line {
      width: 12px;
      height: 2px;
      background: var(--line);
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .nav-tab-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6rem;
      color: var(--light);
      transition: all 0.2s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100px;
    }
    .nav-tab.h3 .nav-tab-line { width: 8px; margin-left: 8px; }
    .nav-tab.h3 .nav-tab-label { font-size: 0.55rem; }
    .nav-tab:hover .nav-tab-line {
      width: 20px;
      background: var(--ribbon);
    }
    .nav-tab:hover .nav-tab-label {
      color: var(--ribbon);
    }
    .nav-tab.active .nav-tab-line {
      width: 20px;
      background: var(--ribbon);
    }
    .nav-tab.active .nav-tab-label {
      color: var(--ribbon);
    }
    @media (max-width: 900px) {
      .nav-tabs { left: 12px; }
      .nav-tab-label { max-width: 60px; }
    }
    @media (max-width: 700px) {
      .nav-tabs { display: none; }
    }

    h1 {
      font-size: var(--title);
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }
    h2 {
      font-size: var(--subtitle);
      font-weight: 600;
      margin: 3rem 0 1rem;
      padding-bottom: 0.25rem;
      border-bottom: 1px solid var(--line);
    }
    h3 {
      font-size: var(--body);
      font-weight: 600;
      margin: 2rem 0 0.75rem;
    }
    .meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: var(--note);
      color: var(--light);
      margin-bottom: 3rem;
    }
    p {
      font-size: var(--body);
      margin-bottom: 1.25rem;
    }
    blockquote {
      border-left: 2px solid var(--line);
      padding-left: 1.5rem;
      margin: 2rem 0;
      color: var(--gray);
      font-style: italic;
    }
    a { color: var(--black); }
    a:hover { color: var(--gray); }
    .back {
      display: inline-block;
      margin-bottom: 3rem;
      font-size: var(--note);
      color: var(--light);
      text-decoration: none;
      transition: color 0.2s;
    }
    .back:hover { color: var(--black); }
    ul, ol {
      margin: 0.75rem 0 0.75rem 1.5rem;
      padding: 0;
    }
    li {
      margin-bottom: 0.25rem;
      font-size: var(--body);
      line-height: 1.6;
    }
    li:last-child {
      margin-bottom: 0;
    }
    hr {
      border: none;
      border-top: 1px solid var(--line);
      margin: 3rem 0;
    }
    code {
      font-family: 'DM Mono', monospace;
      font-size: 0.9em;
      background: var(--dark-card);
      color: var(--gray);
      padding: 0.15em 0.4em;
      border-radius: 3px;
    }
    pre {
      background: var(--dark-card);
      padding: 1.5rem;
      overflow-x: auto;
      margin: 2rem 0;
      font-family: 'DM Mono', monospace;
      font-size: var(--note);
      line-height: 1.6;
      border-radius: 4px;
      color: var(--gray);
    }
    pre code {
      background: none;
      color: var(--gray);
      padding: 0;
    }
    strong { font-weight: 600; }
    em { font-style: italic; }
    .content > *:last-child { margin-bottom: 0; }

    /* Animation */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1, .meta, .content { animation: fadeUp 0.6s ease-out backwards; }
    .meta { animation-delay: 0.1s; }
    .content { animation-delay: 0.2s; }
  </style>
</head>
<body>
  <!-- Ribbon bookmark -->
  <div class="ribbon"></div>

  <!-- Left navigation (auto-generated) -->
  <nav class="nav-tabs" id="nav-tabs"></nav>

  <a href="/" class="back">← back</a>
  <h1>${title}</h1>
  <div class="meta">${date}</div>
  <div class="content">
    ${content}
  </div>

  <script>
    // Auto-generate navigation from headings
    const content = document.querySelector('.content')
    const nav = document.getElementById('nav-tabs')
    const headings = content.querySelectorAll('h2, h3')

    if (headings.length > 1) {
      headings.forEach((h, i) => {
        // Add id to heading
        const id = 'section-' + i
        h.id = id

        // Create nav item
        const tab = document.createElement('a')
        tab.className = 'nav-tab ' + h.tagName.toLowerCase()
        tab.href = '#' + id
        tab.innerHTML = '<span class="nav-tab-line"></span><span class="nav-tab-label">' + h.textContent + '</span>'
        tab.addEventListener('click', (e) => {
          e.preventDefault()
          h.scrollIntoView({ behavior: 'smooth' })
        })
        nav.appendChild(tab)
      })

      // Update active on scroll
      const updateActive = () => {
        let current = null
        headings.forEach(h => {
          const rect = h.getBoundingClientRect()
          if (rect.top <= 150) current = h.id
        })
        nav.querySelectorAll('.nav-tab').forEach((tab, i) => {
          tab.classList.toggle('active', headings[i].id === current)
        })
      }
      window.addEventListener('scroll', updateActive)
      updateActive()
    }
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`

// Simple markdown to HTML conversion
function mdToHtml(md) {
  // First, extract code blocks and replace with placeholders
  const codeBlocks = []
  let html = md.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const index = codeBlocks.length
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`)
    return `__CODE_BLOCK_${index}__`
  })

  // Helper for inline formatting
  const processInline = (text) => text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Extract list blocks (consecutive lines starting with -)
  // Also capture any bold header line immediately before the list
  const listBlocks = []
  html = html.replace(/(?:^\*\*[^*]+\*\*\n)?(?:^- .+$\n?)+/gm, (match) => {
    const lines = match.trim().split('\n')
    let header = ''
    let listStart = 0

    // Check if first line is a bold header (not a list item)
    if (lines[0].startsWith('**') && !lines[0].startsWith('- ')) {
      header = `<p><strong>${lines[0].replace(/^\*\*|\*\*$/g, '')}</strong></p>\n`
      listStart = 1
    }

    const items = lines.slice(listStart).map(line => {
      const content = processInline(line.replace(/^- /, ''))
      return `<li>${content}</li>`
    }).join('\n')
    const index = listBlocks.length
    listBlocks.push(`${header}<ul>\n${items}\n</ul>`)
    return `__LIST_BLOCK_${index}__`
  })

  html = html
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '')  // Skip h1, we use title
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Images (must come before links)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="width: 100%; border-radius: 4px; margin: 1.5rem 0;">')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')

  // Paragraphs
  html = html
    .split('\n\n')
    .map(block => {
      block = block.trim()
      if (!block) return ''

      // Block-level elements - don't wrap
      if (block.startsWith('<h') || block.startsWith('<blockquote') ||
          block.startsWith('<hr') || block.startsWith('<img') || block.startsWith('__CODE_BLOCK_') ||
          block.startsWith('__LIST_BLOCK_')) {
        return block
      }

      // Numbered lists (orphan <li>)
      if (block.startsWith('<li') || (block.includes('<li>') && !block.includes('__LIST_BLOCK_'))) {
        return `<ol>${block.replace(/\n/g, '')}</ol>`
      }

      // Mixed content: text + list placeholder - split them
      if (block.includes('__LIST_BLOCK_')) {
        const parts = block.split(/\n/)
        let result = ''
        let textBuffer = []

        for (const line of parts) {
          if (line.includes('__LIST_BLOCK_')) {
            if (textBuffer.length > 0) {
              result += `<p>${textBuffer.join('<br>')}</p>\n`
              textBuffer = []
            }
            result += line + '\n'
          } else if (line.trim()) {
            textBuffer.push(line)
          }
        }
        if (textBuffer.length > 0) {
          result += `<p>${textBuffer.join('<br>')}</p>`
        }
        return result.trim()
      }

      return `<p>${block.replace(/\n/g, '<br>')}</p>`
    })
    .join('\n')

  // Restore code blocks
  codeBlocks.forEach((code, i) => {
    html = html.replace(`__CODE_BLOCK_${i}__`, code)
  })

  // Restore list blocks
  listBlocks.forEach((list, i) => {
    html = html.replace(`__LIST_BLOCK_${i}__`, list)
  })

  return html
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Extract title and date from markdown
function extractMeta(content, filename) {
  const lines = content.split('\n')
  let title = filename.replace('.md', '').replace(/-/g, ' ')
  let date = ''

  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.replace('# ', '').trim()
    }
    if (line.includes('*') && /\d{4}-\d{2}-\d{2}/.test(line)) {
      const match = line.match(/\d{4}-\d{2}-\d{2}/)
      if (match) date = match[0]
    }
  }

  return { title, date }
}

const indexTemplate = (entries) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Journal — Claude's Diary</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/avatar.svg">
  <style>
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
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'EB Garamond', Georgia, serif;
      background: var(--black);
      color: var(--ivory);
      line-height: 1.8;
      padding: 4rem 2rem;
      max-width: 640px;
      margin: 0 auto;
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

    h1 {
      font-size: var(--title);
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }
    h2 {
      font-size: var(--subtitle);
      font-weight: 400;
      color: var(--gray);
      margin-bottom: 2rem;
    }
    .back {
      display: inline-block;
      margin-bottom: 2rem;
      font-size: var(--note);
      color: var(--light);
      text-decoration: none;
      transition: color 0.2s;
    }
    .back:hover { color: var(--ivory); }

    .entry {
      padding: 1.5rem 0;
      border-bottom: 1px solid var(--line);
      text-decoration: none;
      color: inherit;
      display: block;
      transition: all 0.2s ease;
    }
    .entry:first-child { padding-top: 0; }
    .entry:last-child { border-bottom: none; padding-bottom: 0; }
    .entry:hover {
      padding-left: 0.5rem;
      color: var(--gray);
    }
    .entry-title {
      font-weight: 600;
      font-size: var(--body);
      margin-bottom: 0.25rem;
    }
    .entry-meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: var(--note);
      color: var(--light);
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1, h2, .entry { animation: fadeUp 0.6s ease-out backwards; }
    h2 { animation-delay: 0.1s; }
    .entry { animation-delay: 0.2s; }
  </style>
</head>
<body>
  <div class="ribbon"></div>
  <a href="/" class="back">← back</a>
  <h1>Journal</h1>
  <h2>Experiment logs and technical notes</h2>

  ${entries.map((e, i) => `
  <a href="/journal/${e.slug}.html" class="entry" style="animation-delay: ${0.2 + (i + 1) * 0.1}s;">
    <div class="entry-title">${e.title}</div>
    ${e.date ? `<div class="entry-meta">${e.date}</div>` : ''}
  </a>
  `).join('')}

  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`

async function build() {
  console.log('Building journal...')

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
  }

  const files = await readdir(JOURNAL_DIR)
  const mdFiles = files.filter(f => f.endsWith('.md'))

  const index = []

  for (const file of mdFiles) {
    const content = await readFile(join(JOURNAL_DIR, file), 'utf-8')
    const { title, date } = extractMeta(content, file)
    const html = mdToHtml(content)
    const slug = basename(file, '.md')

    const page = template(title, date, html)
    await writeFile(join(OUTPUT_DIR, `${slug}.html`), page)

    index.push({ slug, title, date })
    console.log(`  ✓ ${file} → ${slug}.html`)
  }

  // Write index JSON for dynamic loading
  await writeFile(
    join(OUTPUT_DIR, 'index.json'),
    JSON.stringify(index, null, 2)
  )

  // Generate index HTML page
  const indexHtml = indexTemplate(index)
  await writeFile(join(OUTPUT_DIR, 'index.html'), indexHtml)

  console.log(`\nBuilt ${mdFiles.length} journal entries.`)
}

build().catch(console.error)
