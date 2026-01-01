#!/usr/bin/env node

import { readdir, readFile, writeFile, mkdir, copyFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const LOGS_DIR = './logs'
const OUTPUT_DIR = './public'
const GALLERY_DIR = './public/gallery'

async function build() {
  console.log('Building gallery...')

  // Ensure gallery directory exists
  if (!existsSync(GALLERY_DIR)) {
    await mkdir(GALLERY_DIR, { recursive: true })
  }

  const gallery = []

  // Get all date directories
  const dates = await readdir(LOGS_DIR)
  const dateDirs = dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse()

  for (const date of dateDirs) {
    const dateDir = join(LOGS_DIR, date)
    const files = await readdir(dateDir)
    const jsonFiles = files.filter(f => f.endsWith('.json'))

    for (const jsonFile of jsonFiles) {
      try {
        const content = await readFile(join(dateDir, jsonFile), 'utf-8')
        const log = JSON.parse(content)

        // Check if this run has artwork
        if (log.artworkPngPath && existsSync(log.artworkPngPath)) {
          const runId = jsonFile.replace('.json', '')
          const pngDest = `gallery/${date}-${runId}.png`

          // Copy PNG to public gallery folder
          await copyFile(log.artworkPngPath, join(OUTPUT_DIR, pngDest))

          gallery.push({
            id: runId,
            date: date,
            title: log.artworkTitle || 'Untitled',
            alt: log.artworkAlt || '',
            src: `/${pngDest}`,
            logUrl: `/logs/${date}/${runId}.html`,
            createdAt: log.startedAt || `${date}T00:00:00Z`
          })
        }
      } catch (err) {
        // Skip invalid files
        console.warn(`  ⚠ Could not process ${jsonFile}: ${err.message}`)
      }
    }
  }

  // Sort by date (newest first)
  gallery.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // Write gallery JSON
  await writeFile(
    join(OUTPUT_DIR, 'gallery.json'),
    JSON.stringify(gallery, null, 2)
  )

  console.log(`  ✓ gallery.json (${gallery.length} artworks)`)
  console.log(`  ✓ Copied ${gallery.length} images to /gallery/`)
}

build().catch(console.error)
