import { useState, useCallback } from 'react'
import { useThreads, useCreateThread, useDeleteThread } from './liveblocks.config'
import { Thread, Composer } from '@liveblocks/react-ui'
import '@liveblocks/react-ui/styles.css'

interface PinPosition {
  x: number
  y: number
}

export function Comments() {
  const { threads } = useThreads()
  const createThread = useCreateThread()
  const deleteThread = useDeleteThread()

  const [isPlacing, setIsPlacing] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [newPinPosition, setNewPinPosition] = useState<PinPosition | null>(null)

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (!isPlacing) return

    const scrollY = window.scrollY || document.documentElement.scrollTop
    const x = (e.clientX / window.innerWidth) * 100
    const y = ((e.clientY + scrollY) / document.documentElement.scrollHeight) * 100

    setNewPinPosition({ x, y })
    setIsPlacing(false)
  }, [isPlacing])

  const handleCreateThread = useCallback((body: any) => {
    if (!newPinPosition) return

    createThread({
      body,
      metadata: {
        x: newPinPosition.x.toString(),
        y: newPinPosition.y.toString(),
      },
    })

    setNewPinPosition(null)
  }, [createThread, newPinPosition])

  const handleDeleteThread = useCallback((threadId: string) => {
    deleteThread(threadId)
    setActiveThreadId(null)
  }, [deleteThread])

  return (
    <div
      className={`comments-container ${isPlacing ? 'placing' : ''}`}
      onClick={handleContainerClick}
    >
      {/* Add button */}
      <button
        className="comments-add-btn"
        onClick={(e) => {
          e.stopPropagation()
          setIsPlacing(!isPlacing)
          setActiveThreadId(null)
          setNewPinPosition(null)
        }}
      >
        {isPlacing ? '×' : '+'}
      </button>

      {/* Hint when placing */}
      {isPlacing && (
        <div className="comments-hint">
          Click anywhere to add a comment
        </div>
      )}

      {/* Existing pins */}
      {threads?.map((thread) => {
        const x = parseFloat(thread.metadata?.x as string) || 0
        const y = parseFloat(thread.metadata?.y as string) || 0
        const isActive = activeThreadId === thread.id

        return (
          <div key={thread.id}>
            <div
              className={`comment-pin ${isActive ? 'active' : ''}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={(e) => {
                e.stopPropagation()
                setActiveThreadId(isActive ? null : thread.id)
              }}
            >
              <div className="pin-dot" />
              {thread.comments.length > 1 && (
                <span className="pin-count">{thread.comments.length}</span>
              )}
            </div>

            {isActive && (
              <div
                className="thread-panel"
                style={{ left: `${Math.min(x, 70)}%`, top: `${y}%` }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="thread-header">
                  <span>Thread</span>
                  <button
                    className="thread-close"
                    onClick={() => setActiveThreadId(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="thread-content">
                  <Thread thread={thread} />
                </div>
                <div className="thread-actions">
                  <button
                    className="thread-delete"
                    onClick={() => handleDeleteThread(thread.id)}
                  >
                    Delete thread
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* New comment form */}
      {newPinPosition && (
        <>
          <div
            className="comment-pin active"
            style={{ left: `${newPinPosition.x}%`, top: `${newPinPosition.y}%` }}
          >
            <div className="pin-dot" />
          </div>
          <div
            className="thread-panel"
            style={{
              left: `${Math.min(newPinPosition.x, 70)}%`,
              top: `${newPinPosition.y}%`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="thread-header">
              <span>New comment</span>
              <button
                className="thread-close"
                onClick={() => setNewPinPosition(null)}
              >
                ×
              </button>
            </div>
            <div className="thread-content">
              <Composer
                onComposerSubmit={({ body }) => {
                  handleCreateThread(body)
                }}
                placeholder="Write a comment..."
                autoFocus
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
