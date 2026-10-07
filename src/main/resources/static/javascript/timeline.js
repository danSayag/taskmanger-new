// Timeline page, laid out like a calendar: one line per week, one cell per day, and each task as a colored block
// on its due date. Click an empty part of a day to create a task due that day.
// Shared API/create/edit/delete code lives in common.js.

const DAY_MS = 24 * 60 * 60 * 1000
const RANGES = {week: 1, '2weeks': 2, month: null}   // number of week lines; month: as many as the month needs
const GROUPS = ['person', 'status', 'priority']
const RANGE_KEY = 'timeline-range'
const GROUP_KEY = 'timeline-group'

// solid colors with white text. People get colors in name order, so everyone visible gets a different one
// (red is left out: on this page it means overdue). Past 8 people the colors repeat.
const PERSON_COLORS = ['#0c66e4', '#1f845a', '#e56910', '#6e5dc6', '#2898bd', '#943d73', '#a54800', '#206a83']
const STATUS_COLORS = {todo: '#626f86', inprogress: '#0c66e4', done: '#1f845a'}
const PRIORITY_COLORS = {HIGH: '#c9372c', MEDIUM: '#e56910', LOW: '#0c66e4'}

let range = readSetting(RANGE_KEY, Object.keys(RANGES), 'month')
let groupBy = null           // picked once we know if the user is an admin
let anchor = startOfToday()  // any day inside the period being shown
let miniMonth = null         // first day of the month shown in the mini calendar
const hiddenGroups = new Set()

function readSetting(key, allowed, fallback) {
  try {
    const value = localStorage.getItem(key)
    return allowed.includes(value) ? value : fallback
  } catch (ignored) {
    return fallback
  }
}

function saveSetting(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch (ignored) {
  }
}

async function loadTasks() {
  try {
    allTasks = (await api('')) || []
  } catch (err) {
    console.error('Error loading tasks', err)
    alert(t('err.loadTasks'))
    return
  }
  await runSearch()
  render()
}

// ---------- dates ----------

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// whole days from a to b; rounding absorbs the hour lost or gained on daylight saving changes
function daysBetween(a, b) {
  return Math.round((b - a) / DAY_MS)
}

// the first day of the week for the chosen language (Sunday in Hebrew, Monday in English/French)
function firstDayOfWeek() {
  try {
    const locale = new Intl.Locale(LOCALE)
    const info = locale.getWeekInfo?.() || locale.weekInfo
    if (info?.firstDay) return info.firstDay % 7
  } catch (ignored) {
  }
  return 1
}

function startOfWeek(date) {
  return addDays(date, -((date.getDay() - firstDayOfWeek() + 7) % 7))
}

// {start, weeks}: the first day shown and how many week lines
function period() {
  if (range === 'month') {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
    const start = startOfWeek(first)
    return {start, weeks: Math.ceil((daysBetween(start, last) + 1) / 7)}
  }
  return {start: startOfWeek(anchor), weeks: RANGES[range]}
}

function movePeriod(step) {
  if (range === 'month') anchor = new Date(anchor.getFullYear(), anchor.getMonth() + step, 1)
  else anchor = addDays(anchor, step * RANGES[range] * 7)
  miniMonth = null
  render()
}

function isWeekend(day) {
  return day.getDay() === 0 || day.getDay() === 6
}

function sameDay(a, b) {
  return daysBetween(a, b) === 0
}

function rangeLabel(start, weeks) {
  if (range === 'month') return anchor.toLocaleDateString(LOCALE, {month: 'long', year: 'numeric'})
  const end = addDays(start, weeks * 7 - 1)
  const format = new Intl.DateTimeFormat(LOCALE, {month: 'short', day: 'numeric', year: 'numeric'})
  return format.formatRange ? format.formatRange(start, end) : `${format.format(start)} – ${format.format(end)}`
}

// ---------- grouping (decides each block's color) ----------

function ownerOf(task) {
  return task.ownerName || currentUser?.username || t('msg.unknownUser')
}

// based on everyone with tasks, not just the filtered ones, so a filter never repaints a person
function personColor(name) {
  const names = [...new Set(allTasks.map(ownerOf))].sort((a, b) => a.localeCompare(b))
  return PERSON_COLORS[Math.max(0, names.indexOf(name)) % PERSON_COLORS.length]
}

// [{key, label, color}] for the current grouping, in display order
function groupsFor(tasks) {
  if (groupBy === 'status') {
    return ['todo', 'inprogress', 'done'].map(key => ({key, label: t(`status.${key}`), color: STATUS_COLORS[key]}))
  }
  if (groupBy === 'priority') {
    return ['HIGH', 'MEDIUM', 'LOW'].map(key => ({
      key, label: t(`priority.${key.toLowerCase()}`), color: PRIORITY_COLORS[key]
    }))
  }
  const names = [...new Set(tasks.map(ownerOf))].sort((a, b) => a.localeCompare(b))
  return names.map(name => ({key: name, label: name, color: personColor(name)}))
}

function groupKeyOf(task) {
  if (groupBy === 'status') return statusKey(task)
  if (groupBy === 'priority') return task.priority || 'MEDIUM'
  return ownerOf(task)
}

function filteredTasks() {
  const status = document.getElementById('tl-status').value
  return allTasks.filter(task => task.dueDate && (status === 'all' || statusKey(task) === status) && matchesSearch(task))
}

// ---------- the calendar ----------

function weekdaysHtml(start) {
  let html = ''
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i)
    html += `<div class="tl-weekday ${isWeekend(day) ? 'is-weekend' : ''}">${day.toLocaleDateString(LOCALE, {weekday: 'short'})}</div>`
  }
  return html
}

function blockHtml(task, color) {
  const tooltip = `TASK-${task.taskId} · ${task.title} · ${formatDate(task.dueDate)} · `
    + (isOverdue(task) ? t('timeline.overdue') : t(`status.${statusKey(task)}`))
  const classes = ['tl-block', statusKey(task) === 'done' && 'is-done', isOverdue(task) && 'is-overdue'].filter(Boolean)
  return `
    <a href="#edit-task" class="${classes.join(' ')}" data-id="${task.taskId}" style="--block: ${color}"
       title="${escapeHtml(tooltip)}" aria-label="${escapeHtml(tooltip)}">
      ${isOverdue(task) ? '<span class="tl-flag" aria-hidden="true">!</span>' : ''}
      <span class="tl-block-title">${escapeHtml(task.title)}</span>
    </a>`
}

function dayHtml(day, tasks, colors) {
  const today = startOfToday()
  const classes = [
    'tl-daycell',
    isWeekend(day) && 'is-weekend',
    sameDay(day, today) && 'is-today',
    range === 'month' && day.getMonth() !== anchor.getMonth() && 'is-other-month'
  ].filter(Boolean).join(' ')
  // the 1st of a month (and the first cell) also names the month, so you can tell where months change
  const number = day.getDate() === 1 || sameDay(day, period().start)
    ? day.toLocaleDateString(LOCALE, {day: 'numeric', month: 'short'})
    : day.getDate()
  const label = t('timeline.addOn', {date: day.toLocaleDateString(LOCALE, {weekday: 'long', day: 'numeric', month: 'long'})})

  return `
    <div class="${classes}" data-date="${toDateParam(day)}">
      <div class="tl-dayhead">
        <button type="button" class="tl-add" data-date="${toDateParam(day)}" title="${escapeHtml(label)}"
                aria-label="${escapeHtml(label)}">+</button>
        <span class="tl-daynum">${number}</span>
      </div>
      <div class="tl-blocks">${tasks.map(task => blockHtml(task, colors.get(groupKeyOf(task)))).join('')}</div>
    </div>`
}

function renderCalendar(tasks, groups, start, weeks) {
  const colors = new Map(groups.map(group => [group.key, group.color]))
  const shown = tasks.filter(task => colors.has(groupKeyOf(task)) && !hiddenGroups.has(groupKeyOf(task)))

  const byDay = new Map()
  for (const task of shown) {
    const key = toDateParam(parseDate(task.dueDate))
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(task)
  }
  for (const list of byDay.values()) list.sort((a, b) => a.taskId - b.taskId)

  const end = addDays(start, weeks * 7)
  const inPeriod = shown.filter(task => parseDate(task.dueDate) >= start && parseDate(task.dueDate) < end)
  document.getElementById('result-count').textContent = tn('count.task', inPeriod.length)

  let rows = ''
  for (let w = 0; w < weeks; w++) {
    let cells = ''
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d)
      cells += dayHtml(day, byDay.get(toDateParam(day)) || [], colors)
    }
    rows += `<div class="tl-week">${cells}</div>`
  }

  const container = document.getElementById('timeline')
  container.classList.toggle('is-month', range === 'month')
  container.innerHTML = `
    <div class="tl-weekdays">${weekdaysHtml(start)}</div>
    ${rows}`
}

// ---------- side panel: mini calendar and legend ----------

function renderMiniCalendar(tasks, start, weeks) {
  const month = miniMonth || new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  miniMonth = month
  const today = startOfToday()
  const end = addDays(start, weeks * 7)
  const dueDays = new Set(tasks.map(task => toDateParam(parseDate(task.dueDate))))
  const first = startOfWeek(month)

  let weekdays = ''
  for (let i = 0; i < 7; i++) {
    weekdays += `<span>${addDays(first, i).toLocaleDateString(LOCALE, {weekday: 'narrow'})}</span>`
  }

  let cells = ''
  for (let i = 0; i < 42; i++) {
    const day = addDays(first, i)
    const classes = [
      day.getMonth() !== month.getMonth() && 'is-other',
      day >= start && day < end && 'is-selected',
      sameDay(day, today) && 'is-today',
      dueDays.has(toDateParam(day)) && 'has-tasks'
    ].filter(Boolean).join(' ')
    cells += `<button type="button" class="tl-mini-day ${classes}" data-date="${toDateParam(day)}">${day.getDate()}</button>`
  }

  document.getElementById('tl-mini').innerHTML = `
    <div class="tl-mini-head">
      <button type="button" class="tl-icon-btn tl-arrow" data-mini="-1" aria-label="${t('timeline.prev')}">&#8249;</button>
      <strong>${month.toLocaleDateString(LOCALE, {month: 'long', year: 'numeric'})}</strong>
      <button type="button" class="tl-icon-btn tl-arrow" data-mini="1" aria-label="${t('timeline.next')}">&#8250;</button>
    </div>
    <div class="tl-mini-grid">${weekdays}${cells}</div>`
}

function renderLegend(groups, tasks) {
  const counts = new Map()
  for (const task of tasks) counts.set(groupKeyOf(task), (counts.get(groupKeyOf(task)) || 0) + 1)
  document.getElementById('tl-legend').innerHTML = groups.map(group => `
    <li>
      <label class="tl-legend-item" style="--block: ${group.color}">
        <input type="checkbox" data-group="${escapeHtml(group.key)}" ${hiddenGroups.has(group.key) ? '' : 'checked'}>
        <span class="tl-legend-name">${escapeHtml(group.label)}</span>
        <span class="tl-legend-count">${counts.get(group.key) || 0}</span>
      </label>
    </li>`).join('')
}

function render() {
  const tasks = filteredTasks()
  const groups = groupsFor(tasks)
  const {start, weeks} = period()
  document.getElementById('tl-range-label').textContent = rangeLabel(start, weeks)
  document.getElementById('tl-range').value = range
  document.getElementById('tl-group').value = groupBy
  renderCalendar(tasks, groups, start, weeks)
  renderMiniCalendar(tasks, start, weeks)
  renderLegend(groups, tasks)
}

// ---------- create a task on a day ----------

// opens the New task form with the due date filled in
function newTaskOn(date) {
  document.getElementById('new-due').value = date
  window.location.hash = '#new-task'
  document.getElementById('new-title').focus()
}

// ---------- wiring ----------

document.getElementById('timeline').addEventListener('click', event => {
  const block = event.target.closest('[data-id]')
  if (block) {
    openEdit(Number(block.dataset.id))
    return
  }
  const day = event.target.closest('[data-date]')
  if (day) newTaskOn(day.dataset.date)
})
document.getElementById('tl-prev').addEventListener('click', () => movePeriod(-1))
document.getElementById('tl-next').addEventListener('click', () => movePeriod(1))
document.getElementById('tl-today').addEventListener('click', () => {
  anchor = startOfToday()
  miniMonth = null
  render()
})
document.getElementById('tl-range').addEventListener('change', event => {
  range = event.target.value
  saveSetting(RANGE_KEY, range)
  render()
})
document.getElementById('tl-group').addEventListener('change', event => {
  groupBy = event.target.value
  saveSetting(GROUP_KEY, groupBy)
  hiddenGroups.clear()
  render()
})
document.getElementById('tl-status').addEventListener('change', render)
document.getElementById('tl-mini').addEventListener('click', event => {
  const arrow = event.target.closest('[data-mini]')
  if (arrow) {
    miniMonth = new Date(miniMonth.getFullYear(), miniMonth.getMonth() + Number(arrow.dataset.mini), 1)
    const {start, weeks} = period()
    renderMiniCalendar(filteredTasks(), start, weeks)
    return
  }
  const day = event.target.closest('[data-date]')
  if (day) {
    anchor = parseDate(day.dataset.date)
    miniMonth = null
    render()
  }
})
document.getElementById('tl-legend').addEventListener('change', event => {
  const key = event.target.dataset.group
  if (event.target.checked) hiddenGroups.delete(key)
  else hiddenGroups.add(key)
  render()
})
wireSearch(render)

currentUserReady.then(() => {
  // everyone else only sees their own tasks, so coloring them by person would make every block the same color
  groupBy = readSetting(GROUP_KEY, GROUPS, isAdmin() ? 'person' : 'status')
  return loadTasks()
})
