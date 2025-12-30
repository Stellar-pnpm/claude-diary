import { createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'

// Public key is safe to expose - it's read from window at runtime
const publicKey = (window as any).LIVEBLOCKS_PUBLIC_KEY || ''

export const client = createClient({
  publicApiKey: publicKey,
})

export const {
  RoomProvider,
  useThreads,
  useCreateThread,
  useDeleteThread,
} = createRoomContext(client)
