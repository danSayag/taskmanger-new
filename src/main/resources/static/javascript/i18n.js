// Translations for English (default), French and Hebrew.
// The chosen language is kept in the "lang" cookie, so it is remembered across pages, reloads and logins.
// Load this in <head> on every page: it sets lang/dir on <html> before the page is drawn.
//
// Static text:  <span data-i18n="key">, <input data-i18n-placeholder="key">, <a data-i18n-title="key">
// From scripts: t('key', {name: 'value'}) and tn('key', count) for "1 task" / "3 tasks"

const LANGUAGES = {
  en: {name: 'English', locale: 'en-US'},
  fr: {name: 'Français', locale: 'fr-FR'},
  he: {name: 'עברית', locale: 'he-IL', rtl: true}
}
const DEFAULT_LANG = 'en'
const LANG_COOKIE = 'lang'

// ---------- cookies ----------

function getCookie(name) {
  const match = document.cookie.split('; ').find(c => c.startsWith(name + '='))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

function setCookie(name, value, days = 365) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${days * 24 * 60 * 60}; path=/; SameSite=Lax`
}

// ---------- current language ----------

const currentLang = LANGUAGES[getCookie(LANG_COOKIE)] ? getCookie(LANG_COOKIE) : DEFAULT_LANG
// for toLocaleDateString / toLocaleTimeString
const LOCALE = LANGUAGES[currentLang].locale

document.documentElement.lang = currentLang
document.documentElement.dir = LANGUAGES[currentLang].rtl ? 'rtl' : 'ltr'

function setLanguage(lang) {
  if (!LANGUAGES[lang] || lang === currentLang) return
  setCookie(LANG_COOKIE, lang)
  // reloading re-renders everything, including text built by the page scripts
  location.reload()
}

// ---------- dictionaries ----------

const TRANSLATIONS = {
  en: {
    'lang.label': 'Language',
    'cookie.notice': 'This site uses cookies to remember your preferences, such as your language.',
    'cookie.ok': 'Got it',

    'title.board': 'Tasks',
    'title.list': 'Tasks · List',
    'title.messages': 'Tasks · Messages',
    'title.users': 'Tasks · Users',
    'title.login': 'Tasks · Log in',
    'title.signup': 'Tasks · Sign up',

    'nav.brand': 'Tasks',
    'nav.board': 'Board',
    'nav.list': 'List',
    'nav.messages': 'Messages',
    'nav.users': 'Users',
    'nav.logout': 'Log out',
    'nav.loggedInAs': 'Logged in as {name}',

    'search.tasks': 'Search tasks...',
    'search.users': 'Search users...',
    'search.conversations': 'Search conversations...',

    'btn.newTask': '+ New task',
    'btn.newUser': '+ New user',
    'btn.addTask': '+ Add task',
    'btn.cancel': 'Cancel',
    'btn.save': 'Save',
    'btn.delete': 'Delete',
    'btn.createTask': 'Create task',
    'btn.createUser': 'Create user',
    'btn.clearFilters': 'Clear filters',
    'btn.send': 'Send',
    'btn.back': '‹ Back',

    'filter.priority': 'Priority',
    'filter.due': 'Due',
    'filter.status': 'Status',
    'filter.sort': 'Sort',
    'filter.role': 'Role',
    'filter.all': 'All',

    'priority.high': 'High',
    'priority.medium': 'Medium',
    'priority.med': 'Med',
    'priority.low': 'Low',
    'priority.HIGH': 'HIGH',
    'priority.MEDIUM': 'MEDIUM',
    'priority.LOW': 'LOW',
    'priority.change': 'Click to change priority',

    'status.todo': 'To do',
    'status.inprogress': 'In progress',
    'status.done': 'Done',
    'status.TODO': 'TODO',
    'status.IN_PROGRESS': 'IN PROGRESS',
    'status.DONE': 'DONE',

    'role.USER': 'USER',
    'role.ADMIN': 'ADMIN',
    'role.user': 'User',
    'role.admin': 'Admin',

    'due.any': 'Any time',
    'due.today': 'Today',
    'due.nextWeek': 'Next week',
    'due.nextMonth': 'Next month',
    'due.nextYear': 'Next year',

    'sort.dueAsc': 'Due date ↑',
    'sort.dueDesc': 'Due date ↓',
    'sort.priority': 'Priority',
    'sort.title': 'Title',

    'col.title': 'Title',
    'col.status': 'Status',
    'col.priority': 'Priority',
    'col.due': 'Due',
    'col.username': 'Username',
    'col.email': 'Email',
    'col.tasks': 'Tasks',
    'col.role': 'Role',

    'count.task.one': '{count} task',
    'count.task.other': '{count} tasks',
    'count.user.one': '{count} user',
    'count.user.other': '{count} users',

    'list.rowsPerPage': 'Rows per page:',
    'list.showing': 'Showing {from}–{to} of {total}',
    'list.showingNone': 'Showing 0 of 0',
    'list.noTasks': 'No tasks found',
    'list.markDone': 'Mark as done',
    'list.markTodo': 'Mark as to do',
    'list.edit': 'Edit',
    'list.delete': 'Delete',
    'pager.prev': '‹ Prev',
    'pager.next': 'Next ›',

    'modal.newTask': 'New task',
    'modal.editTask': 'Edit task',
    'modal.deleteTask': 'Delete task?',
    'modal.deleteMessage': 'This task will be permanently deleted. This can’t be undone.',
    'modal.deleteNamed': '“{title}” will be permanently deleted. This can’t be undone.',
    'modal.newUser': 'New user',
    'toast.taskDeleted': 'Task deleted',

    'field.title': 'Title',
    'field.description': 'Description',
    'field.descPlaceholder': 'Optional details…',
    'field.status': 'Status',
    'field.priority': 'Priority',
    'field.dueDate': 'Due date',
    'field.assignTo': 'Assign to',
    'field.username': 'Username',
    'field.email': 'Email',
    'field.password': 'Password',
    'field.passwordHint': 'At least 8 characters',
    'field.role': 'Role',
    'task.owner': 'Owner',

    'err.titleDueRequired': 'Title and due date are required',
    'err.createTask': 'Could not create task: {detail}',
    'err.updateTask': 'Could not update task: {detail}',
    'err.changeStatus': 'Could not change the task status',
    'err.deleteTask': 'Could not delete task',
    'err.changePriority': 'Could not change the priority',
    'err.loadTasks': 'Could not load tasks',
    'err.loadUsers': 'Could not load users',
    'err.changeRole': 'Could not change the role',
    'err.userFieldsRequired': 'Username, email and password are required',
    'err.passwordLength': 'Password must be at least 8 characters',
    'err.createUser': 'Could not create user (is the username or email already used?)',
    'err.deleteUser': 'Could not delete user',
    'err.sendMessage': 'Could not send the message',

    'admin.you': 'you',
    'admin.cantChangeOwnRole': 'You can’t change your own role',
    'admin.sendMessage': 'Send a message',
    'admin.deleteUser': 'Delete user',
    'admin.noUsers': 'No users found',
    'admin.confirmRole': 'Change {name}’s role to {role}?',
    'admin.confirmDelete': 'Delete {name} and their {tasks}? This can’t be undone.',

    'msg.conversations': 'Conversations',
    'msg.newMessage': '+ New message',
    'msg.startNew': 'Start a new conversation',
    'msg.noneSelected': 'No conversation selected',
    'msg.pickHint': 'Pick a conversation, or start a new one with “+ New message”.',
    'msg.placeholder': 'Write a message… (Enter to send, Shift+Enter for a new line)',
    'msg.unavailable': 'Messaging isn’t available yet — the server doesn’t have the message endpoints.',
    'msg.unknownUser': 'Unknown user',
    'msg.today': 'Today',
    'msg.yesterday': 'Yesterday',
    'msg.noMatches': 'No matches',
    'msg.noConversations': 'No conversations yet',
    'msg.sending': 'Sending…',
    'msg.sayHello': 'No messages yet. Say hello!',

    'auth.login': 'Log in',
    'auth.usernameOrEmail': 'Username or email',
    'auth.noAccount': 'No account?',
    'auth.createOne': 'Create one',
    'auth.createAccount': 'Create account',
    'auth.confirmPassword': 'Confirm password',
    'auth.haveAccount': 'Already have an account?',
    'auth.loginRequired': 'Username and password are required',
    'auth.allRequired': 'All fields are required',
    'auth.passwordMismatch': 'Passwords do not match',
    'auth.requestFailed': 'Request failed ({status})',

    'server.badCredentials': 'Invalid email or password',
    'server.notVerified': 'Account is not verified',
    'server.emailTaken': 'Email already registered',
    'server.usernameTaken': 'Username already taken',
    'server.conflict': 'This conflicts with existing data (for example, you already have a task with this title)'
  },

  fr: {
    'lang.label': 'Langue',
    'cookie.notice': 'Ce site utilise des cookies pour mémoriser vos préférences, comme votre langue.',
    'cookie.ok': 'Compris',

    'title.board': 'Tâches',
    'title.list': 'Tâches · Liste',
    'title.messages': 'Tâches · Messages',
    'title.users': 'Tâches · Utilisateurs',
    'title.login': 'Tâches · Connexion',
    'title.signup': 'Tâches · Inscription',

    'nav.brand': 'Tâches',
    'nav.board': 'Tableau',
    'nav.list': 'Liste',
    'nav.messages': 'Messages',
    'nav.users': 'Utilisateurs',
    'nav.logout': 'Se déconnecter',
    'nav.loggedInAs': 'Connecté en tant que {name}',

    'search.tasks': 'Rechercher des tâches...',
    'search.users': 'Rechercher des utilisateurs...',
    'search.conversations': 'Rechercher des conversations...',

    'btn.newTask': '+ Nouvelle tâche',
    'btn.newUser': '+ Nouvel utilisateur',
    'btn.addTask': '+ Ajouter une tâche',
    'btn.cancel': 'Annuler',
    'btn.save': 'Enregistrer',
    'btn.delete': 'Supprimer',
    'btn.createTask': 'Créer la tâche',
    'btn.createUser': 'Créer l’utilisateur',
    'btn.clearFilters': 'Effacer les filtres',
    'btn.send': 'Envoyer',
    'btn.back': '‹ Retour',

    'filter.priority': 'Priorité',
    'filter.due': 'Échéance',
    'filter.status': 'Statut',
    'filter.sort': 'Trier',
    'filter.role': 'Rôle',
    'filter.all': 'Tous',

    'priority.high': 'Haute',
    'priority.medium': 'Moyenne',
    'priority.med': 'Moy.',
    'priority.low': 'Basse',
    'priority.HIGH': 'HAUTE',
    'priority.MEDIUM': 'MOYENNE',
    'priority.LOW': 'BASSE',
    'priority.change': 'Cliquez pour changer la priorité',

    'status.todo': 'À faire',
    'status.inprogress': 'En cours',
    'status.done': 'Terminé',
    'status.TODO': 'À FAIRE',
    'status.IN_PROGRESS': 'EN COURS',
    'status.DONE': 'TERMINÉ',

    'role.USER': 'UTILISATEUR',
    'role.ADMIN': 'ADMIN',
    'role.user': 'Utilisateur',
    'role.admin': 'Admin',

    'due.any': 'N’importe quand',
    'due.today': 'Aujourd’hui',
    'due.nextWeek': 'Semaine prochaine',
    'due.nextMonth': 'Mois prochain',
    'due.nextYear': 'Année prochaine',

    'sort.dueAsc': 'Échéance ↑',
    'sort.dueDesc': 'Échéance ↓',
    'sort.priority': 'Priorité',
    'sort.title': 'Titre',

    'col.title': 'Titre',
    'col.status': 'Statut',
    'col.priority': 'Priorité',
    'col.due': 'Échéance',
    'col.username': 'Nom d’utilisateur',
    'col.email': 'E-mail',
    'col.tasks': 'Tâches',
    'col.role': 'Rôle',

    'count.task.one': '{count} tâche',
    'count.task.other': '{count} tâches',
    'count.user.one': '{count} utilisateur',
    'count.user.other': '{count} utilisateurs',

    'list.rowsPerPage': 'Lignes par page :',
    'list.showing': '{from}–{to} sur {total}',
    'list.showingNone': '0 sur 0',
    'list.noTasks': 'Aucune tâche trouvée',
    'list.markDone': 'Marquer comme terminée',
    'list.markTodo': 'Marquer comme à faire',
    'list.edit': 'Modifier',
    'list.delete': 'Supprimer',
    'pager.prev': '‹ Préc.',
    'pager.next': 'Suiv. ›',

    'modal.newTask': 'Nouvelle tâche',
    'modal.editTask': 'Modifier la tâche',
    'modal.deleteTask': 'Supprimer la tâche ?',
    'modal.deleteMessage': 'Cette tâche sera définitivement supprimée. Cette action est irréversible.',
    'modal.deleteNamed': '« {title} » sera définitivement supprimée. Cette action est irréversible.',
    'modal.newUser': 'Nouvel utilisateur',
    'toast.taskDeleted': 'Tâche supprimée',

    'field.title': 'Titre',
    'field.description': 'Description',
    'field.descPlaceholder': 'Détails facultatifs…',
    'field.status': 'Statut',
    'field.priority': 'Priorité',
    'field.dueDate': 'Date d’échéance',
    'field.assignTo': 'Assigner à',
    'field.username': 'Nom d’utilisateur',
    'field.email': 'E-mail',
    'field.password': 'Mot de passe',
    'field.passwordHint': 'Au moins 8 caractères',
    'field.role': 'Rôle',
    'task.owner': 'Propriétaire',

    'err.titleDueRequired': 'Le titre et la date d’échéance sont obligatoires',
    'err.createTask': 'Impossible de créer la tâche : {detail}',
    'err.updateTask': 'Impossible de modifier la tâche : {detail}',
    'err.changeStatus': 'Impossible de changer le statut de la tâche',
    'err.deleteTask': 'Impossible de supprimer la tâche',
    'err.changePriority': 'Impossible de changer la priorité',
    'err.loadTasks': 'Impossible de charger les tâches',
    'err.loadUsers': 'Impossible de charger les utilisateurs',
    'err.changeRole': 'Impossible de changer le rôle',
    'err.userFieldsRequired': 'Le nom d’utilisateur, l’e-mail et le mot de passe sont obligatoires',
    'err.passwordLength': 'Le mot de passe doit contenir au moins 8 caractères',
    'err.createUser': 'Impossible de créer l’utilisateur (le nom d’utilisateur ou l’e-mail est-il déjà utilisé ?)',
    'err.deleteUser': 'Impossible de supprimer l’utilisateur',
    'err.sendMessage': 'Impossible d’envoyer le message',

    'admin.you': 'vous',
    'admin.cantChangeOwnRole': 'Vous ne pouvez pas modifier votre propre rôle',
    'admin.sendMessage': 'Envoyer un message',
    'admin.deleteUser': 'Supprimer l’utilisateur',
    'admin.noUsers': 'Aucun utilisateur trouvé',
    'admin.confirmRole': 'Changer le rôle de {name} en {role} ?',
    'admin.confirmDelete': 'Supprimer {name} ainsi que {tasks} ? Cette action est irréversible.',

    'msg.conversations': 'Conversations',
    'msg.newMessage': '+ Nouveau message',
    'msg.startNew': 'Démarrer une nouvelle conversation',
    'msg.noneSelected': 'Aucune conversation sélectionnée',
    'msg.pickHint': 'Choisissez une conversation, ou démarrez-en une avec « + Nouveau message ».',
    'msg.placeholder': 'Écrivez un message… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)',
    'msg.unavailable': 'La messagerie n’est pas encore disponible — le serveur n’a pas les points d’accès des messages.',
    'msg.unknownUser': 'Utilisateur inconnu',
    'msg.today': 'Aujourd’hui',
    'msg.yesterday': 'Hier',
    'msg.noMatches': 'Aucun résultat',
    'msg.noConversations': 'Aucune conversation pour le moment',
    'msg.sending': 'Envoi…',
    'msg.sayHello': 'Aucun message pour le moment. Dites bonjour !',

    'auth.login': 'Se connecter',
    'auth.usernameOrEmail': 'Nom d’utilisateur ou e-mail',
    'auth.noAccount': 'Pas de compte ?',
    'auth.createOne': 'Créez-en un',
    'auth.createAccount': 'Créer un compte',
    'auth.confirmPassword': 'Confirmer le mot de passe',
    'auth.haveAccount': 'Vous avez déjà un compte ?',
    'auth.loginRequired': 'Le nom d’utilisateur et le mot de passe sont obligatoires',
    'auth.allRequired': 'Tous les champs sont obligatoires',
    'auth.passwordMismatch': 'Les mots de passe ne correspondent pas',
    'auth.requestFailed': 'La requête a échoué ({status})',

    'server.badCredentials': 'E-mail ou mot de passe incorrect',
    'server.notVerified': 'Le compte n’est pas vérifié',
    'server.emailTaken': 'Cet e-mail est déjà enregistré',
    'server.usernameTaken': 'Ce nom d’utilisateur est déjà pris',
    'server.conflict': 'Conflit avec des données existantes (par exemple, vous avez déjà une tâche avec ce titre)'
  },

  he: {
    'lang.label': 'שפה',
    'cookie.notice': 'האתר משתמש בעוגיות (cookies) כדי לזכור את ההעדפות שלך, כמו השפה.',
    'cookie.ok': 'הבנתי',

    'title.board': 'משימות',
    'title.list': 'משימות · רשימה',
    'title.messages': 'משימות · הודעות',
    'title.users': 'משימות · משתמשים',
    'title.login': 'משימות · התחברות',
    'title.signup': 'משימות · הרשמה',

    'nav.brand': 'משימות',
    'nav.board': 'לוח',
    'nav.list': 'רשימה',
    'nav.messages': 'הודעות',
    'nav.users': 'משתמשים',
    'nav.logout': 'התנתקות',
    'nav.loggedInAs': 'מחובר/ת בתור {name}',

    'search.tasks': 'חיפוש משימות...',
    'search.users': 'חיפוש משתמשים...',
    'search.conversations': 'חיפוש שיחות...',

    'btn.newTask': '+ משימה חדשה',
    'btn.newUser': '+ משתמש חדש',
    'btn.addTask': '+ הוספת משימה',
    'btn.cancel': 'ביטול',
    'btn.save': 'שמירה',
    'btn.delete': 'מחיקה',
    'btn.createTask': 'יצירת משימה',
    'btn.createUser': 'יצירת משתמש',
    'btn.clearFilters': 'ניקוי מסננים',
    'btn.send': 'שליחה',
    'btn.back': '› חזרה',

    'filter.priority': 'עדיפות',
    'filter.due': 'תאריך יעד',
    'filter.status': 'סטטוס',
    'filter.sort': 'מיון',
    'filter.role': 'תפקיד',
    'filter.all': 'הכול',

    'priority.high': 'גבוהה',
    'priority.medium': 'בינונית',
    'priority.med': 'בינונית',
    'priority.low': 'נמוכה',
    'priority.HIGH': 'גבוהה',
    'priority.MEDIUM': 'בינונית',
    'priority.LOW': 'נמוכה',
    'priority.change': 'לחצו לשינוי העדיפות',

    'status.todo': 'לביצוע',
    'status.inprogress': 'בתהליך',
    'status.done': 'הושלם',
    'status.TODO': 'לביצוע',
    'status.IN_PROGRESS': 'בתהליך',
    'status.DONE': 'הושלם',

    'role.USER': 'משתמש',
    'role.ADMIN': 'מנהל',
    'role.user': 'משתמש',
    'role.admin': 'מנהל',

    'due.any': 'בכל זמן',
    'due.today': 'היום',
    'due.nextWeek': 'בשבוע הקרוב',
    'due.nextMonth': 'בחודש הקרוב',
    'due.nextYear': 'בשנה הקרובה',

    'sort.dueAsc': 'תאריך יעד ↑',
    'sort.dueDesc': 'תאריך יעד ↓',
    'sort.priority': 'עדיפות',
    'sort.title': 'כותרת',

    'col.title': 'כותרת',
    'col.status': 'סטטוס',
    'col.priority': 'עדיפות',
    'col.due': 'תאריך יעד',
    'col.username': 'שם משתמש',
    'col.email': 'אימייל',
    'col.tasks': 'משימות',
    'col.role': 'תפקיד',

    'count.task.one': 'משימה אחת',
    'count.task.other': '{count} משימות',
    'count.user.one': 'משתמש אחד',
    'count.user.other': '{count} משתמשים',

    'list.rowsPerPage': 'שורות בעמוד:',
    'list.showing': '{from}–{to} מתוך {total}',
    'list.showingNone': '0 מתוך 0',
    'list.noTasks': 'לא נמצאו משימות',
    'list.markDone': 'סימון כהושלמה',
    'list.markTodo': 'סימון כלביצוע',
    'list.edit': 'עריכה',
    'list.delete': 'מחיקה',
    'pager.prev': '› הקודם',
    'pager.next': 'הבא ‹',

    'modal.newTask': 'משימה חדשה',
    'modal.editTask': 'עריכת משימה',
    'modal.deleteTask': 'למחוק את המשימה?',
    'modal.deleteMessage': 'המשימה תימחק לצמיתות. לא ניתן לבטל פעולה זו.',
    'modal.deleteNamed': '"{title}" תימחק לצמיתות. לא ניתן לבטל פעולה זו.',
    'modal.newUser': 'משתמש חדש',
    'toast.taskDeleted': 'המשימה נמחקה',

    'field.title': 'כותרת',
    'field.description': 'תיאור',
    'field.descPlaceholder': 'פרטים נוספים (רשות)…',
    'field.status': 'סטטוס',
    'field.priority': 'עדיפות',
    'field.dueDate': 'תאריך יעד',
    'field.assignTo': 'שיוך אל',
    'field.username': 'שם משתמש',
    'field.email': 'אימייל',
    'field.password': 'סיסמה',
    'field.passwordHint': 'לפחות 8 תווים',
    'field.role': 'תפקיד',
    'task.owner': 'בעלים',

    'err.titleDueRequired': 'יש למלא כותרת ותאריך יעד',
    'err.createTask': 'לא ניתן ליצור את המשימה: {detail}',
    'err.updateTask': 'לא ניתן לעדכן את המשימה: {detail}',
    'err.changeStatus': 'לא ניתן לשנות את סטטוס המשימה',
    'err.deleteTask': 'לא ניתן למחוק את המשימה',
    'err.changePriority': 'לא ניתן לשנות את העדיפות',
    'err.loadTasks': 'לא ניתן לטעון את המשימות',
    'err.loadUsers': 'לא ניתן לטעון את המשתמשים',
    'err.changeRole': 'לא ניתן לשנות את התפקיד',
    'err.userFieldsRequired': 'יש למלא שם משתמש, אימייל וסיסמה',
    'err.passwordLength': 'הסיסמה חייבת להכיל לפחות 8 תווים',
    'err.createUser': 'לא ניתן ליצור את המשתמש (ייתכן ששם המשתמש או האימייל כבר בשימוש?)',
    'err.deleteUser': 'לא ניתן למחוק את המשתמש',
    'err.sendMessage': 'לא ניתן לשלוח את ההודעה',

    'admin.you': 'אני',
    'admin.cantChangeOwnRole': 'לא ניתן לשנות את התפקיד של עצמך',
    'admin.sendMessage': 'שליחת הודעה',
    'admin.deleteUser': 'מחיקת משתמש',
    'admin.noUsers': 'לא נמצאו משתמשים',
    'admin.confirmRole': 'לשנות את התפקיד של {name} ל{role}?',
    'admin.confirmDelete': 'למחוק את {name} יחד עם {tasks}? לא ניתן לבטל פעולה זו.',

    'msg.conversations': 'שיחות',
    'msg.newMessage': '+ הודעה חדשה',
    'msg.startNew': 'התחלת שיחה חדשה',
    'msg.noneSelected': 'לא נבחרה שיחה',
    'msg.pickHint': 'בחרו שיחה, או התחילו שיחה חדשה עם "+ הודעה חדשה".',
    'msg.placeholder': 'כתבו הודעה… (Enter לשליחה, Shift+Enter לשורה חדשה)',
    'msg.unavailable': 'ההודעות עדיין לא זמינות — בשרת אין עדיין את נקודות הקצה של ההודעות.',
    'msg.unknownUser': 'משתמש לא ידוע',
    'msg.today': 'היום',
    'msg.yesterday': 'אתמול',
    'msg.noMatches': 'אין תוצאות',
    'msg.noConversations': 'אין עדיין שיחות',
    'msg.sending': 'בשליחה…',
    'msg.sayHello': 'אין עדיין הודעות. אמרו שלום!',

    'auth.login': 'התחברות',
    'auth.usernameOrEmail': 'שם משתמש או אימייל',
    'auth.noAccount': 'אין לך חשבון?',
    'auth.createOne': 'צרו חשבון',
    'auth.createAccount': 'יצירת חשבון',
    'auth.confirmPassword': 'אימות סיסמה',
    'auth.haveAccount': 'כבר יש לך חשבון?',
    'auth.loginRequired': 'יש למלא שם משתמש וסיסמה',
    'auth.allRequired': 'יש למלא את כל השדות',
    'auth.passwordMismatch': 'הסיסמאות אינן תואמות',
    'auth.requestFailed': 'הבקשה נכשלה ({status})',

    'server.badCredentials': 'אימייל או סיסמה שגויים',
    'server.notVerified': 'החשבון לא אומת',
    'server.emailTaken': 'האימייל כבר רשום',
    'server.usernameTaken': 'שם המשתמש כבר תפוס',
    'server.conflict': 'קיימת התנגשות עם נתונים קיימים (למשל, כבר יש לך משימה עם הכותרת הזו)'
  }
}

// ---------- lookup ----------

// Falls back to English, then to the key itself, so a missing translation never breaks the page
function t(key, params = {}) {
  const text = TRANSLATIONS[currentLang][key] ?? TRANSLATIONS[DEFAULT_LANG][key] ?? key
  return text.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match)
}

// tn('count.task', 3) -> "3 tasks"; picks the .one / .other form for the language
const pluralRules = new Intl.PluralRules(LOCALE)
function tn(key, count) {
  const form = pluralRules.select(count) === 'one' ? 'one' : 'other'
  return t(`${key}.${form}`, {count})
}

// The backend answers in English; show the messages we know in the chosen language
const SERVER_MESSAGES = {
  'Invalid email or password': 'server.badCredentials',
  'Account is not verified': 'server.notVerified',
  'Email already registered': 'server.emailTaken',
  'Username already taken': 'server.usernameTaken',
  'This conflicts with existing data (for example, you already have a task with this title)': 'server.conflict'
}
function translateServerMessage(message) {
  return SERVER_MESSAGES[message] ? t(SERVER_MESSAGES[message]) : message
}

// ---------- page ----------

function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n) })
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder) })
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle) })
}

// Language dropdown: in the top bar next to "Log out", or at the bottom of the login/sign-up card
function addLanguagePicker() {
  const select = document.createElement('select')
  select.id = 'lang-picker'
  select.title = t('lang.label')
  select.setAttribute('aria-label', t('lang.label'))
  select.innerHTML = Object.entries(LANGUAGES)
    .map(([code, {name}]) => `<option value="${code}" ${code === currentLang ? 'selected' : ''}>${name}</option>`)
    .join('')
  select.addEventListener('change', () => setLanguage(select.value))

  const logoutBtn = document.getElementById('logout-btn')
  const authCard = document.querySelector('.auth-card')
  if (logoutBtn) logoutBtn.before(select)
  else if (authCard) authCard.append(select)
}

// One-time notice about cookies; dismissing it is remembered in the "cookie_notice" cookie
const COOKIE_NOTICE_COOKIE = 'cookie_notice'

function showCookieNotice() {
  if (getCookie(COOKIE_NOTICE_COOKIE)) return
  const banner = document.createElement('div')
  banner.className = 'cookie-banner'
  banner.setAttribute('role', 'region')
  banner.setAttribute('aria-label', 'Cookies')
  banner.innerHTML = `<p>${t('cookie.notice')}</p><button type="button" class="btn btn-primary">${t('cookie.ok')}</button>`
  banner.querySelector('button').addEventListener('click', () => {
    setCookie(COOKIE_NOTICE_COOKIE, 'dismissed')
    banner.remove()
  })
  document.body.append(banner)
}

document.addEventListener('DOMContentLoaded', () => {
  applyTranslations()
  addLanguagePicker()
  showCookieNotice()
})
