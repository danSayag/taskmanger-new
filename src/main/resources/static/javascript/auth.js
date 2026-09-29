const AUTH_URL = 'http://localhost:8080/auth'

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
        let detail = `Request failed (${response.status})`
        try {
            const problem = await response.json()
            detail = problem.detail || detail
        } catch (ignored) {
        }
        throw new Error(detail)
    }
    return response.status === 201 ? null : response.json()
}

const loginForm = document.getElementById('login-form')
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        showError('')
        const username = document.getElementById('login-username').value.trim()
        const password = document.getElementById('login-password').value
        if (!username || !password) {
            showError('Username and password are required')
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
            showError('All fields are required')
            return
        }
        if (password.length < 8) {
            showError('Password must be at least 8 characters')
            return
        }
        if (password !== confirm) {
            showError('Passwords do not match')
            return
        }
        try {
            await postAuth('signup', {username, email, password})
            window.location.href = './login.html'
        } catch (err) {
            showError(err.message)
        }
    })
}
