// Loads the frontend scripts the way a page does (i18n.js, common.js, then the page's own script),
// inside a small fake browser: just enough of `document`, `window` and `localStorage` for the code to run.
// There is no login token, so every API call returns nothing and pages start with no tasks;
// tests then set the data they need, e.g. run('allTasks = [...]').

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

// fixed time zone, so date tests behave the same on every machine (and cover a daylight saving change)
process.env.TZ = 'America/New_York'

const STATIC_DIR = path.join(__dirname, '..', '..', 'main', 'resources', 'static', 'javascript')

function fakeElement(id, value) {
  let text = ''
  return {
    id, value, hidden: false, dataset: {}, innerHTML: '', title: '', className: '',
    style: {setProperty() {}},
    classList: {toggle() {}, add() {}, remove() {}},
    addEventListener() {}, setAttribute() {}, focus() {}, before() {}, after() {}, append() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({width: 0, height: 0, left: 0, top: 0}),
    get textContent() { return text },
    // like a real element: setting text makes it safe HTML
    set textContent(v) {
      text = String(v ?? '')
      this.innerHTML = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
  }
}

// page: 'timeline' or 'reports'; lang: 'en' | 'fr' | 'he'
// values: starting values of form fields, e.g. {'tl-status': 'all'}
async function loadPage(page, {lang = 'en', values = {}} = {}) {
  const elements = new Map()
  const el = id => {
    if (!elements.has(id)) elements.set(id, fakeElement(id, values[id] ?? ''))
    return elements.get(id)
  }

  const sandbox = {
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: {getItem: () => null, setItem() {}, removeItem() {}},
    location: {href: '', hash: '', pathname: `/${page}.html`},
    document: {
      cookie: `lang=${lang}`,
      documentElement: {},
      body: fakeElement('body', ''),
      getElementById: el,
      createElement: () => fakeElement('', ''),
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener() {}
    }
  }
  sandbox.window = sandbox
  const context = vm.createContext(sandbox)

  for (const file of ['i18n.js', 'common.js', `${page}.js`]) {
    const source = fs.readFileSync(path.join(STATIC_DIR, file), 'utf8')
    vm.runInContext(source, context, {filename: file})
  }

  const run = code => vm.runInContext(code, context)
  // let the page finish its start-up (it waits for the current user, then loads tasks)
  await run('currentUserReady')
  await new Promise(resolve => setImmediate(resolve))

  return {run, el, window: sandbox}
}

// the HTML of one day in the timeline, found by its data-date
function dayCell(html, date) {
  const start = html.indexOf(`data-date="${date}"`)
  if (start === -1) return null
  const end = html.indexOf('class="tl-daycell', start)
  return html.slice(start, end === -1 ? undefined : end)
}

module.exports = {loadPage, dayCell}
