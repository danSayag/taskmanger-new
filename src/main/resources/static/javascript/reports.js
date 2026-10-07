// Reports page: summary numbers and charts, all worked out in the browser from GET /task.
// Admins get every user's tasks from the backend, so their reports cover the whole team.
//
// Not possible yet: "tasks done per week" needs the date a task was finished, which the backend doesn't store.

const WEEKS_AHEAD = 8
const STATUSES = ['todo', 'inprogress', 'done']
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW']
const MAX_PEOPLE = 8

async function loadTasks() {
  try {
    allTasks = (await api('')) || []
  } catch (err) {
    console.error('Error loading tasks', err)
    alert(t('err.loadTasks'))
    return
  }
  renderReports()
}

const formatNumber = n => n.toLocaleString(LOCALE)
const percentOf = (part, total) => total ? Math.round(part / total * 100) : 0
const isOpen = task => statusKey(task) !== 'done'

function countBy(items, keyOf) {
  const counts = new Map()
  for (const item of items) counts.set(keyOf(item), (counts.get(keyOf(item)) || 0) + 1)
  return counts
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
  const d = new Date(date)
  d.setDate(d.getDate() - ((d.getDay() - firstDayOfWeek() + 7) % 7))
  return d
}

// ---------- summary tiles ----------

function tileHtml(label, value, note = '', mark = '') {
  return `
    <div class="r-tile">
      <div class="r-tile-label">${mark}${label}</div>
      <div class="r-tile-value">${formatNumber(value)}</div>
      ${note ? `<div class="r-tile-note">${note}</div>` : ''}
    </div>`
}

function renderTiles(tasks) {
  const total = tasks.length
  const open = tasks.filter(isOpen).length
  const done = total - open
  const overdue = tasks.filter(isOverdue).length
  const today = startOfToday()
  const inAWeek = new Date(today)
  inAWeek.setDate(inAWeek.getDate() + 7)
  const dueSoon = tasks.filter(task => isOpen(task) && task.dueDate
    && parseDate(task.dueDate) >= today && parseDate(task.dueDate) < inAWeek).length

  document.getElementById('r-tiles').innerHTML = [
    tileHtml(t('reports.total'), total),
    tileHtml(t('reports.open'), open, t('reports.ofTotal', {percent: percentOf(open, total)})),
    tileHtml(t('reports.done'), done, t('reports.ofTotal', {percent: percentOf(done, total)}),
      '<span class="r-dot r-done" aria-hidden="true"></span>'),
    tileHtml(t('reports.overdue'), overdue, '', '<span class="r-dot r-overdue" aria-hidden="true"></span>'),
    tileHtml(t('reports.dueSoon'), dueSoon)
  ].join('')
}

// ---------- tables (the same numbers as each chart, for screen readers and exact values) ----------

function tableHtml(headers, rows) {
  return `
    <details class="r-table">
      <summary>${t('reports.showTable')}</summary>
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </details>`
}

// ---------- tasks by status: one stacked bar ----------

function renderStatus(tasks) {
  const counts = countBy(tasks, statusKey)
  const total = tasks.length
  const rows = STATUSES.map(status => ({status, label: t(`status.${status}`), count: counts.get(status) || 0}))

  const segments = rows.filter(row => row.count).map(row => {
    const tip = `${row.label}: ${formatNumber(row.count)} (${percentOf(row.count, total)}%)`
    return `<div class="r-seg r-${row.status}" style="flex-grow: ${row.count}" data-tip="${escapeHtml(tip)}"
                 tabindex="0" aria-label="${escapeHtml(tip)}"></div>`
  }).join('')

  const legend = rows.map(row => `
    <li>
      <span class="r-swatch r-${row.status}" aria-hidden="true"></span>
      <span>${row.label}</span>
      <strong>${formatNumber(row.count)}</strong>
      <span class="r-muted">${percentOf(row.count, total)}%</span>
    </li>`).join('')

  document.getElementById('r-status').innerHTML = total
    ? `<div class="r-stack">${segments}</div>
       <ul class="r-legend">${legend}</ul>
       ${tableHtml([t('col.status'), t('reports.colCount'), '%'],
         rows.map(row => [row.label, formatNumber(row.count), `${percentOf(row.count, total)}%`]))}`
    : `<p class="r-empty">${t('reports.empty')}</p>`
}

// ---------- open tasks by due week: columns ----------

function weekBuckets(tasks) {
  const today = startOfToday()
  const thisWeek = startOfWeek(today)
  const buckets = [{label: t('reports.overdue'), count: 0, overdue: true}]
  for (let i = 0; i < WEEKS_AHEAD; i++) {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() + i * 7)
    buckets.push({
      label: i === 0 ? t('reports.thisWeek') : formatDate(toDateParam(start)),
      title: i === 0 ? t('reports.thisWeek') : t('reports.weekOf', {date: formatDate(toDateParam(start))}),
      count: 0
    })
  }
  buckets.push({label: t('reports.later'), count: 0})

  for (const task of tasks) {
    if (!isOpen(task) || !task.dueDate) continue
    const due = parseDate(task.dueDate)
    if (due < today) {
      buckets[0].count++
      continue
    }
    const week = Math.floor(Math.round((due - thisWeek) / (24 * 60 * 60 * 1000)) / 7)
    buckets[Math.min(week + 1, buckets.length - 1)].count++
  }
  return buckets
}

function renderWeeks(tasks) {
  const buckets = weekBuckets(tasks)
  const max = Math.max(...buckets.map(b => b.count))
  const el = document.getElementById('r-weeks')
  if (!max) {
    el.innerHTML = `<p class="r-empty">${t(tasks.length ? 'reports.noOpen' : 'reports.empty')}</p>`
    return
  }

  const columns = buckets.map(bucket => {
    const name = bucket.title || bucket.label
    const tip = `${name}: ${tn('count.task', bucket.count)}`
    return `
      <div class="r-col ${bucket.overdue ? 'is-overdue' : ''}" data-tip="${escapeHtml(tip)}" tabindex="0"
           aria-label="${escapeHtml(tip)}">
        <div class="r-col-plot">
          <span class="r-col-value">${bucket.count ? formatNumber(bucket.count) : ''}</span>
          <div class="r-col-bar" style="height: ${bucket.count / max * 100}%"></div>
        </div>
        <div class="r-col-label">${escapeHtml(bucket.label)}</div>
      </div>`
  }).join('')

  el.innerHTML = `
    <div class="r-columns">${columns}</div>
    ${tableHtml([t('reports.colWeek'), t('reports.colCount')],
      buckets.map(b => [escapeHtml(b.title || b.label), formatNumber(b.count)]))}`
}

// ---------- horizontal bars (priority, people) ----------

function barsHtml(rows) {
  const max = Math.max(1, ...rows.map(row => row.count))
  return `<div class="r-bars">${rows.map(row => {
    const tip = `${row.text}: ${tn('count.task', row.count)}`
    return `
      <div class="r-bar-row" data-tip="${escapeHtml(tip)}" tabindex="0" aria-label="${escapeHtml(tip)}">
        <div class="r-bar-name">${row.label}</div>
        <div class="r-bar-track">
          <div class="r-bar" style="width: ${row.count / max * 100}%"></div>
          <span class="r-bar-value">${formatNumber(row.count)}</span>
        </div>
      </div>`
  }).join('')}</div>`
}

function renderPriority(tasks) {
  const open = tasks.filter(isOpen)
  const counts = countBy(open, task => task.priority || 'MEDIUM')
  const rows = PRIORITIES.map(priority => {
    const text = t(`priority.${priority.toLowerCase()}`)
    return {text, label: `${priorityIcon(priority)}<span>${text}</span>`, count: counts.get(priority) || 0}
  })
  document.getElementById('r-priority').innerHTML = open.length
    ? barsHtml(rows) + tableHtml([t('col.priority'), t('reports.colCount')], rows.map(r => [r.text, formatNumber(r.count)]))
    : `<p class="r-empty">${t(tasks.length ? 'reports.noOpen' : 'reports.empty')}</p>`
}

// admins only: open tasks per owner, busiest first
function renderPeople(tasks) {
  const card = document.getElementById('r-people-card')
  card.hidden = !isAdmin()
  if (!isAdmin()) return

  const open = tasks.filter(isOpen)
  const sorted = [...countBy(open, task => task.ownerName || t('msg.unknownUser'))]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  // more than MAX_PEOPLE: the rest are summed into one "Others" row
  const top = sorted.slice(0, MAX_PEOPLE)
  const rest = sorted.slice(MAX_PEOPLE).reduce((sum, [, count]) => sum + count, 0)
  if (rest) top.push([t('reports.others'), rest])

  const rows = top.map(([name, count]) => ({
    text: name, count, label: `${avatarHtml(name)}<span>${escapeHtml(name)}</span>`
  }))
  document.getElementById('r-people').innerHTML = rows.length
    ? barsHtml(rows) + tableHtml([t('reports.colPerson'), t('reports.colCount')],
        rows.map(r => [escapeHtml(r.text), formatNumber(r.count)]))
    : `<p class="r-empty">${t(tasks.length ? 'reports.noOpen' : 'reports.empty')}</p>`
}

function renderReports() {
  renderTiles(allTasks)
  renderStatus(allTasks)
  renderWeeks(allTasks)
  renderPriority(allTasks)
  renderPeople(allTasks)
}

// ---------- hover tooltip, shared by every chart ----------

const tip = document.getElementById('r-tip')

function showTip(target, x, y) {
  tip.textContent = target.dataset.tip
  tip.hidden = false
  const box = tip.getBoundingClientRect()
  const left = Math.min(Math.max(8, x - box.width / 2), window.innerWidth - box.width - 8)
  const top = y - box.height - 12 < 8 ? y + 16 : y - box.height - 12
  tip.style.left = `${left}px`
  tip.style.top = `${top}px`
}

document.getElementById('reports').addEventListener('pointermove', event => {
  const target = event.target.closest('[data-tip]')
  if (target) showTip(target, event.clientX, event.clientY)
  else tip.hidden = true
})
document.getElementById('reports').addEventListener('pointerleave', () => { tip.hidden = true })
document.getElementById('reports').addEventListener('focusin', event => {
  const target = event.target.closest('[data-tip]')
  if (!target) return
  const box = target.getBoundingClientRect()
  showTip(target, box.left + box.width / 2, box.top)
})
document.getElementById('reports').addEventListener('focusout', () => { tip.hidden = true })

currentUserReady.then(loadTasks)
