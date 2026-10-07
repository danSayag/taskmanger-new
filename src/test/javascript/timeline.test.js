// Timeline page (javascript/timeline.js). Run with: node --test src/test/javascript
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadPage, dayCell} = require('./browser')

const TL_VALUES = {'tl-status': 'all'}

function task(taskId, title, dueDate, status = 'TODO', extra = {}) {
  return {taskId, title, description: '', priority: 'MEDIUM', status, dueDate, ownerName: 'alice', ...extra}
}

// page showing October 2026, with "today" fixed to Wednesday Oct 7
async function october(options = {}) {
  const page = await loadPage('timeline', {values: TL_VALUES, ...options})
  page.run(`startOfToday = () => new Date(2026, 9, 7)`)
  page.run(`anchor = new Date(2026, 9, 7); range = 'month'; groupBy = 'status'`)
  return page
}

const ymd = (page, expr) => page.run(`toDateParam(${expr})`)

test.describe('which days are shown', () => {
  test('a month shows whole weeks, starting on Sunday in English', async () => {
    const page = await october()
    page.run('var p = period()')
    assert.equal(ymd(page, 'p.start'), '2026-09-27')
    assert.equal(page.run('p.weeks'), 5)
  })

  test('the week starts on Monday in French', async () => {
    const page = await october({lang: 'fr'})
    page.run('var p = period()')
    assert.equal(ymd(page, 'p.start'), '2026-09-28')
    assert.equal(page.run('p.weeks'), 5)
  })

  test('a month that fits in exactly four weeks gets four lines', async () => {
    const page = await october()
    page.run(`anchor = new Date(2026, 1, 10)`)   // February 2026: Sunday 1st to Saturday 28th
    page.run('var p = period()')
    assert.equal(ymd(page, 'p.start'), '2026-02-01')
    assert.equal(page.run('p.weeks'), 4)
  })

  test('week and 2-week ranges start on the week containing the date', async () => {
    const page = await october()
    page.run(`range = 'week'; var p = period()`)
    assert.equal(ymd(page, 'p.start'), '2026-10-04')
    assert.equal(page.run('p.weeks'), 1)
    page.run(`range = '2weeks'; p = period()`)
    assert.equal(page.run('p.weeks'), 2)
  })
})

test.describe('moving between periods', () => {
  test('next month from January 31st is February, not March', async () => {
    const page = await october()
    page.run(`anchor = new Date(2026, 0, 31); movePeriod(1)`)
    assert.equal(page.run('anchor.getMonth()'), 1)
  })

  test('next and previous move a whole range', async () => {
    const page = await october()
    page.run(`range = 'week'; movePeriod(1)`)
    assert.equal(ymd(page, 'anchor'), '2026-10-14')
    page.run(`range = '2weeks'; movePeriod(-1)`)
    assert.equal(ymd(page, 'anchor'), '2026-09-30')
  })

  test('counting days is not thrown off by daylight saving time', async () => {
    const page = await october()
    // clocks go forward on March 8 and back on November 1, 2026 in New York
    assert.equal(page.run('daysBetween(new Date(2026, 2, 7), new Date(2026, 2, 9))'), 2)
    assert.equal(page.run('daysBetween(new Date(2026, 9, 31), new Date(2026, 10, 2))'), 2)
  })
})

test.describe('the calendar', () => {
  test('each task is drawn on its due date', async () => {
    const page = await october()
    page.run(`allTasks = ${JSON.stringify([task(1, 'Write docs', '2026-10-15'), task(2, 'Ship it', '2026-10-29')])}; render()`)
    const html = page.el('timeline').innerHTML

    assert.match(dayCell(html, '2026-10-15'), /Write docs/)
    assert.match(dayCell(html, '2026-10-29'), /Ship it/)
    assert.doesNotMatch(dayCell(html, '2026-10-16'), /Write docs|Ship it/)
  })

  test('the task count only covers the days shown', async () => {
    const page = await october()
    page.run(`allTasks = ${JSON.stringify([
      task(1, 'In October', '2026-10-15'),
      task(2, 'Late September, still on screen', '2026-09-28'),
      task(3, 'December', '2026-12-01'),
      task(4, 'No due date', null)
    ])}; render()`)

    assert.equal(page.el('result-count').textContent, '2 tasks')
  })

  test('task titles are escaped, so they cannot inject HTML', async () => {
    const page = await october()
    page.run(`allTasks = ${JSON.stringify([task(1, '<img src=x onerror=alert(1)>', '2026-10-15')])}; render()`)
    const html = page.el('timeline').innerHTML

    assert.ok(!html.includes('<img'), 'raw HTML from a title must not reach the page')
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
  })

  test('overdue and done tasks are marked', async () => {
    const page = await october()
    page.run(`allTasks = ${JSON.stringify([
      task(1, 'Late', '2026-10-05', 'TODO'),
      task(2, 'Finished late', '2026-10-05', 'DONE')
    ])}; render()`)
    const cell = dayCell(page.el('timeline').innerHTML, '2026-10-05')

    assert.match(cell, /tl-block is-overdue[^"]*" data-id="1"/)
    assert.match(cell, /tl-flag/)
    assert.match(cell, /tl-block is-done" data-id="2"/)   // done is never overdue
  })

  test('unticking a group in the legend hides its tasks', async () => {
    const page = await october()
    page.run(`allTasks = ${JSON.stringify([task(1, 'Open one', '2026-10-15'), task(2, 'Done one', '2026-10-15', 'DONE')])}`)
    page.run(`hiddenGroups.add('done'); render()`)
    const cell = dayCell(page.el('timeline').innerHTML, '2026-10-15')

    assert.match(cell, /Open one/)
    assert.doesNotMatch(cell, /Done one/)
  })

  test('the status filter hides other statuses', async () => {
    const page = await october()
    page.el('tl-status').value = 'done'
    page.run(`allTasks = ${JSON.stringify([task(1, 'Open one', '2026-10-15'), task(2, 'Done one', '2026-10-15', 'DONE')])}; render()`)
    const cell = dayCell(page.el('timeline').innerHTML, '2026-10-15')

    assert.doesNotMatch(cell, /Open one/)
    assert.match(cell, /Done one/)
  })
})

test.describe('colors', () => {
  test('each person gets a different color', async () => {
    const page = await october()
    page.run(`allTasks = ${JSON.stringify(['alice', 'bob', 'carol'].map((name, i) => task(i + 1, name, '2026-10-15', 'TODO', {ownerName: name})))}`)
    const colors = page.run(`['alice', 'bob', 'carol'].map(personColor)`)

    assert.equal(new Set(colors).size, 3)
  })

  test("filtering doesn't change anyone's color", async () => {
    const page = await october()
    page.run(`allTasks = ${JSON.stringify([
      task(1, 'a', '2026-10-15', 'TODO', {ownerName: 'alice'}),
      task(2, 'b', '2026-10-15', 'DONE', {ownerName: 'bob'})
    ])}; groupBy = 'person'`)
    const before = page.run(`personColor('bob')`)
    page.el('tl-status').value = 'done'   // alice's task is filtered out
    page.run('render()')

    assert.equal(page.run(`groupsFor(filteredTasks())[0].color`), before)
  })
})

test.describe('creating a task from a day', () => {
  test('opens the New task form with that due date', async () => {
    const page = await october()
    page.run(`newTaskOn('2026-10-20')`)

    assert.equal(page.el('new-due').value, '2026-10-20')
    assert.equal(page.window.location.hash, '#new-task')
  })

  test('every day has a "+" button for its date', async () => {
    const page = await october()
    page.run('render()')

    assert.match(page.el('timeline').innerHTML, /class="tl-add" data-date="2026-10-20"/)
  })
})
