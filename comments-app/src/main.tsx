import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RoomProvider } from './liveblocks.config'
import { Comments } from './Comments'

function App() {
  const roomId = (window as any).COMMENTS_ROOM_ID || window.location.pathname

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
    >
      <Comments />
    </RoomProvider>
  )
}

function init() {
  const container = document.getElementById('comments-root')
  if (!container) {
    console.warn('Comments: #comments-root not found')
    return
  }

  // Check for public key
  const publicKey = (window as any).LIVEBLOCKS_PUBLIC_KEY
  if (!publicKey) {
    container.innerHTML = '<div class="comments-disabled">Comments disabled (no API key)</div>'
    return
  }

  const root = createRoot(container)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
