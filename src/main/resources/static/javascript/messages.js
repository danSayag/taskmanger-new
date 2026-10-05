// Conversations between users. Needs common.js.
//
// Backend endpoints this page expects (all need the JWT, like the task endpoints).
// Shapes match ConvoResponse / MessageResponse:
//   ConvoResponse   = {convoId, messages: [MessageResponse]}
//   MessageResponse = {messageId, senderId, getterId, content, sentAt?}   sentAt is optional (ISO string)
//
//   GET  /users                                -> [{id, username}]   everyone you can message
//   GET  /convo                                -> [ConvoResponse]    your conversations (admins: all of them)
//   POST /convo                {getterId, content} -> ConvoResponse  starts a conversation with its first message
//   POST /convo/{convoId}/messages {content}   -> MessageResponse    adds a message; the server works out
//                                                                    the getter (the other person in the convo)
//
// The sender is always the logged-in user; the server must take it from the token, never from the body.

const CONVO_URL = BASE_URL + '/convo'
const POLL_MS = 5000

let users = []
let convos = []
// the open conversation; convoId is null for a new conversation that has no messages yet
let active = null   // {convoId, otherId}
let pending = []    // messages being sent, shown greyed out until the server answers

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

async function loadConvos({scrollToEnd = false} = {}) {
  let loaded
  try {
    loaded = await request(CONVO_URL)
  } catch (err) {
    console.error('Error loading conversations', err)
    if (isMissingEndpoint(err)) showUnavailable()
    return
  }
  if (!Array.isArray(loaded)) return

  const before = active?.convoId != null ? lastMessageId(findConvo(active.convoId)) : null
  convos = loaded
  renderConversations()
  if (active?.convoId != null) {
    const changed = lastMessageId(findConvo(active.convoId)) !== before
    if (changed || scrollToEnd) renderThread(scrollToEnd)
  }
}

// ---------- conversation helpers ----------

function findConvo(convoId) {
  return convos.find(c => c.convoId === convoId)
}

function messagesOf(convo) {
  return [...(convo?.messages || [])].sort((a, b) => a.messageId - b.messageId)
}

function lastMessage(convo) {
  const list = messagesOf(convo)
  return list[list.length - 1]
}

function lastMessageId(convo) {
  return lastMessage(convo)?.messageId ?? null
}

// everyone who sent or got a message in the conversation
function participants(convo) {
  const ids = new Set()
  for (const m of convo.messages || []) {
    ids.add(m.senderId)
    ids.add(m.getterId)
  }
  return [...ids]
}

function isMember(convo) {
  return participants(convo).includes(currentUser?.id)
}

// the person on the other side; null when you're an admin reading someone else's conversation
function otherIdOf(convo) {
  if (!isMember(convo)) return null
  return participants(convo).find(id => id !== currentUser?.id) ?? null
}

function titleOf(convo) {
  if (isMember(convo)) return nameOf(otherIdOf(convo))
  return participants(convo).map(nameOf).join(' ↔ ')
}

function convoByUser(userId) {
  return convos.find(c => isMember(c) && otherIdOf(c) === userId)
}

// ---------- rendering ----------

function initials(name) {
  return (name || '?').trim().slice(0, 2).toUpperCase()
}

function nameOf(userId) {
  if (userId === currentUser?.id) return currentUser.username
  return users.find(u => u.id === userId)?.username || t('msg.unknownUser')
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString(LOCALE, {hour: 'numeric', minute: '2-digit'})
}

// "10:42 AM" today, "Mon" this week, "Sep 3" otherwise
function formatShort(value) {
  const date = new Date(value)
  const today = startOfToday()
  if (date >= today) return formatTime(value)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 6)
  if (date >= weekAgo) return date.toLocaleDateString(LOCALE, {weekday: 'short'})
  return formatDate(value)
}

function formatDay(value) {
  const date = new Date(value)
  const today = startOfToday()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date >= today) return t('msg.today')
  if (date >= yesterday) return t('msg.yesterday')
  return date.toLocaleDateString(LOCALE, {weekday: 'long', month: 'short', day: 'numeric'})
}

function renderUserPicker() {
  const picker = document.getElementById('new-conversation')
  picker.innerHTML = `<option value="">${t('msg.newMessage')}</option>` +
    users.map(u => `<option value="${u.id}">${escapeHtml(u.username)}</option>`).join('')
}

function renderConversations() {
  const query = document.getElementById('search').value.trim().toLowerCase()
  const shown = convos
    .filter(c => !query || titleOf(c).toLowerCase().includes(query))
    .sort((a, b) => (lastMessageId(b) ?? 0) - (lastMessageId(a) ?? 0))

  // a new conversation isn't on the server until its first message, so list it separately
  const draft = active && active.convoId == null && (!query || nameOf(active.otherId).toLowerCase().includes(query))
    ? `<li class="conversation is-active" data-user="${active.otherId}">
         <span class="avatar">${escapeHtml(initials(nameOf(active.otherId)))}</span>
         <div class="conversation-body">
           <div class="conversation-top"><span class="conversation-name">${escapeHtml(nameOf(active.otherId))}</span></div>
         </div>
       </li>`
    : ''

  const list = document.getElementById('conversation-list')
  if (!shown.length && !draft) {
    list.innerHTML = `<li class="conversation-empty">${t(query ? 'msg.noMatches' : 'msg.noConversations')}</li>`
    return
  }
  list.innerHTML = draft + shown.map(c => {
    const title = titleOf(c)
    const last = lastMessage(c)
    return `
      <li class="conversation ${c.convoId === active?.convoId ? 'is-active' : ''}" data-id="${c.convoId}">
        <span class="avatar">${escapeHtml(initials(title))}</span>
        <div class="conversation-body">
          <div class="conversation-top">
            <span class="conversation-name">${escapeHtml(title)}</span>
            <span class="conversation-time">${last?.sentAt ? formatShort(last.sentAt) : ''}</span>
          </div>
          <div class="conversation-bottom">
            <span class="conversation-preview">${escapeHtml(last?.content || '')}</span>
          </div>
        </div>
      </li>`
  }).join('')
}

function renderThread(scrollToEnd) {
  if (!active) return
  const box = document.getElementById('thread-messages')
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60
  const shown = [...messagesOf(findConvo(active.convoId)), ...pending]

  let html = ''
  let lastDay = null
  for (const m of shown) {
    if (m.sentAt) {
      const day = formatDay(m.sentAt)
      if (day !== lastDay) {
        html += `<div class="day-divider"><span>${day}</span></div>`
        lastDay = day
      }
    }
    const mine = m.senderId === currentUser?.id
    const time = m.pending ? t('msg.sending') : (m.sentAt ? formatTime(m.sentAt) : '')
    // in someone else's conversation (admin view) say who wrote each message
    const author = !mine && active.otherId == null ? `${escapeHtml(nameOf(m.senderId))} · ` : ''
    html += `
      <div class="message ${mine ? 'is-mine' : ''} ${m.pending ? 'is-pending' : ''}">
        <div class="bubble">${escapeHtml(m.content)}</div>
        <span class="message-time">${author}${time}</span>
      </div>`
  }
  box.innerHTML = html || `<p class="thread-start">${t('msg.sayHello')}</p>`

  // keep the reader's place unless they were already at the bottom
  if (scrollToEnd || nearBottom) box.scrollTop = box.scrollHeight
}

// ---------- actions ----------

function showThread(title, canWrite) {
  document.getElementById('thread-empty').hidden = true
  document.getElementById('thread-head').hidden = false
  document.getElementById('thread-messages').hidden = false
  document.getElementById('compose').hidden = !canWrite
  document.getElementById('thread-name').textContent = title
  document.getElementById('thread-avatar').textContent = initials(title)
  document.getElementById('messages-view').classList.add('has-thread')
  document.getElementById('thread-messages').innerHTML = ''
  pending = []
  renderConversations()
  renderThread(true)
  if (canWrite) document.getElementById('compose-text').focus()
}

function openConvo(convoId) {
  const convo = findConvo(convoId)
  if (!convo) return
  active = {convoId, otherId: otherIdOf(convo)}
  history.replaceState(null, '', `#convo=${convoId}`)
  // admins can read other people's conversations but not write in them
  showThread(titleOf(convo), isMember(convo))
}

// opens the conversation with this user, or an empty one if you haven't talked yet
function openWithUser(userId) {
  const existing = convoByUser(userId)
  if (existing) {
    openConvo(existing.convoId)
    return
  }
  active = {convoId: null, otherId: userId}
  history.replaceState(null, '', `#user=${userId}`)
  showThread(nameOf(userId), true)
}

function closeConversation() {
  active = null
  pending = []
  history.replaceState(null, '', location.pathname)
  document.getElementById('messages-view').classList.remove('has-thread')
  document.getElementById('thread-empty').hidden = false
  for (const id of ['thread-head', 'thread-messages', 'compose']) {
    document.getElementById(id).hidden = true
  }
  renderConversations()
}

async function sendMessage(event) {
  event.preventDefault()
  const input = document.getElementById('compose-text')
  const content = input.value.trim()
  if (!content || !active) return
  const target = active

  // show the message right away; the real one arrives with the server's answer
  const draft = {messageId: `pending-${Date.now()}`, senderId: currentUser?.id, content, pending: true}
  pending.push(draft)
  renderThread(true)
  input.value = ''
  autoGrow(input)

  try {
    if (target.convoId == null) {
      // first message: creates the conversation
      const created = await request(CONVO_URL, {
        method: 'POST',
        body: JSON.stringify({getterId: target.otherId, content})
      })
      if (created?.convoId != null && active === target) {
        active.convoId = created.convoId
        history.replaceState(null, '', `#convo=${created.convoId}`)
      }
    } else {
      await request(`${CONVO_URL}/${target.convoId}/messages`, {
        method: 'POST',
        body: JSON.stringify({content})
      })
    }
  } catch (err) {
    console.error('Error sending message', err)
    if (active === target) input.value = content
    alert(err.detail || t('err.sendMessage'))
  }
  pending = pending.filter(m => m !== draft)
  await loadConvos({scrollToEnd: true})
  if (active === target) renderThread(true)
}

function autoGrow(textarea) {
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px'
}

// ---------- wiring ----------

document.getElementById('conversation-list').addEventListener('click', event => {
  const item = event.target.closest('.conversation')
  if (!item) return
  if (item.dataset.id) openConvo(Number(item.dataset.id))
})

document.getElementById('new-conversation').addEventListener('change', event => {
  const userId = Number(event.target.value)
  event.target.value = ''
  if (userId) openWithUser(userId)
})

document.getElementById('compose').addEventListener('submit', sendMessage)
document.getElementById('compose-text').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) sendMessage(event)
})
document.getElementById('compose-text').addEventListener('input', event => autoGrow(event.target))
document.getElementById('thread-back').addEventListener('click', closeConversation)
document.getElementById('search').addEventListener('input', renderConversations)

// check for new messages every few seconds (skipped while the tab is hidden or a send is in flight)
const pollTimer = setInterval(() => {
  if (document.hidden || pending.length) return
  loadConvos()
}, POLL_MS)

currentUserReady.then(async () => {
  await Promise.all([loadUsers(), loadConvos()])
  // messages.html#convo=3 opens that conversation; #user=5 opens the one with that user (used by the admin panel)
  const params = new URLSearchParams(location.hash.slice(1))
  const convoId = Number(params.get('convo'))
  const userId = Number(params.get('user'))
  if (convoId && findConvo(convoId)) openConvo(convoId)
  else if (userId) openWithUser(userId)
})
