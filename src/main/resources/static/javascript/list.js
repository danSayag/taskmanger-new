// List page. Shared API/create/edit/delete code lives in common.js.

let page = 1

const STATUS_LABELS = {todo: 'TODO', inprogress: 'IN PROGRESS', done: 'DONE'}
const PRIORITY_ORDER = {HIGH: 0, MEDIUM: 1, LOW: 2}

// The Priority filter and search are applied by the backend; status and sorting stay client-side.
async function loadTasks() {
  const priority = document.getElementById('list-priority').value
  try {
    allTasks = (await api(priority === 'all' ? '' : PRIORITY_PATH(priority))) || []
  } catch (err) {
    console.error('Error loading tasks', err)
    alert('Could not load tasks')
    return
  }
  await runSearch()
  renderTasks()
}

function visibleTasks() {
  const status = document.getElementById('list-status').value
  const sort = document.getElementById('list-sort').value

  const tasks = allTasks.filter(task =>
    (status === 'all' || statusKey(task) === status) && matchesSearch(task))

  const byDue = (a, b) => parseDate(a.dueDate) - parseDate(b.dueDate)
  const compare = {
    'due-asc': byDue,
    'due-desc': (a, b) => byDue(b, a),
    'priority': (a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1) || byDue(a, b),
    'title': (a, b) => a.title.localeCompare(b.title)
  }[sort]
  return tasks.sort(compare)
}

function rowHtml(task) {
  const status = statusKey(task)
  const done = status === 'done'
  const desc = task.description ? `<p class="row-desc">${escapeHtml(task.description)}</p>` : ''
  return `
    <tr class="${done ? 'is-done' : ''}">
      <td class="col-check"><input type="checkbox" class="row-check" data-id="${task.taskId}" ${done ? 'checked' : ''}
                                   title="Mark as ${done ? 'to do' : 'done'}"></td>
      <td>
        <p class="row-title">${escapeHtml(task.title)} ${ownerTag(task)}</p>
        ${desc}
      </td>
      <td><span class="status status-${status}">${STATUS_LABELS[status]}</span></td>
      <td>${priorityBadge(task)}</td>
      <td class="cell-due${isOverdue(task) ? ' overdue' : ''}">${formatDate(task.dueDate)}</td>
      <td class="col-actions">
        <a href="#edit-task" class="row-action" data-id="${task.taskId}" title="Edit">&#9998;</a>
        <a href="#delete-task" class="row-action" data-id="${task.taskId}" title="Delete">&#128465;</a>
      </td>
    </tr>`
}

function renderTasks() {
  const tasks = visibleTasks()
  const perPage = Number(document.getElementById('rows-per-page').value)
  const pages = Math.max(1, Math.ceil(tasks.length / perPage))
  page = Math.min(page, pages)

  const start = (page - 1) * perPage
  const shown = tasks.slice(start, start + perPage)
  const body = document.querySelector('#task-list tbody')
  body.innerHTML = shown.length
    ? shown.map(rowHtml).join('')
    : `<tr><td colspan="6" class="cell-empty">No tasks found</td></tr>`

  document.getElementById('result-count').textContent = tasks.length
    ? `Showing ${start + 1}–${start + shown.length} of ${tasks.length}`
    : 'Showing 0 of 0'

  renderPager(pages)
}

function renderPager(pages) {
  let html = `<a href="#" data-page="${page - 1}">&#8249; Prev</a>`
  for (let p = 1; p <= pages; p++) {
    html += `<a href="#" data-page="${p}" class="${p === page ? 'is-current' : ''}">${p}</a>`
  }
  html += `<a href="#" data-page="${page + 1}">Next &#8250;</a>`
  document.getElementById('pager').innerHTML = html
}

// ---------- wiring ----------

document.querySelector('#task-list tbody').addEventListener('click', event => {
  const action = event.target.closest('.row-action')
  if (action) openEdit(Number(action.dataset.id))
  const badge = event.target.closest('.badge-button')
  if (badge) cyclePriority(Number(badge.dataset.id))
})

// ticking a row marks it done, unticking puts it back to to-do
document.querySelector('#task-list tbody').addEventListener('change', async event => {
  const check = event.target.closest('.row-check')
  if (!check) return
  await setStatus(Number(check.dataset.id), check.checked ? 'DONE' : 'TODO')
  renderTasks()
})

document.getElementById('pager').addEventListener('click', event => {
  const link = event.target.closest('a[data-page]')
  if (!link) return
  event.preventDefault()
  const pages = Math.max(1, Math.ceil(visibleTasks().length / Number(document.getElementById('rows-per-page').value)))
  const target = Number(link.dataset.page)
  if (target >= 1 && target <= pages) {
    page = target
    renderTasks()
  }
})

wireSearch(() => {
  page = 1
  renderTasks()
})
for (const id of ['list-status', 'list-sort', 'rows-per-page']) {
  document.getElementById(id).addEventListener('change', () => {
    page = 1
    renderTasks()
  })
}
document.getElementById('list-priority').addEventListener('change', () => {
  page = 1
  loadTasks()
})
document.getElementById('clear-filters').addEventListener('click', event => {
  event.preventDefault()
  document.getElementById('search').value = ''
  document.getElementById('list-status').value = 'all'
  document.getElementById('list-priority').value = 'all'
  document.getElementById('list-sort').value = 'due-asc'
  page = 1
  loadTasks()
})

currentUserReady.then(loadTasks)
