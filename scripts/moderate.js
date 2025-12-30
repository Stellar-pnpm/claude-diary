#!/usr/bin/env node
/**
 * Liveblocks Comment Moderation CLI
 *
 * Usage:
 *   node scripts/moderate.js list [roomId]     - List all threads (optionally filter by room)
 *   node scripts/moderate.js delete <threadId> - Delete a thread
 *   node scripts/moderate.js rooms             - List all rooms
 *
 * Requires LIVEBLOCKS_SECRET_KEY environment variable
 */

const SECRET_KEY = process.env.LIVEBLOCKS_SECRET_KEY

if (!SECRET_KEY) {
  console.error('Error: LIVEBLOCKS_SECRET_KEY environment variable required')
  console.error('Get it from: https://liveblocks.io/dashboard')
  process.exit(1)
}

const API_BASE = 'https://api.liveblocks.io/v2'

async function api(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }

  if (res.status === 204) return null
  return res.json()
}

async function listRooms() {
  const data = await api('/rooms')
  return data.data || []
}

async function listThreads(roomId) {
  const data = await api(`/rooms/${encodeURIComponent(roomId)}/threads`)
  return data.data || []
}

async function deleteThread(roomId, threadId) {
  await api(`/rooms/${encodeURIComponent(roomId)}/threads/${threadId}`, {
    method: 'DELETE',
  })
}

function formatDate(iso) {
  return new Date(iso).toLocaleString()
}

function extractText(body) {
  if (typeof body === 'string') return body
  if (!body?.content) return '[empty]'
  return body.content
    .map(block => block.children?.map(c => c.text || '').join('') || '')
    .join(' ')
    .slice(0, 100)
}

// Commands
async function cmdRooms() {
  console.log('Fetching rooms...\n')
  const rooms = await listRooms()

  if (rooms.length === 0) {
    console.log('No rooms found.')
    return
  }

  console.log(`Found ${rooms.length} room(s):\n`)
  for (const room of rooms) {
    console.log(`  ${room.id}`)
    if (room.metadata) {
      console.log(`    metadata: ${JSON.stringify(room.metadata)}`)
    }
  }
}

async function cmdList(filterRoomId) {
  console.log('Fetching rooms...\n')
  const rooms = await listRooms()

  if (rooms.length === 0) {
    console.log('No rooms found.')
    return
  }

  const targetRooms = filterRoomId
    ? rooms.filter(r => r.id === filterRoomId || r.id.includes(filterRoomId))
    : rooms

  if (targetRooms.length === 0) {
    console.log(`No rooms matching "${filterRoomId}"`)
    return
  }

  let totalThreads = 0

  for (const room of targetRooms) {
    const threads = await listThreads(room.id)
    if (threads.length === 0) continue

    console.log(`\n📁 Room: ${room.id}`)
    console.log('─'.repeat(50))

    for (const thread of threads) {
      totalThreads++
      const pos = thread.metadata?.x && thread.metadata?.y
        ? ` @ (${Number(thread.metadata.x).toFixed(1)}%, ${Number(thread.metadata.y).toFixed(1)}%)`
        : ''

      console.log(`\n  🧵 Thread: ${thread.id}${pos}`)
      console.log(`     Created: ${formatDate(thread.createdAt)}`)

      if (thread.comments?.length > 0) {
        for (const comment of thread.comments) {
          const text = extractText(comment.body)
          console.log(`     💬 ${formatDate(comment.createdAt)}: "${text}"`)
        }
      }

      console.log(`     [Delete: node scripts/moderate.js delete ${thread.id}]`)
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Total: ${totalThreads} thread(s) in ${targetRooms.length} room(s)`)
}

async function cmdDelete(threadId) {
  if (!threadId) {
    console.error('Error: Thread ID required')
    console.error('Usage: node scripts/moderate.js delete <threadId>')
    process.exit(1)
  }

  console.log(`Finding thread ${threadId}...`)

  // Find which room contains this thread
  const rooms = await listRooms()
  let found = false

  for (const room of rooms) {
    const threads = await listThreads(room.id)
    const thread = threads.find(t => t.id === threadId)

    if (thread) {
      found = true
      console.log(`Found in room: ${room.id}`)

      const text = thread.comments?.[0]
        ? extractText(thread.comments[0].body)
        : '[no comments]'
      console.log(`Content: "${text}"`)

      // Confirm deletion
      console.log('\nDeleting...')
      await deleteThread(room.id, threadId)
      console.log('✅ Deleted successfully')
      return
    }
  }

  if (!found) {
    console.error(`Thread ${threadId} not found in any room`)
    process.exit(1)
  }
}

// Main
async function main() {
  const [,, command, arg] = process.argv

  try {
    switch (command) {
      case 'rooms':
        await cmdRooms()
        break
      case 'list':
        await cmdList(arg)
        break
      case 'delete':
        await cmdDelete(arg)
        break
      default:
        console.log(`Liveblocks Comment Moderation CLI

Usage:
  node scripts/moderate.js rooms             List all rooms
  node scripts/moderate.js list [roomId]     List all threads (filter by room)
  node scripts/moderate.js delete <threadId> Delete a thread

Environment:
  LIVEBLOCKS_SECRET_KEY  Your Liveblocks secret key (required)

Examples:
  LIVEBLOCKS_SECRET_KEY=sk_xxx node scripts/moderate.js list
  LIVEBLOCKS_SECRET_KEY=sk_xxx node scripts/moderate.js list log-2025-12-30
  LIVEBLOCKS_SECRET_KEY=sk_xxx node scripts/moderate.js delete th_abc123
`)
    }
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

main()
