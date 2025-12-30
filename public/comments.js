// Liveblocks Pin Comments - CDN-based React implementation
// Uses @liveblocks/react hooks with dynamic imports from esm.sh

const LIVEBLOCKS_PUBLIC_KEY = window.LIVEBLOCKS_PUBLIC_KEY || ''
const ROOM_ID = window.COMMENTS_ROOM_ID || 'default-room'

if (!LIVEBLOCKS_PUBLIC_KEY) {
  console.warn('Comments: No Liveblocks public key configured')
}

// Dynamic module loader
async function loadModules() {
  const [
    { createClient },
    { createRoomContext },
    React,
    ReactDOM
  ] = await Promise.all([
    import('https://esm.sh/@liveblocks/client@2.17.0'),
    import('https://esm.sh/@liveblocks/react@2.17.0'),
    Promise.resolve(window.React),
    Promise.resolve(window.ReactDOM),
  ])

  return { createClient, createRoomContext, React, ReactDOM }
}

async function init() {
  if (!LIVEBLOCKS_PUBLIC_KEY) {
    const container = document.getElementById('comments-root')
    if (container) {
      container.innerHTML = '<div class="comments-disabled">Comments coming soon</div>'
    }
    return
  }

  const { createClient, createRoomContext, React, ReactDOM } = await loadModules()

  // Create Liveblocks client
  const client = createClient({
    publicApiKey: LIVEBLOCKS_PUBLIC_KEY,
  })

  // Create room context with comments enabled
  const { RoomProvider, useThreads, useCreateThread, useEditThreadMetadata } = createRoomContext(client)

  // Generate user ID for guests
  let userId = localStorage.getItem('comments_user_id')
  if (!userId) {
    userId = 'guest_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('comments_user_id', userId)
  }

  // Pin Comments App
  function App() {
    return React.createElement(RoomProvider, {
      id: ROOM_ID,
      initialPresence: {},
    }, React.createElement(PinComments))
  }

  // Main pin comments component
  function PinComments() {
    const [activePin, setActivePin] = React.useState(null)
    const [isPlacing, setIsPlacing] = React.useState(false)
    const [newCommentText, setNewCommentText] = React.useState('')
    const containerRef = React.useRef(null)

    // Get threads from Liveblocks
    const { threads, isLoading } = useThreads()
    const createThread = useCreateThread()

    // Filter threads that have position metadata (pins)
    const pins = React.useMemo(() => {
      if (!threads) return []
      return threads
        .filter(t => t.metadata?.x !== undefined && t.metadata?.y !== undefined)
        .map(t => ({
          id: t.id,
          x: Number(t.metadata.x),
          y: Number(t.metadata.y),
          commentCount: t.comments?.length || 0,
          resolved: t.resolved,
        }))
    }, [threads])

    // Handle click to place new pin
    const handleContainerClick = React.useCallback((e) => {
      if (!isPlacing) return

      const rect = document.documentElement.getBoundingClientRect()
      const scrollY = window.scrollY || document.documentElement.scrollTop
      const x = (e.clientX / window.innerWidth) * 100
      const y = ((e.clientY + scrollY) / document.documentElement.scrollHeight) * 100

      // Show comment input at this position
      setActivePin({ isNew: true, x, y })
      setIsPlacing(false)
    }, [isPlacing])

    // Create new thread with position
    const handleCreateThread = React.useCallback(async () => {
      if (!activePin?.isNew || !newCommentText.trim()) return

      try {
        const thread = createThread({
          body: {
            version: 1,
            content: [{ type: 'paragraph', children: [{ text: newCommentText.trim() }] }],
          },
          metadata: {
            x: String(activePin.x),
            y: String(activePin.y),
          },
        })
        setActivePin({ id: thread.id, x: activePin.x, y: activePin.y })
        setNewCommentText('')
      } catch (err) {
        console.error('Failed to create thread:', err)
      }
    }, [activePin, newCommentText, createThread])

    // Render
    return React.createElement('div', {
      ref: containerRef,
      className: 'comments-container' + (isPlacing ? ' placing' : ''),
      onClick: handleContainerClick,
    }, [
      // Floating add button
      React.createElement('button', {
        key: 'add-btn',
        className: 'comments-add-btn',
        onClick: (e) => {
          e.stopPropagation()
          setIsPlacing(!isPlacing)
          setActivePin(null)
        },
        title: isPlacing ? 'Cancel' : 'Add comment',
      }, isPlacing ? '\u2715' : '+'),

      // Loading indicator
      isLoading && React.createElement('div', {
        key: 'loading',
        className: 'comments-loading',
      }, 'Loading comments...'),

      // Render existing pins
      ...pins.map(pin =>
        React.createElement('div', {
          key: pin.id,
          className: 'comment-pin' + (activePin?.id === pin.id ? ' active' : '') + (pin.resolved ? ' resolved' : ''),
          style: {
            left: pin.x + '%',
            top: pin.y + '%',
          },
          onClick: (e) => {
            e.stopPropagation()
            setActivePin(activePin?.id === pin.id ? null : pin)
          },
        }, [
          React.createElement('div', { key: 'dot', className: 'pin-dot' }),
          pin.commentCount > 1 && React.createElement('span', {
            key: 'count',
            className: 'pin-count',
          }, pin.commentCount),
        ])
      ),

      // New comment input (when placing)
      activePin?.isNew && React.createElement('div', {
        key: 'new-panel',
        className: 'thread-panel',
        style: {
          left: Math.min(activePin.x, 70) + '%',
          top: activePin.y + '%',
        },
        onClick: e => e.stopPropagation(),
      }, [
        React.createElement('div', { key: 'header', className: 'thread-header' }, [
          React.createElement('span', { key: 'title' }, 'New comment'),
          React.createElement('button', {
            key: 'close',
            onClick: () => setActivePin(null),
            className: 'thread-close',
          }, '\u2715'),
        ]),
        React.createElement('form', {
          key: 'form',
          className: 'thread-form',
          onSubmit: (e) => {
            e.preventDefault()
            handleCreateThread()
          },
        }, [
          React.createElement('input', {
            key: 'input',
            type: 'text',
            value: newCommentText,
            onChange: e => setNewCommentText(e.target.value),
            placeholder: 'Write a comment...',
            className: 'thread-input',
            autoFocus: true,
          }),
          React.createElement('button', {
            key: 'submit',
            type: 'submit',
            className: 'thread-submit',
            disabled: !newCommentText.trim(),
          }, 'Post'),
        ]),
      ]),

      // Existing thread panel
      activePin && !activePin.isNew && React.createElement(ThreadPanel, {
        key: 'panel',
        threadId: activePin.id,
        pin: activePin,
        threads: threads,
        onClose: () => setActivePin(null),
      }),

      // Placing mode hint
      isPlacing && React.createElement('div', {
        key: 'hint',
        className: 'comments-hint',
      }, 'Click anywhere to add a comment'),
    ])
  }

  // Thread panel component
  function ThreadPanel({ threadId, pin, threads, onClose }) {
    const thread = threads?.find(t => t.id === threadId)

    if (!thread) {
      return React.createElement('div', {
        className: 'thread-panel',
        style: { left: Math.min(pin.x, 70) + '%', top: pin.y + '%' },
      }, React.createElement('div', { className: 'thread-loading' }, 'Loading...'))
    }

    return React.createElement('div', {
      className: 'thread-panel',
      style: {
        left: Math.min(pin.x, 70) + '%',
        top: pin.y + '%',
      },
      onClick: e => e.stopPropagation(),
    }, [
      React.createElement('div', { key: 'header', className: 'thread-header' }, [
        React.createElement('span', { key: 'title' }, `${thread.comments?.length || 0} comment${thread.comments?.length !== 1 ? 's' : ''}`),
        React.createElement('button', {
          key: 'close',
          onClick: onClose,
          className: 'thread-close',
        }, '\u2715'),
      ]),

      React.createElement('div', { key: 'comments', className: 'thread-comments' },
        thread.comments?.map((comment, i) =>
          React.createElement('div', { key: comment.id || i, className: 'thread-comment' }, [
            React.createElement('div', { key: 'meta', className: 'comment-meta' },
              new Date(comment.createdAt).toLocaleString()
            ),
            React.createElement('div', { key: 'body', className: 'comment-body' },
              extractTextFromBody(comment.body)
            ),
          ])
        )
      ),

      // Note: Adding replies requires useCreateComment hook, omitted for simplicity
      React.createElement('div', {
        key: 'note',
        className: 'thread-note',
      }, 'Reply feature coming soon'),
    ])
  }

  // Extract plain text from Liveblocks comment body
  function extractTextFromBody(body) {
    if (typeof body === 'string') return body
    if (!body?.content) return ''

    return body.content
      .map(block => {
        if (block.children) {
          return block.children.map(child => child.text || '').join('')
        }
        return ''
      })
      .join('\n')
  }

  // Mount the app
  const container = document.getElementById('comments-root')
  if (container) {
    const root = ReactDOM.createRoot(container)
    root.render(React.createElement(App))
  }
}

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
