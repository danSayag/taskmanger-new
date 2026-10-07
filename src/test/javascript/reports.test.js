// Reports page (javascript/reports.js). Run with: node --test src/test/javascript
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadPage} = require('./browser')

function task(taskId, dueDate, status = 'TODO', extra = {}) {
  return {taskId, title: `Task ${taskId}`, description: '', priority: 'MEDIUM', status, dueDate, ownerName: 'alice', ...extra}
}

// "today" is fixed to Wednesday October 7, 2026 (in English the week starts Sunday the 4th)
async function reports() {
  const page = await loadPage('reports')
  page.run(`startOfToday = () => new Date(2026, 9, 7)`)
  return page
}

// a value from inside the page, as plain data (arrays made inside the page don't compare equal to ours)
function json(page, expr) {
  return JSON.parse(page.run(`JSON.stringify(${expr})`))
}

// the numbers in the summary tiles, in order
function tileValues(html) {
  return [...html.matchAll(/r-tile-value">([^<]*)</g)].map(m => Number(m[1].replace(/,/g, '')))
}

test.describe('summary tiles', () => {
  test('count total, open, done, overdue and due in the next 7 days', async () => {
    const page = await reports()
    page.run(`renderTiles(${JSON.stringify([
      task(1, '2026-10-01'),               // open, overdue
      task(2, '2026-10-07'),               // open, due today
      task(3, '2026-10-13'),               // open, due in 6 days
      task(4, '2026-10-14'),               // open, 7 days away: not "next 7 days"
      task(5, '2026-10-02', 'DONE'),       // done, so not overdue
      task(6, '2026-10-09', 'IN_PROGRESS') // open, due soon
    ])})`)

    // total, open, done, overdue, due soon
    assert.deepEqual(tileValues(page.el('r-tiles').innerHTML), [6, 5, 1, 1, 3])
  })

  test('percentages round, and never divide by zero', async () => {
    const page = await reports()
    assert.equal(page.run('percentOf(1, 3)'), 33)
    assert.equal(page.run('percentOf(2, 3)'), 67)
    assert.equal(page.run('percentOf(0, 0)'), 0)
  })
})

test.describe('open tasks by due week', () => {
  test('puts each open task in the right week', async () => {
    const page = await reports()
    page.run(`var buckets = weekBuckets(${JSON.stringify([
      task(1, '2026-10-01'),          // overdue
      task(2, '2026-10-02', 'DONE'),  // done: not counted anywhere
      task(3, '2026-10-07'),          // today: this week
      task(4, '2026-10-10'),          // Saturday: still this week
      task(5, '2026-10-11'),          // Sunday: next week
      task(6, '2026-11-20'),          // week of Nov 15
      task(7, '2027-03-01'),          // beyond 8 weeks: later
      task(8, null)                   // no due date: not counted
    ])})`)

    assert.deepEqual(json(page, 'buckets.map(b => b.count)'), [1, 2, 1, 0, 0, 0, 0, 1, 0, 1])
    assert.deepEqual(json(page, 'buckets.map(b => b.label)'),
      ['Overdue', 'This week', 'Oct 11', 'Oct 18', 'Oct 25', 'Nov 1', 'Nov 8', 'Nov 15', 'Nov 22', 'Later'])
  })

  test('every open task with a due date lands in exactly one bucket', async () => {
    const page = await reports()
    const tasks = Array.from({length: 120}, (_, i) => task(i + 1, `2026-${String(9 + (i % 4)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`))
    page.run(`var buckets = weekBuckets(${JSON.stringify(tasks)})`)

    assert.equal(page.run('buckets.reduce((sum, b) => sum + b.count, 0)'), 120)
  })

  test('shows a friendly note when nothing is open', async () => {
    const page = await reports()
    page.run(`renderWeeks(${JSON.stringify([task(1, '2026-10-10', 'DONE')])})`)

    assert.match(page.el('r-weeks').innerHTML, /Nothing open/)
  })
})

test.describe('tasks by status', () => {
  test('the legend shows each status with its count and share', async () => {
    const page = await reports()
    page.run(`renderStatus(${JSON.stringify([task(1, '2026-10-10'), task(2, '2026-10-10', 'IN_PROGRESS'), task(3, '2026-10-10', 'DONE'), task(4, '2026-10-10', 'DONE')])})`)
    const html = page.el('r-status').innerHTML

    assert.match(html, /To do<\/span>\s*<strong>1<\/strong>\s*<span class="r-muted">25%/)
    assert.match(html, /Done<\/span>\s*<strong>2<\/strong>\s*<span class="r-muted">50%/)
    // an empty status gets no bar segment
    assert.equal((html.match(/class="r-seg /g) || []).length, 3)
  })

  test('no tasks at all shows the empty message', async () => {
    const page = await reports()
    page.run('renderStatus([])')

    assert.match(page.el('r-status').innerHTML, /No tasks yet/)
  })
})

test.describe('open tasks by person', () => {
  test('is hidden from regular users', async () => {
    const page = await reports()
    page.run(`currentUser = {id: 1, role: 'USER'}; renderPeople([])`)

    assert.equal(page.el('r-people-card').hidden, true)
  })

  test('admins see the busiest people first, and the rest as "Others"', async () => {
    const page = await reports()
    // person1 has 1 open task, person2 has 2, ... person10 has 10
    const tasks = []
    for (let p = 1; p <= 10; p++) {
      for (let n = 0; n < p; n++) tasks.push(task(tasks.length + 1, '2026-10-20', 'TODO', {ownerName: `person${p}`}))
    }
    page.run(`currentUser = {id: 1, role: 'ADMIN'}; renderPeople(${JSON.stringify(tasks)})`)
    const html = page.el('r-people').innerHTML
    const names = [...html.matchAll(/data-tip="([^:]+):/g)].map(m => m[1])

    assert.equal(page.el('r-people-card').hidden, false)
    assert.deepEqual(names.slice(0, 3), ['person10', 'person9', 'person8'])
    assert.equal(names.length, 9)          // top 8 plus "Others"
    assert.equal(names[8], 'Others')
    assert.match(html, /Others: 3 tasks/)  // person2 (2) + person1 (1)
  })
})
