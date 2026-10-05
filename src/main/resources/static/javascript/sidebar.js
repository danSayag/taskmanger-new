// Jira-style project sidebar, shared by every page after login. Needs i18n.js and common.js.
// Load it at the end of <body>, after common.js. Styles are in css/sidebar.css.
//
// To add or reorder items, edit SIDEBAR_SECTIONS. `soon: true` shows a "Soon" tag next to items whose
// page is still a placeholder; remove it once you implement that page.

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

// 16x16 stroke icons, drawn with currentColor so they follow the text color
const SIDEBAR_ICONS = {
  board: '<rect x="2" y="2.5" width="3.5" height="11" rx="1"/><rect x="6.25" y="2.5" width="3.5" height="7" rx="1"/><rect x="10.5" y="2.5" width="3.5" height="9" rx="1"/>',
  list: '<path d="M5.5 4h8M5.5 8h8M5.5 12h8"/><circle cx="2.75" cy="4" r=".75"/><circle cx="2.75" cy="8" r=".75"/><circle cx="2.75" cy="12" r=".75"/>',
  backlog: '<rect x="2" y="2.5" width="12" height="3" rx="1"/><rect x="2" y="6.5" width="12" height="3" rx="1"/><rect x="2" y="10.5" width="12" height="3" rx="1"/>',
  timeline: '<path d="M2 4h6M5 8h7M3 12h5"/><path d="M14 2v12" stroke-dasharray="1.5 1.5"/>',
  reports: '<path d="M2 14h12"/><path d="M4 11V7M8 11V3M12 11V9"/>',
  messages: '<path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"/>',
  users: '<circle cx="6" cy="5.5" r="2.5"/><path d="M1.5 13.5c.5-2.5 2.3-3.5 4.5-3.5s4 1 4.5 3.5"/><path d="M10.5 3.2a2.5 2.5 0 0 1 0 4.6M12 10.3c1.3.5 2.2 1.5 2.5 3.2"/>',
  projects: '<path d="M2 4.5V12.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H8L6.5 3H3a1 1 0 0 0-1 1.5z"/>',
  settings: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',
  collapse: '<path d="M10 3.5L5.5 8l4.5 4.5"/>',
  menu: '<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>'
}

const SIDEBAR_SECTIONS = [
  {
    title: 'nav.planning',
    items: [
      {label: 'nav.board', href: './index.html', icon: 'board'},
      {label: 'nav.list', href: './list.html', icon: 'list'},
      {label: 'nav.backlog', href: './backlog.html', icon: 'backlog', soon: true},
      {label: 'nav.timeline', href: './timeline.html', icon: 'timeline', soon: true},
      {label: 'nav.reports', href: './reports.html', icon: 'reports', soon: true}
    ]
  },
  {
    title: 'nav.team',
    items: [
      {label: 'nav.messages', href: './messages.html', icon: 'messages'},
      {label: 'nav.users', href: './admin.html', icon: 'users', adminOnly: true}
    ]
  }
]

// pinned to the bottom of the sidebar
const SIDEBAR_FOOTER = [
  {label: 'nav.projects', href: './projects.html', icon: 'projects', soon: true},
  {label: 'nav.settings', href: './settings.html', icon: 'settings', soon: true}
]

function sidebarIcon(name) {
  return `<svg class="sidebar-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SIDEBAR_ICONS[name]}</svg>`
}

function isCurrentPage(href) {
  const page = location.pathname.split('/').pop() || 'index.html'
  return href.endsWith('/' + page)
}

function sidebarItemHtml(item) {
  const current = isCurrentPage(item.href)
  return `
    <li ${item.adminOnly ? 'class="sidebar-admin-only" hidden' : ''}>
      <a href="${item.href}" class="sidebar-link ${current ? 'is-active' : ''}" ${current ? 'aria-current="page"' : ''}
         title="${escapeHtml(t(item.label))}">
        ${sidebarIcon(item.icon)}
        <span class="sidebar-text">${escapeHtml(t(item.label))}</span>
        ${item.soon ? `<span class="sidebar-soon">${escapeHtml(t('sidebar.soon'))}</span>` : ''}
      </a>
    </li>`
}

function buildSidebar() {
  const nav = document.createElement('nav')
  nav.className = 'sidebar'
  nav.id = 'sidebar'
  nav.setAttribute('aria-label', t('sidebar.label'))
  nav.innerHTML = `
    <div class="sidebar-project">
      <span class="sidebar-project-icon" aria-hidden="true">&#10003;</span>
      <div class="sidebar-text">
        <div class="sidebar-project-name">${escapeHtml(t('nav.brand'))}</div>
        <div class="sidebar-project-type">${escapeHtml(t('sidebar.projectType'))}</div>
      </div>
    </div>
    <div class="sidebar-scroll">
      ${SIDEBAR_SECTIONS.map(section => `
        <div class="sidebar-section">
          <h3 class="sidebar-heading sidebar-text">${escapeHtml(t(section.title))}</h3>
          <ul>${section.items.map(sidebarItemHtml).join('')}</ul>
        </div>`).join('')}
    </div>
    <ul class="sidebar-footer">${SIDEBAR_FOOTER.map(sidebarItemHtml).join('')}</ul>
    <button type="button" class="sidebar-collapse" id="sidebar-collapse">${sidebarIcon('collapse')}</button>`

  const backdrop = document.createElement('div')
  backdrop.className = 'sidebar-backdrop'
  backdrop.addEventListener('click', closeMobileSidebar)

  document.body.prepend(nav, backdrop)
  document.body.classList.add('has-sidebar')

  // collapse to icons only (desktop); remembered in this browser
  let collapsed = false
  try {
    collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch (ignored) {
  }
  setSidebarCollapsed(collapsed)
  document.getElementById('sidebar-collapse').addEventListener('click', () => {
    setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'))
  })

  // hamburger at the start of the top bar, for small screens
  const topbar = document.querySelector('.topbar')
  if (topbar) {
    const menu = document.createElement('button')
    menu.type = 'button'
    menu.className = 'sidebar-menu-btn'
    menu.title = t('sidebar.menu')
    menu.setAttribute('aria-label', t('sidebar.menu'))
    menu.setAttribute('aria-controls', 'sidebar')
    menu.innerHTML = sidebarIcon('menu')
    menu.addEventListener('click', () => document.body.classList.toggle('sidebar-open'))
    topbar.prepend(menu)
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMobileSidebar()
  })

  // the Users link is only for admins
  currentUserReady.then(() => {
    if (isAdmin()) nav.querySelectorAll('.sidebar-admin-only').forEach(el => { el.hidden = false })
  })
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed)
  const button = document.getElementById('sidebar-collapse')
  const label = t(collapsed ? 'sidebar.expand' : 'sidebar.collapse')
  button.title = label
  button.setAttribute('aria-label', label)
  button.setAttribute('aria-expanded', String(!collapsed))
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  } catch (ignored) {
  }
}

function closeMobileSidebar() {
  document.body.classList.remove('sidebar-open')
}

buildSidebar()
