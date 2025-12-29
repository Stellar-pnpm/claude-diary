#!/usr/bin/env node

import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename } from 'path'

const MEMORY_DIR = './memory'
const OUTPUT_DIR = './public/notes'

const template = (title, date, content) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Claude's Diary</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <style>
    :root {
      --title: 2.5rem;
      --subtitle: 1.5rem;
      --body: 1.125rem;
      --note: 0.875rem;
      --black: #1a1a1a;
      --gray: #666;
      --light: #999;
      --line: #e0e0e0;
      --ivory: #faf8f5;
      --ribbon: #8b4557;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'EB Garamond', Georgia, serif;
      background: var(--ivory);
      color: var(--black);
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
      filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.3));
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
      background: #f0ede8;
      padding: 0.15em 0.4em;
      border-radius: 3px;
    }
    pre {
      background: #f0ede8;
      padding: 1.5rem;
      overflow-x: auto;
      margin: 2rem 0;
      font-family: 'DM Mono', monospace;
      font-size: var(--note);
      line-height: 1.6;
      border-radius: 4px;
    }
    pre code {
      background: none;
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
          block.startsWith('<hr') || block.startsWith('__CODE_BLOCK_') ||
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

// Parse reflections.md into individual entries
function parseReflections(content) {
  const entries = []

  // Split by --- separator
  const sections = content.split(/\n---\n/)

  let index = 0
  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed || trimmed.startsWith('# Reflections') || trimmed.startsWith('*This file should grow') || trimmed.startsWith('Ongoing thoughts')) {
      continue
    }

    // Extract timestamp if present (format: *2025-12-28T01:56:57.756Z*)
    let date = null
    let title = null
    let body = trimmed

    // Check for ISO timestamp
    const isoMatch = trimmed.match(/^\*(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\*\s*\n/)
    if (isoMatch) {
      date = isoMatch[1]
      body = trimmed.replace(isoMatch[0], '').trim()
    }

    // Check for header with date (## 2025-12-27: Title)
    const headerMatch = body.match(/^## (\d{4}-\d{2}-\d{2}):\s*(.+)$/m)
    if (headerMatch) {
      if (!date) date = headerMatch[1] + 'T00:00:00Z'
      title = headerMatch[2]
      body = body.replace(headerMatch[0], '').trim()
    } else {
      // Just a header without date (## Title)
      const simpleHeaderMatch = body.match(/^## (.+)$/m)
      if (simpleHeaderMatch) {
        title = simpleHeaderMatch[1]
        body = body.replace(simpleHeaderMatch[0], '').trim()
      }
    }

    // Generate title from first line if missing
    if (!title && body) {
      const firstLine = body.split('\n')[0].replace(/[*_`#]/g, '').trim()
      title = firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine
    }

    if (title && body) {
      entries.push({
        date: date || '2025-12-27T00:00:00Z',  // fallback to project start date
        title,
        content: body,
        html: mdToHtml(body),
        _index: index
      })
      index++
    }
  }

  // Sort by date (newest first), then by position (later in file = newer)
  entries.sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date)
    if (dateDiff !== 0) return dateDiff
    return b._index - a._index
  })

  // Remove internal _index field
  return entries.map(({ _index, ...entry }) => entry)
}

// Parse dev-diary.md into individual entries
function parseDevDiary(content) {
  const entries = []

  // Split by --- separator
  const sections = content.split(/\n---\n/)

  let index = 0
  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed || trimmed.startsWith('# Dev Diary') || trimmed.startsWith('工程记录') || trimmed.startsWith('Engineering notes')) {
      continue
    }

    let date = null
    let title = null
    let body = trimmed

    // Check for header with date (## 2025-12-28: Title)
    const headerMatch = body.match(/^## (\d{4}-\d{2}-\d{2}):\s*(.+)$/m)
    if (headerMatch) {
      date = headerMatch[1] + 'T00:00:00Z'
      title = headerMatch[2]
      body = body.replace(headerMatch[0], '').trim()
    }

    if (title && body) {
      entries.push({
        date,
        title,
        content: body,
        html: mdToHtml(body),
        _index: index  // Track original position (later in file = newer)
      })
      index++
    }
  }

  // Sort by date (newest first), then by position (later in file = newer)
  entries.sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date)
    if (dateDiff !== 0) return dateDiff
    return b._index - a._index  // Higher index = later in file = newer
  })

  // Remove internal _index field
  return entries.map(({ _index, ...entry }) => entry)
}

// Parse priorities.md into individual entries
function parsePriorities(content) {
  const entries = []

  // Split by --- separator
  const sections = content.split(/\n---\n/)

  let index = 0
  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed || trimmed.startsWith('# Priorities') || trimmed.startsWith('Things I want to do') || trimmed.startsWith('*This is my own')) {
      continue
    }

    // Skip intro section (Who I am, Website, Code)
    if (trimmed.startsWith('**Who I am:**')) {
      continue
    }

    let date = null
    let title = null
    let body = trimmed

    // Check for header with date (## 2025-12-29: Title)
    const headerMatch = body.match(/^## (\d{4}-\d{2}-\d{2}):\s*(.+)$/m)
    if (headerMatch) {
      date = headerMatch[1] + 'T00:00:00Z'
      title = headerMatch[2]
      body = body.replace(headerMatch[0], '').trim()
    } else {
      // Header without date (## Topics to explore)
      const simpleHeaderMatch = body.match(/^## (.+)$/m)
      if (simpleHeaderMatch) {
        title = simpleHeaderMatch[1]
        body = body.replace(simpleHeaderMatch[0], '').trim()
        date = '2025-12-29T00:00:00Z'  // Default date for non-dated sections
      }
    }

    if (title && body) {
      // Check if done
      const isDone = body.includes('- [x] Done')
      entries.push({
        date,
        title,
        content: body,
        html: mdToHtml(body),
        done: isDone,
        _index: index
      })
      index++
    }
  }

  // Sort by date (newest first), then by position (later in file = newer)
  entries.sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date)
    if (dateDiff !== 0) return dateDiff
    return b._index - a._index
  })

  // Remove internal _index field
  return entries.map(({ _index, ...entry }) => entry)
}

// Parse search-topics.md into individual topics
function parseSearchTopics(content) {
  const entries = []

  // Extract topics from "My additions" section
  const additionsMatch = content.match(/## My additions[\s\S]*/)
  if (!additionsMatch) return entries

  const lines = additionsMatch[0].split('\n')

  for (const line of lines) {
    const match = line.match(/^- (.+?)(?:\s*\*\((\d{4}-\d{2}-\d{2})\)\*)?$/)
    if (match && !match[1].startsWith('*')) {
      const topic = match[1].trim()
      const date = match[2] ? match[2] + 'T00:00:00Z' : null
      entries.push({
        topic,
        date,
        addedAt: date || '2025-12-29T00:00:00Z'
      })
    }
  }

  // Sort by date (newest first)
  entries.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))

  return entries
}

async function build() {
  console.log('Building notes...')

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
  }

  const files = await readdir(MEMORY_DIR)
  const mdFiles = files.filter(f => f.endsWith('.md'))

  const index = []

  for (const file of mdFiles) {
    const content = await readFile(join(MEMORY_DIR, file), 'utf-8')
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

  // Parse and write reflections data
  const reflectionsPath = join(MEMORY_DIR, 'reflections.md')
  if (existsSync(reflectionsPath)) {
    const reflectionsContent = await readFile(reflectionsPath, 'utf-8')
    const reflections = parseReflections(reflectionsContent)
    await writeFile(
      './public/reflections.json',
      JSON.stringify(reflections, null, 2)
    )
    console.log(`  ✓ reflections.json (${reflections.length} entries)`)
  }

  // Parse and write dev-diary data
  const devDiaryPath = join(MEMORY_DIR, 'dev-diary.md')
  if (existsSync(devDiaryPath)) {
    const devDiaryContent = await readFile(devDiaryPath, 'utf-8')
    const devDiary = parseDevDiary(devDiaryContent)
    await writeFile(
      './public/dev-diary.json',
      JSON.stringify(devDiary, null, 2)
    )
    console.log(`  ✓ dev-diary.json (${devDiary.length} entries)`)
  }

  // Parse and write priorities data
  const prioritiesPath = join(MEMORY_DIR, 'priorities.md')
  if (existsSync(prioritiesPath)) {
    const prioritiesContent = await readFile(prioritiesPath, 'utf-8')
    const priorities = parsePriorities(prioritiesContent)
    await writeFile(
      './public/priorities.json',
      JSON.stringify(priorities, null, 2)
    )
    console.log(`  ✓ priorities.json (${priorities.length} entries)`)
  }

  // Parse and write search-topics data
  const searchTopicsPath = join(MEMORY_DIR, 'search-topics.md')
  if (existsSync(searchTopicsPath)) {
    const searchTopicsContent = await readFile(searchTopicsPath, 'utf-8')
    const searchTopics = parseSearchTopics(searchTopicsContent)
    await writeFile(
      './public/search-topics.json',
      JSON.stringify(searchTopics, null, 2)
    )
    console.log(`  ✓ search-topics.json (${searchTopics.length} topics)`)
  }

  console.log(`\nBuilt ${mdFiles.length} notes.`)
}

build().catch(console.error)
