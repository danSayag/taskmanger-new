// Admin panel: list every user and change their role. Needs common.js.

const USERS_URL = BASE_URL + '/admin/users'

let allUsers = []

async function loadUsers() {
  try {
    allUsers = (await request(USERS_URL)) || []
  } catch (err) {
    console.error('Error loading users', err)
    alert(t('err.loadUsers'))
    return
  }
  renderUsers()
}

function rowHtml(user) {
  const isMe = user.id === currentUser.id
  const options = ['USER', 'ADMIN']
    .map(role => `<option value="${role}" ${role === user.role ? 'selected' : ''}>${t(`role.${role}`)}</option>`)
    .join('')
  return `
    <tr>
      <td><p class="row-title">${escapeHtml(user.username)}${isMe ? ` <span class="owner-tag">${t('admin.you')}</span>` : ''}</p></td>
      <td>${escapeHtml(user.email)}</td>
      <td>${user.taskCount}</td>
      <td>
        <select class="role-select" data-id="${user.id}" ${isMe ? `disabled title="${t('admin.cantChangeOwnRole')}"` : ''}>
          ${options}
        </select>
      </td>
      <td class="col-actions">
        ${isMe ? '' : `<a href="./messages.html#user=${user.id}" class="row-action" title="${t('admin.sendMessage')}">&#9993;</a>`}
        ${isMe ? '' : `<a href="#" class="row-action delete-user" data-id="${user.id}" title="${t('admin.deleteUser')}">&#128465;</a>`}
      </td>
    </tr>`
}

function renderUsers() {
  const query = document.getElementById('search').value.trim().toLowerCase()
  const role = document.getElementById('role-filter').value
  const users = allUsers.filter(user =>
    (role === 'all' || user.role === role) &&
    (!query || `${user.username} ${user.email}`.toLowerCase().includes(query)))

  document.querySelector('#user-list tbody').innerHTML = users.length
    ? users.map(rowHtml).join('')
    : `<tr><td colspan="5" class="cell-empty">${t('admin.noUsers')}</td></tr>`
  document.getElementById('result-count').textContent = tn('count.user', users.length)
}

async function changeRole(select) {
  const user = allUsers.find(u => u.id === Number(select.dataset.id))
  const role = select.value
  if (!confirm(t('admin.confirmRole', {name: user.username, role: t(`role.${role}`)}))) {
    select.value = user.role
    return
  }

  try {
    const updated = await request(`${USERS_URL}/${user.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({role})
    })
    Object.assign(user, updated)
  } catch (err) {
    console.error('Error changing role', err)
    alert(t('err.changeRole'))
    select.value = user.role
    return
  }
  renderUsers()
}

async function submitNewUser() {
  const username = document.getElementById('new-username').value.trim()
  const email = document.getElementById('new-email').value.trim()
  const password = document.getElementById('new-password').value
  if (!username || !email || !password) {
    alert(t('err.userFieldsRequired'))
    return
  }
  if (password.length < 8) {
    alert(t('err.passwordLength'))
    return
  }

  try {
    await request(USERS_URL, {
      method: 'POST',
      body: JSON.stringify({username, email, password, role: document.getElementById('new-role').value})
    })
  } catch (err) {
    console.error('Error creating user', err)
    alert(t('err.createUser'))
    return
  }

  for (const id of ['new-username', 'new-email', 'new-password']) {
    document.getElementById(id).value = ''
  }
  document.getElementById('new-role').value = 'USER'
  window.location.hash = ''
  loadUsers()
}

async function deleteUser(userId) {
  const user = allUsers.find(u => u.id === userId)
  const tasks = tn('count.task', user.taskCount)
  if (!confirm(t('admin.confirmDelete', {name: user.username, tasks}))) return

  try {
    await request(`${USERS_URL}/${userId}`, {method: 'DELETE'})
  } catch (err) {
    console.error('Error deleting user', err)
    alert(t('err.deleteUser'))
    return
  }
  loadUsers()
}

document.querySelector('#user-list tbody').addEventListener('click', event => {
  const del = event.target.closest('.delete-user')
  if (!del) return
  event.preventDefault()
  deleteUser(Number(del.dataset.id))
})
document.querySelector('#user-list tbody').addEventListener('change', event => {
  const select = event.target.closest('.role-select')
  if (select) changeRole(select)
})
document.getElementById('search').addEventListener('input', renderUsers)
document.getElementById('role-filter').addEventListener('change', renderUsers)

// only admins may be here
currentUserReady.then(() => {
  if (!isAdmin()) {
    window.location.replace('./index.html')
    return
  }
  loadUsers()
})
