// Direct messages between users. Needs common.js.
//
// Backend endpoints this page expects (all need the JWT, like the task endpoints):
//   GET  /users                         -> [{id, username}]                      everyone you can message
//   GET  /messages/conversations        -> [{userId, username, lastMessage, lastSentAt, unreadCount}]
//   GET  /messages/{userId}             -> [{id, senderId, recipientId, content, sentAt}]   oldest first
//   POST /messages/{userId}  {content}  -> the created message
//   PUT  /messages/{userId}/read        -> marks that user's messages to you as read (response body ignored)

const MESSAGES_URL = BASE_URL + '/messages'
const POLL_MS = 5000

let users = []
let conversations = []
let activeUserId = null
let messages = []

// ---------- loading ----------

// A 404 means the backend endpoints don't exist yet; show a notice instead of alert popups
function isMissingEndpoint(err) {
  return /Server responded 404/.test(err.message)
}

function showUnavailable() {
  document.getElementById('messages-unavailable').hidden = false
  document.getElementById('messages-view').classList.add('is-unavailable')
  clearInterval(pollTimer)
}

async function loadUsers() {
  try {
    users = ((await request(BASE_URL + '/users')) || []).filter(u => u.id !== currentUser?.id)
  } catch (err) {
    console.error('Error loading users', err)
    users = []
  }
  renderUserPicker()
}

async function loadConversations() {
  try {
    conversations = (await request(`${MESSAGES_URL}/conversations`)) || []
  } catch (err) {
    console.error('Error loading conversations', err)
    if (isMissingEndpoint(err)) showUnavailable()
    return
  }
  renderConversations()
}

async function loadThread({scrollToEnd = false} = {}) {
  if (activeUserId == null) return
  const userId = activeUserId
  let loaded
  try {
    loaded = (await request(`${MESSAGES_URL}/${userId}`)) || []
  } catch (err) {
    console.error('Error loading messages', err)
    if (isMissingEndpoint(err)) showUnavailable()
    return
  }
  if (userId !== activeUserId) return   // switched conversation while loading

  const changed = loaded.length !== messages.length ||
    loaded[loaded.length - 1]?.id !== messages[messages.length - 1]?.id
  messages = loaded
  if (changed || scrollToEnd) renderThread(scrollToEnd)
}

// ---------- rendering ----------

function initials(name) {
  return (name || '?').trim().slice(0, 2).toUpperCase()
}

function nameOf(userId) {
  return users.find(u => u.id === userId)?.username ||
    conversations.find(c => c.userId === userId)?.username || 'Unknown user'
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})
}

// "10:42 AM" today, "Mon" this week, "Sep 3" otherwise
function formatShort(value) {
  const date = new Date(value)
  const today = startOfToday()
  if (date >= today) return formatTime(value)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 6)
  if (date >= weekAgo) return date.toLocaleDateString('en-US', {weekday: 'short'})
  return formatDate(value)
}

function formatDay(value) {
  const date = new Date(value)
  const today = startOfToday()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date >= today) return 'Today'
  if (date >= yesterday) return 'Yesterday'
  return date.toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'})
}

function renderUserPicker() {
  const picker = document.getElementById('new-conversation')
  picker.innerHTML = '<option value="">+ New message</option>' +
    users.map(u => `<option value="${u.id}">${escapeHtml(u.username)}</option>`).join('')
}

function renderConversations() {
  const query = document.getElementById('search').value.trim().toLowerCase()
  const shown = conversations
    .filter(c => !query || c.username.toLowerCase().includes(query))
    .sort((a, b) => new Date(b.lastSentAt) - new Date(a.lastSentAt))

  const list = document.getElementById('conversation-list')
  if (!shown.length) {
    list.innerHTML = `<li class="conversation-empty">${query ? 'No matches' : 'No conversations yet'}</li>`
    return
  }
  list.innerHTML = shown.map(c => `
    <li class="conversation ${c.userId === activeUserId ? 'is-active' : ''} ${c.unreadCount ? 'is-unread' : ''}"
        data-id="${c.userId}">
      <span class="avatar">${escapeHtml(initials(c.username))}</span>
      <div class="conversation-body">
        <div class="conversation-top">
          <span class="conversation-name">${escapeHtml(c.username)}</span>
          <span class="conversation-time">${c.lastSentAt ? formatShort(c.lastSentAt) : ''}</span>
        </div>
        <div class="conversation-bottom">
          <span class="conversation-preview">${escapeHtml(c.lastMessage || '')}</span>
          ${c.unreadCount ? `<span class="unread-count">${c.unreadCount}</span>` : ''}
        </div>
      </div>
    </li>`).join('')
}

function renderThread(scrollToEnd) {
  const box = document.getElementById('thread-messages')
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60

  let html = ''
  let lastDay = null
  for (const m of messages) {
    const day = formatDay(m.sentAt)
    if (day !== lastDay) {
      html += `<div class="day-divider"><span>${day}</span></div>`
      lastDay = day
    }
    const mine = m.senderId === currentUser?.id
    html += `
      <div class="message ${mine ? 'is-mine' : ''} ${m.pending ? 'is-pending' : ''}">
        <div class="bubble">${escapeHtml(m.content)}</div>
        <span class="message-time">${m.pending ? 'Sending…' : formatTime(m.sentAt)}</span>
      </div>`
  }
  box.innerHTML = html || '<p class="thread-start">No messages yet. Say hello!</p>'

  // keep the reader's place unless they were already at the bottom
  if (scrollToEnd || nearBottom) box.scrollTop = box.scrollHeight
}

// ---------- actions ----------

async function openConversation(userId) {
  activeUserId = userId
  messages = []
  history.replaceState(null, '', `#user=${userId}`)

  const name = nameOf(userId)
  document.getElementById('thread-empty').hidden = true
  document.getElementById('thread-head').hidden = false
  document.getElementById('thread-messages').hidden = false
  document.getElementById('compose').hidden = false
  document.getElementById('thread-name').textContent = name
  document.getElementById('thread-avatar').textContent = initials(name)
  document.getElementById('messages-view').classList.add('has-thread')
  document.getElementById('thread-messages').innerHTML = ''

  renderConversations()
  await loadThread({scrollToEnd: true})
  document.getElementById('compose-text').focus()
  markRead(userId)
}

function closeConversation() {
  activeUserId = null
  history.replaceState(null, '', location.pathname)
  document.getElementById('messages-view').classList.remove('has-thread')
  document.getElementById('thread-empty').hidden = false
  for (const id of ['thread-head', 'thread-messages', 'compose']) {
    document.getElementById(id).hidden = true
  }
  renderConversations()
}

async function markRead(userId) {
  const conversation = conversations.find(c => c.userId === userId)
  if (!conversation?.unreadCount) return
  try {
    await request(`${MESSAGES_URL}/${userId}/read`, {method: 'PUT'})
    conversation.unreadCount = 0
    renderConversations()
  } catch (err) {
    console.error('Error marking messages as read', err)
  }
}

async function sendMessage(event) {
  event.preventDefault()
  const input = document.getElementById('compose-text')
  const content = input.value.trim()
  if (!content || activeUserId == null) return

  // show the message right away, replace it with the saved one when the server answers
  const pending = {id: `pending-${Date.now()}`, senderId: currentUser?.id, content,
    sentAt: new Date().toISOString(), pending: true}
  messages.push(pending)
  renderThread(true)
  input.value = ''
  autoGrow(input)

  try {
    const saved = await request(`${MESSAGES_URL}/${activeUserId}`, {
      method: 'POST',
      body: JSON.stringify({content})
    })
    messages[messages.indexOf(pending)] = saved && saved !== true ? saved : {...pending, pending: false}
  } catch (err) {
    console.error('Error sending message', err)
    messages.splice(messages.indexOf(pending), 1)
    input.value = content
    alert('Could not send the message')
  }
  renderThread(true)
  loadConversations()
}

function autoGrow(textarea) {
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px'
}

// ---------- wiring ----------

document.getElementById('conversation-list').addEventListener('click', event => {
  const item = event.target.closest('.conversation')
  if (item) openConversation(Number(item.dataset.id))
})

document.getElementById('new-conversation').addEventListener('change', event => {
  const userId = Number(event.target.value)
  event.target.value = ''
  if (!userId) return
  // show the new conversation in the list until the first message makes it real
  if (!conversations.some(c => c.userId === userId)) {
    conversations.push({userId, username: nameOf(userId), lastMessage: '', lastSentAt: new Date().toISOString(), unreadCount: 0})
  }
  openConversation(userId)
})

document.getElementById('compose').addEventListener('submit', sendMessage)
document.getElementById('compose-text').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) sendMessage(event)
})
document.getElementById('compose-text').addEventListener('input', event => autoGrow(event.target))
document.getElementById('thread-back').addEventListener('click', closeConversation)
document.getElementById('search').addEventListener('input', renderConversations)

// check for new messages every few seconds (skipped while the tab is hidden)
const pollTimer = setInterval(() => {
  if (document.hidden) return
  loadConversations()
  loadThread()
}, POLL_MS)

currentUserReady.then(async () => {
  await Promise.all([loadUsers(), loadConversations()])
  // messages.html#user=5 opens that conversation, e.g. from the admin panel
  const linked = Number(new URLSearchParams(location.hash.slice(1)).get('user'))
  if (linked) {
    if (!conversations.some(c => c.userId === linked)) {
      conversations.push({userId: linked, username: nameOf(linked), lastMessage: '', lastSentAt: new Date().toISOString(), unreadCount: 0})
    }
    openConversation(linked)
  }
})
