# Task Manager

A multi-user task manager built with Spring Boot. It has JWT authentication, user roles, a PostgreSQL database, and a plain HTML/CSS/JavaScript frontend in a Jira-style layout: a Kanban board, a list view, a timeline, reports, direct messages and an admin panel.

> **Status: work in progress.** Accounts, tasks, the timeline, reports, messages and the admin panel work end to end. Backlog, Projects and Project settings are placeholder pages in the sidebar.

## Features

### Accounts and roles
- **Sign up and log in** from `signup.html` and `login.html`. You can log in with your username or your email. Passwords are hashed with BCrypt.
- **JWT authentication.** The token is kept in the browser's `localStorage` and sent with every API call. Pages send you to the login page if you have no token or it has expired, and **Log out** clears it.
- **Two roles:** `USER` and `ADMIN`. The role is read from the database on each request, so a change applies immediately without logging in again.

### Tasks
- Each task has a title, description, priority (`HIGH` / `MEDIUM` / `LOW`), status (`TODO` / `IN_PROGRESS` / `DONE`) and due date.
- **Tasks belong to users.** Regular users only see and change their own tasks. Asking for someone else's task returns `404`. Admins see everyone's tasks, with the owner's name on each one.
- **Board view** (`index.html`): tasks in *To do*, *In progress* and *Done* columns. **Drag a card** to another column to change its status. Click the priority badge to cycle it LOW → MEDIUM → HIGH. Overdue tasks are highlighted.
- **List view** (`list.html`): the same tasks in a table, with filters for status and priority, sorting, pages, and a checkbox to mark a task done.
- **Filters:** the priority and due-date filters are applied by the backend.
- **Search** is done by the backend over titles and descriptions, and tolerates small typos.
- Titles must be unique per user, so two users can have tasks with the same name.

### Admin panel (`admin.html`, admins only)
- See every user with their email, role and number of tasks.
- Create users with a chosen role, change a user's role, and delete users. Deleting a user also deletes their tasks.
- Admins can't change their own role or delete their own account, so they can't lock themselves out.
- When creating a task, admins get an **Assign to** field to create it for another user.

### Timeline (`timeline.html`)
- A calendar: **one line per week**, one cell per day, with the date in each day's top corner and the task due that day shown as colored blocks. Today is highlighted.
- **Click a day** (or its **+**) to create a task due that day: the New task form opens with the date filled in. Click a block to edit that task.
- Move between periods with **‹ Today ›**, show **1 week, 2 weeks or a whole month**, or jump to a date from the mini calendar (days with tasks due have a dot).
- **Color by** person, status or priority. The colored list in the side panel is the legend; untick an entry to hide its tasks. Regular users only see their own tasks, so their blocks are colored by status by default.
- Overdue tasks get a red edge and a "!" badge; done tasks are faded and struck through.
- Frontend only: it's built from `GET /task`.

### Reports (`reports.html`)
- Summary numbers: total, open, done, overdue, and tasks due in the next 7 days.
- Charts: tasks by status, open tasks by due week (overdue, this week, the next 7 weeks, later), and open tasks by priority. Admins also see open tasks per person.
- Hover a bar for exact numbers; **Show as table** under each chart lists them too.
- Frontend only: the numbers are worked out in the browser from `GET /task`, so admins' reports cover the whole team.

### Messages (`messages.html`)
- Direct messages between users: a conversation list, a chat thread, and new messages checked every 5 seconds.
- **+ New message** starts a conversation with anyone; both people see it in their list. Admins see every conversation.

### Look and feel
- Jira-style layout with a collapsible project sidebar.
- **Light and dark mode:** follows the system setting until you pick one with the button in the top bar; the choice is remembered.

### Languages
- The site is available in **English** (default), **French** and **Hebrew**. Pick one from the language menu in the top bar or on the login page.
- The choice is saved in a `lang` cookie, so it is remembered across pages and logins. Hebrew switches the layout to right-to-left.
- All text lives in `javascript/i18n.js`. A small notice tells visitors the site uses cookies; dismissing it sets a `cookie_notice` cookie.

## Tech stack

- Java 17, Spring Boot 4.1
- Spring Security with stateless JWT auth (jjwt 0.12)
- Spring Data JPA + PostgreSQL, Flyway migrations
- Bean Validation, Lombok
- springdoc-openapi (Swagger UI)
- Frontend: plain HTML, CSS and JavaScript, served by Spring Boot from `src/main/resources/static`

## Running locally

1. Create a PostgreSQL database named `taskmanager`.
2. Create a `.env` file in the project root (it is gitignored):

   ```properties
   JWT_SECRET_KEY=<output of: openssl rand -base64 32>
   DB_PASSWORD=<your postgres password>

   # Optional overrides
   # DB_URL=jdbc:postgresql://localhost:5432/taskmanager
   # DB_USERNAME=postgres

   # Optional: create an admin account on startup (all three are needed)
   # app.admin.username=admin
   # app.admin.password=change-me
   # app.admin.email=admin@taskmanager.local
   ```

3. Start the app:

   ```bash
   ./mvnw spring-boot:run
   ```

   Flyway creates or updates the tables on start.

4. Open `http://localhost:8080`. You'll be sent to the login page; sign up there or log in with the admin account.

### Getting the first admin

New sign-ups are always `USER`. To get an admin, either:
- set the three `app.admin.*` properties above and restart. That account is created if missing, and made `ADMIN` on every start; or
- promote an existing account in the database:
  ```sql
  UPDATE users SET role = 'ADMIN' WHERE username = 'your-username';
  ```

After that, admins can create more admins from the admin panel.

## API

All endpoints except `/auth/**` need an `Authorization: Bearer <token>` header.

Errors are returned as RFC 7807 `ProblemDetail` JSON by a global exception handler:

| Status | When |
|---|---|
| `400` | Validation failed (with an `errors` map of field → message), malformed JSON, or an invalid value such as an unknown priority |
| `401` | Missing, invalid or expired token, or wrong login details |
| `403` | Not allowed, e.g. a regular user calling `/admin/**` |
| `404` | Task, user or conversation not found (including another user's task, or a conversation you're not part of) |
| `409` | Duplicate data, e.g. two tasks with the same title for one user |

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register. Body: `{ "username", "email", "password" }` (password at least 8 characters). Returns `{ "token", "expiresIn" }` so the new user is logged in right away |
| `POST` | `/auth/login` | Log in. Body: `{ "username", "password" }`; `username` can also be the email. Returns `{ "token", "expiresIn" }` |

### Tasks

Regular users only see and change their own tasks; admins see all of them.

| Method | Path | Description |
|---|---|---|
| `GET` | `/task` | List tasks |
| `GET` | `/task/{taskId}` | Get one task |
| `POST` | `/task` | Create a task (`201`). Body: `{ "title", "description", "priority", "status", "dueDate" }`. Admins can add `?ownerId=<id>` to create it for another user |
| `PUT` | `/task/{taskId}` | Update a task (same body) |
| `DELETE` | `/task/{taskId}` | Delete a task (`204`) |
| `PATCH` | `/task/{taskId}/priority` | Change a task's priority. Body: `{ "priority" }` |
| `GET` | `/task/priority/{priority}` | Tasks with that priority |
| `GET` | `/task/due/{yyyy-MM-dd}` | Tasks due on or before that date |
| `GET` | `/task/search/{query}` | Tasks whose title or description matches the query, allowing small typos |

Task request body rules: `title` is required (max 255 characters), `description` is optional (max 2000), `priority` and `dueDate` (`yyyy-MM-dd`) are required, `status` defaults to `TODO`.

Tasks are returned as `{ "taskId", "title", "description", "priority", "status", "dueDate", "ownerName" }`.

### Users

| Method | Path | Who | Description |
|---|---|---|---|
| `GET` | `/users/me` | Anyone logged in | The current user: `{ id, username, email, role, taskCount }` |
| `GET` | `/users` | Anyone logged in | Everyone you can message: `[{ id, username }]` |
| `GET` | `/admin/users` | Admin | List all users |
| `POST` | `/admin/users` | Admin | Create a user. Body: `{ "username", "email", "password", "role" }` |
| `PUT` | `/admin/users/{userId}/role` | Admin | Change a role. Body: `{ "role": "USER" \| "ADMIN" }` |
| `DELETE` | `/admin/users/{userId}` | Admin | Delete a user and their tasks |

### Messages

A conversation is between two people. The sender is always the logged-in user; the receiver is worked out by the server.

| Method | Path | Description |
|---|---|---|
| `GET` | `/convo` | Your conversations, each with its messages oldest first. Admins get every conversation |
| `POST` | `/convo` | Start a conversation (`201`). Body: `{ "receiverId", "content" }`. Returns the conversation. `400` if the receiver is you or doesn't exist |
| `POST` | `/convo/{convoId}/messages` | Reply in a conversation (`201`). Body: `{ "content" }`. Returns the saved message. `404` if it doesn't exist or you're not part of it |

Conversations are returned as `{ "convoId", "messages": [...] }` and messages as `{ "messageId", "senderId", "receiverId", "content" }`. `content` is required, max 2000 characters.

Interactive API docs are at `http://localhost:8080/swagger-ui.html` while the app is running.

## Database migrations

| Version | Change |
|---|---|
| `V1` | `users` table |
| `V2` | `tasks` table |
| `V3` | `status` column on tasks (existing tasks become `TODO`) |
| `V4` | `role` column on users, `user_id` owner on tasks, titles unique per user. Tasks that existed before this migration are given to the first account |
| `V5` | `convo` and `message` tables |
| `V6` | Renames `message.getter_id` to `receiver_id` |

## Project structure

```
src/main/java/org/example/taskmanger/
├── config/       Security, JWT filter, optional admin account setup
├── controller/   REST controllers (auth, tasks, users, conversations)
├── dto/          Request/response records (entities are never exposed by the API)
├── exception/    Custom exceptions and the global error handler
├── model/        JPA entities and enums (User, Task, Convo, Message, Role, Priority, Status)
├── repository/   Spring Data repositories
└── service/      Business logic (auth, JWT, tasks, users, conversations, current user)
src/main/resources/
├── db/migration/ Flyway SQL migrations
└── static/
    ├── index.html, list.html     Board and list views
    ├── login.html, signup.html   Auth pages
    ├── timeline.html             Timeline
    ├── reports.html              Reports
    ├── admin.html                Admin panel
    ├── messages.html             Messages
    ├── backlog.html, projects.html, settings.html   Placeholders ("Soon" in the sidebar)
    ├── css/                      Styles (jira.css is the theme; timeline.css and reports.css are page styles)
    └── javascript/
        ├── guard.js              Redirects to login when there's no token
        ├── i18n.js               Translations and the language picker
        ├── theme.js              Light/dark mode
        ├── sidebar.js            Project sidebar
        ├── common.js             API helper, current user, shared task actions
        ├── script.js             Board page
        ├── list.js               List page
        ├── timeline.js           Timeline page
        ├── reports.js            Reports page
        ├── admin.js              Admin panel
        ├── auth.js               Login and sign-up
        └── messages.js           Messages page
```

## Still to do

- **Backlog, Projects and Project settings** pages (placeholders for now).
- **Start dates on tasks**, so the timeline can show tasks that span several days.
- **A "done" date on tasks**, so reports can show tasks finished per week.
- **`MANAGER` role:** it exists in the `Role` enum but isn't used anywhere yet.
- **Email verification:** the `verification_code` columns and the mail starter exist, but new accounts are enabled right away (see the TODO in `AuthenticationService`).
- **Tests for messaging:** the test suite (`./mvnw test`) covers auth, tasks, users and the admin API, but not conversations yet.
