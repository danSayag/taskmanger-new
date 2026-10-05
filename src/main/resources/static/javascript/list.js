// List page. Shared API/create/edit/delete code lives in common.js.

let page = 1

const STATUS_LABELS = {todo: t('status.TODO'), inprogress: t('status.IN_PROGRESS'), done: t('status.DONE')}
const PRIORITY_ORDER = {HIGH: 0, MEDIUM: 1, LOW: 2}

// The Priority filter and search are applied by the backend; status and sorting stay client-side.
async function loadTasks() {
  const priority = document.getElementById('list-priority').value
  try {
    allTasks = (await api(priority === 'all' ? '' : PRIORITY_PATH(priority))) || []
  } catch (err) {
    console.error('Error loading tasks', err)
    alert(t('err.loadTasks'))
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

// Priority cell: the current priority, with a High / Medium / Low menu on hover
function priorityMenu(task) {
  const current = task.priority || 'MEDIUM'
  const options = ['HIGH', 'MEDIUM', 'LOW'].map(priority => `
    <button type="button" class="menu-item priority-option ${priority === current ? 'is-current' : ''}" role="menuitemradio"
            aria-checked="${priority === current}" data-id="${task.taskId}" data-priority="${priority}">
      ${priorityIcon(priority)}
      <span>${t(`priority.${priority.toLowerCase()}`)}</span>
    </button>`).join('')
  return `
    <div class="hover-menu hover-menu-start">
      <button type="button" class="badge priority-trigger" aria-haspopup="menu" title="${t('priority.change')}">
        ${priorityIcon(current)}
        <span class="priority-label">${t(`priority.${current.toLowerCase()}`)}</span>
      </button>
      <div class="row-menu" role="menu">${options}</div>
    </div>`
}

// Status cell: the status lozenge, with To do / In progress / Done on hover
const STATUS_VALUES = {todo: 'TODO', inprogress: 'IN_PROGRESS', done: 'DONE'}

function statusMenu(task) {
  const current = statusKey(task)
  const options = Object.entries(STATUS_VALUES).map(([key, value]) => `
    <button type="button" class="menu-item status-option ${key === current ? 'is-current' : ''}" role="menuitemradio"
            aria-checked="${key === current}" data-id="${task.taskId}" data-status="${value}">
      <span class="status status-${key}">${STATUS_LABELS[key]}</span>
    </button>`).join('')
  return `
    <div class="hover-menu hover-menu-start">
      <button type="button" class="status-trigger" aria-haspopup="menu" title="${t('status.change')}">
        <span class="status status-${current}">${STATUS_LABELS[current]}</span>
        <span class="trigger-chevron" aria-hidden="true">&#9662;</span>
      </button>
      <div class="row-menu" role="menu">${options}</div>
    </div>`
}

// Due cell: the date, with quick choices and a date picker on hover
function dueMenu(task) {
  const current = String(task.dueDate).slice(0, 10)
  const inDays = days => {
    const d = startOfToday()
    d.setDate(d.getDate() + days)
    return toDateParam(d)
  }
  const nextMonth = startOfToday()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const choices = [
    ['due.today', inDays(0)],
    ['due.tomorrow', inDays(1)],
    ['due.nextWeek', inDays(7)],
    ['due.nextMonth', toDateParam(nextMonth)]
  ]
  const options = choices.map(([label, date]) => `
    <button type="button" class="menu-item due-option ${date === current ? 'is-current' : ''}" role="menuitemradio"
            aria-checked="${date === current}" data-id="${task.taskId}" data-date="${date}">
      <span>${t(label)}</span>
      <span class="menu-item-hint">${formatDate(date)}</span>
    </button>`).join('')
  return `
    <div class="hover-menu hover-menu-start">
      <button type="button" class="due-trigger" aria-haspopup="menu" title="${t('due.change')}">${formatDate(task.dueDate)}</button>
      <div class="row-menu" role="menu">
        ${options}
        <label class="menu-date">
          <span>${t('due.pick')}</span>
          <input type="date" class="due-input" data-id="${task.taskId}" value="${current}">
        </label>
      </div>
    </div>`
}

function rowHtml(task) {
  const status = statusKey(task)
  const done = status === 'done'
  const desc = task.description ? `<p class="row-desc">${escapeHtml(task.description)}</p>` : ''
  return `
    <tr class="${done ? 'is-done' : ''}">
      <td class="col-check"><input type="checkbox" class="row-check" data-id="${task.taskId}" ${done ? 'checked' : ''}
                                   title="${t(done ? 'list.markTodo' : 'list.markDone')}"></td>
      <td>
        <p class="row-title">${issueKey(task)} ${escapeHtml(task.title)} ${ownerTag(task)}</p>
        ${desc}
      </td>
      <td>${statusMenu(task)}</td>
      <td>${priorityMenu(task)}</td>
      <td class="cell-due${isOverdue(task) ? ' overdue' : ''}">${dueMenu(task)}</td>
      <td class="col-actions">
        <div class="hover-menu">
          <button type="button" class="row-more" aria-haspopup="menu"
                  title="${t('list.actions')}" aria-label="${t('list.actions')}">&#183;&#183;&#183;</button>
          <div class="row-menu" role="menu">
            <a href="#edit-task" class="row-action" role="menuitem" data-id="${task.taskId}">${t('list.edit')}</a>
            <a href="#delete-task" class="row-action row-action-danger" role="menuitem" data-id="${task.taskId}">${t('list.delete')}</a>
          </div>
        </div>
      </td>
    </tr>`
}

// Arrow on the Due column header; follows the Sort dropdown (↑ soonest first, ↓ latest first)
function updateDueHeader() {
  const sort = document.getElementById('list-sort').value
  const header = document.getElementById('due-header')
  const direction = {'due-asc': 'ascending', 'due-desc': 'descending'}[sort] || 'none'
  header.setAttribute('aria-sort', direction)
  header.querySelector('.sort-arrow').textContent = {ascending: '↑', descending: '↓', none: '↕'}[direction]
}

function renderTasks() {
  updateDueHeader()
  const tasks = visibleTasks()
  const perPage = Number(document.getElementById('rows-per-page').value)
  const pages = Math.max(1, Math.ceil(tasks.length / perPage))
  page = Math.min(page, pages)

  const start = (page - 1) * perPage
  const shown = tasks.slice(start, start + perPage)
  const body = document.querySelector('#task-list tbody')
  body.innerHTML = shown.length
    ? shown.map(rowHtml).join('')
    : `<tr><td colspan="6" class="cell-empty">${t('list.noTasks')}</td></tr>`

  document.getElementById('result-count').textContent = tasks.length
    ? t('list.showing', {from: start + 1, to: start + shown.length, total: tasks.length})
    : t('list.showingNone')

  renderPager(pages)
}

function renderPager(pages) {
  let html = `<a href="#" data-page="${page - 1}">${t('pager.prev')}</a>`
  for (let p = 1; p <= pages; p++) {
    html += `<a href="#" data-page="${p}" class="${p === page ? 'is-current' : ''}">${p}</a>`
  }
  html += `<a href="#" data-page="${page + 1}">${t('pager.next')}</a>`
  document.getElementById('pager').innerHTML = html
}

// ---------- wiring ----------

// The "···" and priority menus open on hover (or keyboard focus) through CSS, see .hover-menu in jira.css.
// Moving focus out of the menu closes it once an item has been picked.
function closeHoverMenu() {
  if (document.activeElement?.closest('.hover-menu')) document.activeElement.blur()
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeHoverMenu()
})

document.querySelector('#task-list tbody').addEventListener('click', event => {
  const action = event.target.closest('.row-action')
  if (action) {
    // Delete also needs the task selected, so both items go through openEdit
    openEdit(Number(action.dataset.id))
    closeHoverMenu()
    return
  }
  const option = event.target.closest('.priority-option')
  if (option) {
    closeHoverMenu()
    setPriority(Number(option.dataset.id), option.dataset.priority)
    return
  }
  const statusOption = event.target.closest('.status-option')
  if (statusOption) {
    closeHoverMenu()
    const taskId = Number(statusOption.dataset.id)
    const task = allTasks.find(t => t.taskId === taskId)
    if (task && task.status !== statusOption.dataset.status) {
      setStatus(taskId, statusOption.dataset.status).then(renderTasks)
    }
    return
  }
  const due = event.target.closest('.due-option')
  if (due) {
    closeHoverMenu()
    setDueDate(Number(due.dataset.id), due.dataset.date)
  }
})

// a date picked in the Due menu's date field
document.querySelector('#task-list tbody').addEventListener('change', event => {
  const input = event.target.closest('.due-input')
  if (!input) return
  // typing a year fires change for 0002, 0020, ... on the way to 2026; wait for a real year
  if (!input.value || Number(input.value.slice(0, 4)) < 1900) return
  closeHoverMenu()
  setDueDate(Number(input.dataset.id), input.value)
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
// clicking the Due header flips between soonest first and latest first
document.getElementById('sort-due').addEventListener('click', () => {
  const sort = document.getElementById('list-sort')
  sort.value = sort.value === 'due-asc' ? 'due-desc' : 'due-asc'
  page = 1
  renderTasks()
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
