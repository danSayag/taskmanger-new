// Board page. Shared API/create/edit/delete code lives in common.js.

// The Priority and Due filters and search are applied by the backend.
async function loadTasks() {
  const priority = document.getElementById('priority-selector').value
  const due = document.getElementById('Due').value

  try {
    if (priority === 'all' && due === 'any') {
      allTasks = (await api('')) || []
    } else if (due === 'any') {
      allTasks = (await api(PRIORITY_PATH(priority.toUpperCase()))) || []
    } else if (priority === 'all') {
      allTasks = (await api(DUE_PATH(dueLimit(due)))) || []
    } else {
      // both filters: ask for each and keep the tasks that appear in both
      const [byPriority, byDue] = await Promise.all([
        api(PRIORITY_PATH(priority.toUpperCase())),
        api(DUE_PATH(dueLimit(due)))
      ])
      const dueIds = new Set((byDue || []).map(t => t.taskId))
      allTasks = (byPriority || []).filter(t => dueIds.has(t.taskId))
    }
  } catch (err) {
    console.error('Error loading tasks', err)
    alert(t('err.loadTasks'))
    return
  }
  await runSearch()
  renderTasks()
}

// The last day included by a Due filter option
function dueLimit(due) {
  const limit = startOfToday()
  if (due === 'next-week') limit.setDate(limit.getDate() + 7)
  else if (due === 'next-month') limit.setMonth(limit.getMonth() + 1)
  else if (due === 'next-year') limit.setFullYear(limit.getFullYear() + 1)
  return toDateParam(limit)
}

// ---------- rendering ----------

function cardHtml(task) {
  const overdue = isOverdue(task) ? ' overdue' : ''
  const desc = task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''
  return `
    <div class="task-card" draggable="true" data-id="${task.taskId}">
      <a href="#edit-task" class="card-menu" data-id="${task.taskId}">&#183;&#183;&#183;</a>
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      ${desc}
      <div class="task-meta">
        <span class="due${overdue}">${formatDate(task.dueDate)}</span>
        ${ownerTag(task)}
      </div>
      <div class="task-meta">
        ${issueKey(task)}
        <span class="spacer"></span>
        ${priorityBadge(task)}
        ${avatarHtml(task.ownerName || currentUser?.username)}
      </div>
    </div>`
}

function renderTasks() {
  const tasks = allTasks.filter(matchesSearch)
  for (const column of ['todo', 'inprogress', 'done']) {
    const inColumn = tasks.filter(task => statusKey(task) === column)
    document.getElementById(`${column}-content`).innerHTML = inColumn.map(cardHtml).join('')
    document.getElementById(`${column}-count`).textContent = inColumn.length
    document.getElementById(`${column}-tab-count`).textContent = inColumn.length
  }
  document.getElementById('task-count').textContent = tn('count.task', tasks.length)
}

// ---------- drag to change status ----------

const STATUS_BY_COLUMN = {todo: 'TODO', inprogress: 'IN_PROGRESS', done: 'DONE'}

async function moveTask(taskId, column) {
  const task = allTasks.find(t => t.taskId === taskId)
  if (!task || statusKey(task) === column) return

  // move the card right away, put it back if the save fails
  const previous = task.status
  task.status = STATUS_BY_COLUMN[column]
  renderTasks()

  task.status = previous
  await setStatus(taskId, STATUS_BY_COLUMN[column])
  renderTasks()
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

// ---------- status tabs (small screens) ----------

// On phones the columns sit side by side as cards that you swipe between (see .status-tabs in jira.css).
// Tapping a tab scrolls to its column; the tab of the column in view is highlighted.
function wireStatusTabs() {
  const nav = document.getElementById('status-tabs')
  nav.setAttribute('aria-label', t('board.statuses'))
  const tabs = [...nav.querySelectorAll('.status-tab')]
  const rtl = document.documentElement.dir === 'rtl'

  function setActive(column) {
    for (const tab of tabs) {
      const active = tab.dataset.column === column
      tab.classList.toggle('is-active', active)
      if (active) tab.setAttribute('aria-current', 'true')
      else tab.removeAttribute('aria-current')
    }
    // keep the active tab visible when the tabs don't all fit (sideways only, so the page doesn't jump)
    const tab = tabs.find(tab => tab.dataset.column === column).getBoundingClientRect()
    const box = nav.getBoundingClientRect()
    if (tab.left < box.left) nav.scrollBy({left: tab.left - box.left})
    else if (tab.right > box.right) nav.scrollBy({left: tab.right - box.right})
  }

  nav.addEventListener('click', event => {
    const tab = event.target.closest('.status-tab')
    if (!tab) return
    const column = board.querySelector(`.column[data-status="${tab.dataset.column}"]`).getBoundingClientRect()
    const box = board.getBoundingClientRect()
    board.scrollBy({left: rtl ? column.right - box.right : column.left - box.left, behavior: 'smooth'})
    setActive(tab.dataset.column)
  })

  // only fires while the board scrolls sideways, i.e. on phones
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) setActive(entry.target.dataset.status)
    }
  }, {root: board, threshold: 0.6})
  board.querySelectorAll('.column').forEach(column => observer.observe(column))
}

// ---------- wiring ----------

wireStatusTabs()

board.addEventListener('click', event => {
  const menu = event.target.closest('.card-menu')
  if (menu) openEdit(Number(menu.dataset.id))
  const badge = event.target.closest('.badge-button')
  if (badge) cyclePriority(Number(badge.dataset.id))
  // "+ Add task" (on phones, the empty space under a column's cards) starts the task in that column
  const add = event.target.closest('.add-task')
  if (add) document.getElementById('new-status').value = STATUS_BY_COLUMN[add.closest('.column').dataset.status]
})
// the top bar's "+ New task" always starts in To do
document.getElementById('new-task-btn').addEventListener('click', () => {
  document.getElementById('new-status').value = 'TODO'
})
wireSearch(renderTasks)
for (const id of ['priority-selector', 'Due']) {
  document.getElementById(id).addEventListener('change', loadTasks)
}

currentUserReady.then(loadTasks)
