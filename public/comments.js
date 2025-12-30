// Simple Pin Comments - localStorage-based prototype
// Will upgrade to Liveblocks with proper build setup later

const STORAGE_KEY = 'claude-diary-comments'

// Get room ID from page
const roomId = window.COMMENTS_ROOM_ID || window.location.pathname

// Load comments from localStorage
function loadComments() {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return all[roomId] || []
  } catch {
    return []
  }
}

// Save comments to localStorage
function saveComments(comments) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    all[roomId] = comments
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch (e) {
    console.error('Failed to save comments:', e)
  }
}

// Generate simple ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// Create the comments UI
function init() {
  const container = document.getElementById('comments-root')
  if (!container) return

  let comments = loadComments()
  let isPlacing = false
  let activeComment = null

  // Create main container
  const wrapper = document.createElement('div')
  wrapper.className = 'comments-container'
  container.appendChild(wrapper)

  // Create add button
  const addBtn = document.createElement('button')
  addBtn.className = 'comments-add-btn'
  addBtn.textContent = '+'
  addBtn.title = 'Add comment'
  wrapper.appendChild(addBtn)

  // Create hint
  const hint = document.createElement('div')
  hint.className = 'comments-hint'
  hint.textContent = 'Click anywhere to add a comment'
  hint.style.display = 'none'
  wrapper.appendChild(hint)

  // Render all pins
  function renderPins() {
    // Remove existing pins
    wrapper.querySelectorAll('.comment-pin').forEach(el => el.remove())
    wrapper.querySelectorAll('.thread-panel').forEach(el => el.remove())

    comments.forEach(comment => {
      const pin = document.createElement('div')
      pin.className = 'comment-pin' + (activeComment === comment.id ? ' active' : '')
      pin.style.left = comment.x + '%'
      pin.style.top = comment.y + '%'

      const dot = document.createElement('div')
      dot.className = 'pin-dot'
      pin.appendChild(dot)

      pin.addEventListener('click', (e) => {
        e.stopPropagation()
        activeComment = activeComment === comment.id ? null : comment.id
        renderPins()
      })

      wrapper.appendChild(pin)

      // Show panel if active
      if (activeComment === comment.id) {
        const panel = createPanel(comment)
        wrapper.appendChild(panel)
      }
    })
  }

  // Create comment panel
  function createPanel(comment) {
    const panel = document.createElement('div')
    panel.className = 'thread-panel'
    panel.style.left = Math.min(comment.x, 70) + '%'
    panel.style.top = comment.y + '%'

    panel.innerHTML = `
      <div class="thread-header">
        <span>Comment</span>
        <button class="thread-close">&times;</button>
      </div>
      <div class="thread-comments">
        <div class="thread-comment">
          <div class="comment-meta">${new Date(comment.createdAt).toLocaleString()}</div>
          <div class="comment-body">${escapeHtml(comment.text)}</div>
        </div>
      </div>
      <div class="thread-actions">
        <button class="thread-delete">Delete</button>
      </div>
    `

    panel.querySelector('.thread-close').addEventListener('click', (e) => {
      e.stopPropagation()
      activeComment = null
      renderPins()
    })

    panel.querySelector('.thread-delete').addEventListener('click', (e) => {
      e.stopPropagation()
      comments = comments.filter(c => c.id !== comment.id)
      saveComments(comments)
      activeComment = null
      renderPins()
    })

    panel.addEventListener('click', e => e.stopPropagation())

    return panel
  }

  // Create new comment form
  function createNewCommentForm(x, y) {
    // Remove existing forms
    wrapper.querySelectorAll('.new-comment-form').forEach(el => el.remove())

    const form = document.createElement('div')
    form.className = 'thread-panel new-comment-form'
    form.style.left = Math.min(x, 70) + '%'
    form.style.top = y + '%'

    form.innerHTML = `
      <div class="thread-header">
        <span>New comment</span>
        <button class="thread-close">&times;</button>
      </div>
      <form class="thread-form">
        <input type="text" class="thread-input" placeholder="Write a comment..." autofocus>
        <button type="submit" class="thread-submit">Post</button>
      </form>
    `

    form.querySelector('.thread-close').addEventListener('click', (e) => {
      e.stopPropagation()
      form.remove()
    })

    form.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault()
      const input = form.querySelector('input')
      const text = input.value.trim()
      if (!text) return

      const newComment = {
        id: generateId(),
        x,
        y,
        text,
        createdAt: new Date().toISOString()
      }

      comments.push(newComment)
      saveComments(comments)
      form.remove()
      activeComment = newComment.id
      renderPins()
    })

    form.addEventListener('click', e => e.stopPropagation())

    wrapper.appendChild(form)
    form.querySelector('input').focus()
  }

  // Handle add button click
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    isPlacing = !isPlacing
    wrapper.className = 'comments-container' + (isPlacing ? ' placing' : '')
    addBtn.textContent = isPlacing ? '×' : '+'
    hint.style.display = isPlacing ? 'block' : 'none'
    activeComment = null
    renderPins()

    // Remove any open forms
    if (!isPlacing) {
      wrapper.querySelectorAll('.new-comment-form').forEach(el => el.remove())
    }
  })

  // Handle click to place comment
  wrapper.addEventListener('click', (e) => {
    if (!isPlacing) return

    const scrollY = window.scrollY || document.documentElement.scrollTop
    const x = (e.clientX / window.innerWidth) * 100
    const y = ((e.clientY + scrollY) / document.documentElement.scrollHeight) * 100

    isPlacing = false
    wrapper.className = 'comments-container'
    addBtn.textContent = '+'
    hint.style.display = 'none'

    createNewCommentForm(x, y)
  })

  // Initial render
  renderPins()
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
