// Light / dark mode. Load in <head> right after i18n.js on every page, so the theme is set before the page is drawn.
// Until the user picks one with the button, the page follows the system setting (see the dark mode block in jira.css).

const THEME_KEY = 'theme'

const THEME_ICONS = {
  // shown in light mode: click for dark
  moon: '<path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z"/>',
  // shown in dark mode: click for light
  sun: '<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"/>'
}

function savedTheme() {
  try {
    const theme = localStorage.getItem(THEME_KEY)
    return theme === 'dark' || theme === 'light' ? theme : null
  } catch (ignored) {
    return null
  }
}

function currentTheme() {
  return document.documentElement.dataset.theme ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch (ignored) {
  }
  updateThemeButton()
}

function updateThemeButton() {
  const button = document.getElementById('theme-toggle')
  if (!button) return
  const dark = currentTheme() === 'dark'
  const label = t(dark ? 'theme.toLight' : 'theme.toDark')
  button.title = label
  button.setAttribute('aria-label', label)
  button.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
                           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${THEME_ICONS[dark ? 'sun' : 'moon']}</svg>`
}

// Button next to the language picker in the top bar, or at the bottom of the login/sign-up card
function addThemeButton() {
  const button = document.createElement('button')
  button.type = 'button'
  button.id = 'theme-toggle'
  button.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'))

  const logoutBtn = document.getElementById('logout-btn')
  const authCard = document.querySelector('.auth-card')
  if (logoutBtn) logoutBtn.before(button)
  else if (authCard) authCard.append(button)
  else return
  updateThemeButton()
}

// apply the saved choice immediately (this runs in <head>)
const initialTheme = savedTheme()
if (initialTheme) document.documentElement.dataset.theme = initialTheme

// keep the icon right if the system setting changes while following it
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeButton)

document.addEventListener('DOMContentLoaded', addThemeButton)
