// Shared by the Board (script.js) and List (list.js) pages. Text comes from i18n.js (t / tn).
// Each page defines its own loadTasks(), which the functions below call after a change.

// same origin as the page, so it works locally and when deployed
const BASE_URL = ''
const API_URL = BASE_URL + '/task'

// Backend endpoints, relative to API_URL
const PRIORITY_PATH = priority => `/priority/${priority}`           // GET  -> getTasksByPriority
const DUE_PATH = date => `/due/${date}`                             // GET  -> getTaskUpToADueDate
const CHANGE_PRIORITY_PATH = id => `/${id}/priority`               // PATCH {priority} -> changePriority

let allTasks = []
let editingId = null
let currentUser = null

// Task endpoints, relative to API_URL
function api(path, options = {}) {
  return request(API_URL + path, options)
}

// Sends a request with the saved token; returns null after redirecting to login.
async function request(url, options = {}) {
  const token = localStorage.getItem('token')
  if (!token) {
    window.location.href = './login.html'
    return null
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  if (response.status === 401) {
    localStorage.removeItem('token')
    window.location.href = './login.html'
    return null
  }
  if (!response.ok) {
    const text = await response.text()
    const error = new Error(`Server responded ${response.status}: ${text}`)
    // the backend answers with ProblemDetail JSON; keep its message for alerts
    try {
      error.detail = JSON.parse(text).detail
    } catch (ignored) {
    }
    throw error
  }

  // some responses (e.g. DELETE's 204) have no body
  const text = await response.text()
  return text ? JSON.parse(text) : true
}

// ---------- current user ----------

function isAdmin() {
  return currentUser?.role === 'ADMIN'
}

// Loads who is logged in and adds the Admin link to the top bar for admins.
// Pages wait for this before loading tasks, so owner names can be shown to admins.
async function loadCurrentUser() {
  try {
    currentUser = await request(BASE_URL + '/users/me')
  } catch (err) {
    console.error('Error loading current user', err)
    return
  }
  if (!currentUser) return

  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) logoutBtn.title = t('nav.loggedInAs', {name: currentUser.username})
  if (isAdmin() && !document.getElementById('admin-tab')) {
    const tab = document.createElement('a')
    tab.id = 'admin-tab'
    tab.href = './admin.html'
    tab.className = 'view-tab' + (location.pathname.endsWith('admin.html') ? ' is-active' : '')
    tab.textContent = t('nav.users')
    const tabs = document.querySelectorAll('.topbar .view-tab')
    tabs[tabs.length - 1]?.after(tab)
  }
}

// Admins get an "Assign to" dropdown in the New task form, defaulting to themselves
async function addOwnerPicker() {
  const statusRow = document.querySelector('#new-task .field-row')
  if (!statusRow || document.getElementById('new-owner')) return

  let users
  try {
    users = (await request(BASE_URL + '/admin/users')) || []
  } catch (err) {
    console.error('Error loading users for the owner picker', err)
    return
  }

  const field = document.createElement('div')
  field.className = 'field'
  field.innerHTML = `
    <label for="new-owner">${t('field.assignTo')}</label>
    <select id="new-owner">
      ${users.map(u => `<option value="${u.id}" ${u.id === currentUser.id ? 'selected' : ''}>${escapeHtml(u.username)}</option>`).join('')}
    </select>`
  statusRow.before(field)
}

const currentUserReady = loadCurrentUser().then(() => {
  if (isAdmin()) addOwnerPicker()
})

// Owner label shown next to a task, only to admins (who see everyone's tasks)
function ownerTag(task) {
  return isAdmin() && task.ownerName
    ? `<span class="owner-tag" title="${t('task.owner')}">@${escapeHtml(task.ownerName)}</span>`
    : ''
}

// JWTs are stateless, so logging out just forgets the token
function logout() {
  localStorage.removeItem('token')
  window.location.replace('./login.html')
}

// ---------- helpers ----------

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// yyyy-MM-dd in local time (toISOString would shift the day in some time zones)
function toDateParam(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text ?? ''
  return div.innerHTML
}

// Due dates come from the API as "yyyy-MM-dd"; read them as local dates
// (new Date("2026-09-30") would mean UTC midnight, the previous day west of UTC)
function parseDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)
}

function formatDate(value) {
  return parseDate(value).toLocaleDateString(LOCALE, {month: 'short', day: 'numeric'})
}

// 'todo' | 'inprogress' | 'done'; tasks without a status count as 'todo'
function statusKey(task) {
  const status = (task.status || 'todo').toLowerCase().replace(/[\s_-]/g, '')
  return ['todo', 'inprogress', 'done'].includes(status) ? status : 'todo'
}

function isOverdue(task) {
  return statusKey(task) !== 'done' && parseDate(task.dueDate) < startOfToday()
}

// ---------- search ----------

const SEARCH_PATH = query => `/search/${encodeURIComponent(query)}`  // GET -> searchByDescription

// ids of the tasks the backend matched; null when the search box is empty
// (or the search request failed, in which case matchesSearch falls back to a plain substring match)
let searchIds = null
let searchRun = 0

// Asks the backend which tasks match the search box (it also catches typos)
async function runSearch() {
  const query = document.getElementById('search').value.trim()
  const run = ++searchRun
  if (!query) {
    searchIds = null
    return
  }
  let results
  try {
    results = (await api(SEARCH_PATH(query))) || []
  } catch (err) {
    console.error('Error searching tasks', err)
    results = null
  }
  // ignore answers to older searches that arrive after a newer one
  if (run === searchRun) searchIds = results && new Set(results.map(t => t.taskId))
}

function matchesSearch(task) {
  if (searchIds) return searchIds.has(task.taskId)
  const query = document.getElementById('search').value.trim().toLowerCase()
  return !query || `${task.title} ${task.description || ''}`.toLowerCase().includes(query)
}

// Runs the search shortly after the user stops typing, then calls onResults
function wireSearch(onResults) {
  let timer
  document.getElementById('search').addEventListener('input', () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      await runSearch()
      onResults()
    }, 300)
  })
}

// ---------- create ----------

async function submitNewTask() {
  const title = document.getElementById('new-title').value.trim()
  const dueDate = document.getElementById('new-due').value
  if (!title || !dueDate) {
    alert(t('err.titleDueRequired'))
    return
  }

  const owner = document.getElementById('new-owner')
  const query = owner && Number(owner.value) !== currentUser?.id ? `?ownerId=${owner.value}` : ''

  try {
    await api(query, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: document.getElementById('new-desc').value.trim(),
        priority: document.getElementById('new-priority').value,
        status: document.getElementById('new-status').value,
        dueDate
      })
    })
  } catch (err) {
    console.error('Error creating task', err)
    alert(t('err.createTask', {detail: translateServerMessage(err.detail || err.message)}))
    return
  }

  document.getElementById('new-title').value = ''
  document.getElementById('new-desc').value = ''
  document.getElementById('new-due').value = ''
  window.location.hash = ''
  loadTasks()
}

// ---------- edit ----------

function openEdit(taskId) {
  const task = allTasks.find(t => t.taskId === taskId)
  if (!task) return
  editingId = taskId
  document.getElementById('edit-title').value = task.title
  document.getElementById('edit-desc').value = task.description || ''
  document.getElementById('edit-due').value = String(task.dueDate).slice(0, 10)
  const ids = {LOW: 'pr-low', MEDIUM: 'pr-med', HIGH: 'pr-high'}
  document.getElementById(ids[task.priority] || 'pr-med').checked = true
  const statusIds = {todo: 'st-todo', inprogress: 'st-prog', done: 'st-done'}
  document.getElementById(statusIds[statusKey(task)]).checked = true
  document.getElementById('delete-message').textContent = t('modal.deleteNamed', {title: task.title})
}

async function submitEditTask() {
  const title = document.getElementById('edit-title').value.trim()
  const dueDate = document.getElementById('edit-due').value
  if (!title || !dueDate) {
    alert(t('err.titleDueRequired'))
    return
  }
  const priorities = {'pr-low': 'LOW', 'pr-med': 'MEDIUM', 'pr-high': 'HIGH'}
  const checked = document.querySelector('input[name="edit-priority"]:checked')
  const statuses = {'st-todo': 'TODO', 'st-prog': 'IN_PROGRESS', 'st-done': 'DONE'}
  const checkedStatus = document.querySelector('input[name="edit-status"]:checked')

  try {
    await api(`/${editingId}`, {
      method: 'PUT',
      body: JSON.stringify({
        title,
        description: document.getElementById('edit-desc').value.trim(),
        priority: priorities[checked.id],
        status: statuses[checkedStatus.id],
        dueDate
      })
    })
  } catch (err) {
    console.error('Error updating task', err)
    alert(t('err.updateTask', {detail: translateServerMessage(err.detail || err.message)}))
    return
  }

  window.location.hash = ''
  loadTasks()
}

// Saves a new status for a task, e.g. from dragging a card or ticking a row
async function setStatus(taskId, status) {
  const task = allTasks.find(t => t.taskId === taskId)
  if (!task) return false
  try {
    const {title, description, priority, dueDate} = task
    await api(`/${taskId}`, {method: 'PUT', body: JSON.stringify({title, description, priority, status, dueDate})})
  } catch (err) {
    console.error('Error changing status', err)
    alert(t('err.changeStatus'))
    return false
  }
  task.status = status
  return true
}

// ---------- delete ----------

async function confirmDelete() {
  try {
    await api(`/${editingId}`, {method: 'DELETE'})
  } catch (err) {
    console.error('Error deleting task', err)
    alert(t('err.deleteTask'))
    return
  }
  loadTasks()
}

// ---------- change priority (click the badge to cycle LOW -> MEDIUM -> HIGH) ----------

const NEXT_PRIORITY = {LOW: 'MEDIUM', MEDIUM: 'HIGH', HIGH: 'LOW'}

async function cyclePriority(taskId) {
  const task = allTasks.find(t => t.taskId === taskId)
  if (!task) return
  const next = NEXT_PRIORITY[task.priority] || 'MEDIUM'

  try {
    await api(CHANGE_PRIORITY_PATH(taskId), {method: 'PATCH', body: JSON.stringify({priority: next})})
  } catch (err) {
    console.error('Error changing priority', err)
    alert(t('err.changePriority'))
    return
  }
  loadTasks()
}

function priorityBadge(task) {
  const priority = task.priority || 'MEDIUM'
  return `<button type="button" class="badge badge-${priority.toLowerCase()} badge-button"
                  data-id="${task.taskId}" title="${t('priority.change')}">${t(`priority.${priority}`)}</button>`
}
