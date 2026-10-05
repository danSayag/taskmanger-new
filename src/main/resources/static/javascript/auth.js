// same origin as the page, so it works locally and when deployed
const AUTH_URL = '/auth'

const errorBox = document.getElementById('auth-error')

function showError(message) {
    errorBox.textContent = message
}

async function postAuth(path, payload) {
    const response = await fetch(`${AUTH_URL}/${path}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        let detail = t('auth.requestFailed', {status: response.status})
        try {
            const problem = await response.json()
            detail = translateServerMessage(problem.detail) || detail
        } catch (ignored) {
        }
        throw new Error(detail)
    }
    return response.json()
}

const loginForm = document.getElementById('login-form')
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        showError('')
        const username = document.getElementById('login-username').value.trim()
        const password = document.getElementById('login-password').value
        if (!username || !password) {
            showError(t('auth.loginRequired'))
            return
        }
        try {
            const {token} = await postAuth('login', {username, password})
            localStorage.setItem('token', token)
            window.location.href = './index.html'
        } catch (err) {
            showError(err.message)
        }
    })
}

const signupForm = document.getElementById('signup-form')
if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        showError('')
        const username = document.getElementById('signup-username').value.trim()
        const email = document.getElementById('signup-email').value.trim()
        const password = document.getElementById('signup-password').value
        const confirm = document.getElementById('signup-confirm').value
        if (!username || !email || !password) {
            showError(t('auth.allRequired'))
            return
        }
        if (password.length < 8) {
            showError(t('err.passwordLength'))
            return
        }
        if (password !== confirm) {
            showError(t('auth.passwordMismatch'))
            return
        }
        try {
            const {token} = await postAuth('signup', {username, email, password})
            localStorage.setItem('token', token)
            window.location.href = './index.html'
        } catch (err) {
            showError(err.message)
        }
    })
}
