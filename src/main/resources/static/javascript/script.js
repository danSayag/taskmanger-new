const API_URL = 'http://localhost:8080/task'

let allTasks = []
let editingId = null

// Sends a request with the saved token; returns null after redirecting to login.
async function api(path, options = {}) {
  const token = localStorage.getItem('token')
  if (!token) {
    window.location.href = './login.html'
    return null
  }

  const response = await fetch(API_URL + path, {
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
    throw new Error(`Server responded ${response.status}: ${text}`)
  }

  // POST/PUT/DELETE return no body
  const text = await response.text()
  return text ? JSON.parse(text) : true
}

async function loadTasks() {
  try {
    allTasks = (await api('')) || []
  } catch (err) {
    console.error('Error loading tasks', err)
    alert('Could not load tasks')
    return
  }
  renderTasks()
}

// ---------- filtering ----------

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function matchesDue(task, due) {
  if (due === 'any') return true
  const limit = startOfToday()
  if (due === 'today') limit.setDate(limit.getDate() + 1)
  else if (due === 'next-week') limit.setDate(limit.getDate() + 7)
  else if (due === 'next-month') limit.setMonth(limit.getMonth() + 1)
  else if (due === 'next-year') limit.setFullYear(limit.getFullYear() + 1)
  return new Date(task.dueDate) < limit
}

function filteredTasks() {
  const query = document.getElementById('search').value.trim().toLowerCase()
  const priority = document.getElementById('priority-selector').value
  const due = document.getElementById('Due').value

  return allTasks.filter(task =>
    (priority === 'all' || (task.priority || '').toLowerCase() === priority) &&
    matchesDue(task, due) &&
    (!query || `${task.title} ${task.description || ''}`.toLowerCase().includes(query)))
}

// ---------- rendering ----------

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text ?? ''
  return div.innerHTML
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})
}

function columnOf(task) {
  // the backend has no status field yet, so tasks without one land in "To do"
  const status = (task.status || 'todo').toLowerCase().replace(/[\s_-]/g, '')
  return ['todo', 'inprogress', 'done'].includes(status) ? status : 'todo'
}

function cardHtml(task) {
  const priority = task.priority || 'MEDIUM'
  const overdue = columnOf(task) !== 'done' && new Date(task.dueDate) < startOfToday() ? ' overdue' : ''
  const desc = task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''
  return `
    <div class="task-card" draggable="true" data-id="${task.taskId}">
      <a href="#edit-task" class="card-menu" data-id="${task.taskId}">&#183;&#183;&#183;</a>
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      ${desc}
      <div class="task-meta">
        <span class="badge badge-${priority.toLowerCase()}">${priority}</span>
        <span class="due${overdue}">${formatDate(task.dueDate)}</span>
      </div>
    </div>`
}

function renderTasks() {
  const tasks = filteredTasks()
  for (const column of ['todo', 'inprogress', 'done']) {
    const inColumn = tasks.filter(task => columnOf(task) === column)
    document.getElementById(`${column}-content`).innerHTML = inColumn.map(cardHtml).join('')
    document.getElementById(`${column}-count`).textContent = inColumn.length
  }
  document.getElementById('task-count').textContent =
    `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`
}

// ---------- create ----------

async function submitNewTask() {
  const title = document.getElementById('new-title').value.trim()
  const dueDate = document.getElementById('new-due').value
  if (!title || !dueDate) {
    alert('Title and due date are required')
    return
  }

  try {
    await api('', {
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
    alert('Could not create task (is the title already used?)')
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
  document.getElementById(statusIds[columnOf(task)]).checked = true
  document.getElementById('delete-message').textContent =
    `“${task.title}” will be permanently deleted. This can’t be undone.`
}

async function submitEditTask() {
  const title = document.getElementById('edit-title').value.trim()
  const dueDate = document.getElementById('edit-due').value
  if (!title || !dueDate) {
    alert('Title and due date are required')
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
    alert('Could not update task')
    return
  }

  window.location.hash = ''
  loadTasks()
}

// ---------- delete ----------

async function confirmDelete() {
  try {
    await api(`/${editingId}`, {method: 'DELETE'})
  } catch (err) {
    console.error('Error deleting task', err)
    alert('Could not delete task')
    return
  }
  loadTasks()
}

// ---------- drag to change status ----------

const STATUS_BY_COLUMN = {todo: 'TODO', inprogress: 'IN_PROGRESS', done: 'DONE'}

async function moveTask(taskId, column) {
  const task = allTasks.find(t => t.taskId === taskId)
  if (!task || columnOf(task) === column) return

  const previous = task.status
  task.status = STATUS_BY_COLUMN[column]
  renderTasks()

  try {
    await api(`/${taskId}`, {method: 'PUT', body: JSON.stringify(task)})
  } catch (err) {
    console.error('Error moving task', err)
    task.status = previous
    renderTasks()
    alert('Could not change the task status')
  }
}

const board = document.getElementById('task-board')

board.addEventListener('dragstart', event => {
  const card = event.target.closest('.task-card')
  if (!card) return
  event.dataTransfer.setData('text/plain', card.dataset.id)
  event.dataTransfer.effectAllowed = 'move'
  card.classList.add('is-dragging')
})

board.addEventListener('dragend', event => {
  event.target.closest('.task-card')?.classList.remove('is-dragging')
  board.querySelectorAll('.drop-target').forEach(c => c.classList.remove('drop-target'))
})

board.addEventListener('dragover', event => {
  const column = event.target.closest('.column')
  if (!column) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  board.querySelectorAll('.drop-target').forEach(c => c !== column && c.classList.remove('drop-target'))
  column.classList.add('drop-target')
})

board.addEventListener('dragleave', event => {
  const column = event.target.closest('.column')
  if (column && !column.contains(event.relatedTarget)) column.classList.remove('drop-target')
})

board.addEventListener('drop', event => {
  const column = event.target.closest('.column')
  if (!column) return
  event.preventDefault()
  column.classList.remove('drop-target')
  moveTask(Number(event.dataTransfer.getData('text/plain')), column.dataset.status)
})

// ---------- wiring ----------

document.getElementById('task-board').addEventListener('click', event => {
  const menu = event.target.closest('.card-menu')
  if (menu) openEdit(Number(menu.dataset.id))
})
for (const id of ['search', 'priority-selector', 'Due']) {
  document.getElementById(id).addEventListener('input', renderTasks)
}

loadTasks()
