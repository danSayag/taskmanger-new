# Task Manager

A multi-user task manager built with Spring Boot. It has JWT authentication, user roles, a PostgreSQL database, and a plain HTML/CSS/JavaScript frontend with a Kanban board, a list view and an admin panel.

> **Status: work in progress.** Accounts, tasks and the admin panel work end to end. The messages page is built on the frontend only; its backend endpoints don't exist yet.

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
- **Filters:** the priority and due-date filters are applied by the backend. Search runs in the browser.
- Titles must be unique per user, so two users can have tasks with the same name.

### Admin panel (`admin.html`, admins only)
- See every user with their email, role and number of tasks.
- Create users with a chosen role, change a user's role, and delete users. Deleting a user also deletes their tasks.
- Admins can't change their own role or delete their own account, so they can't lock themselves out.
- When creating a task, admins get an **Assign to** field to create it for another user.

### Messages (`messages.html`, frontend only)
- Direct messages between users: a conversation list with unread counts, a chat thread, and new messages checked every 5 seconds.
- Until the backend endpoints below exist, the page shows "Messaging isn't available yet".

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
| `404` | Task or user not found (including another user's task) |
| `409` | Duplicate data, e.g. two tasks with the same title for one user |

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register. Body: `{ "username", "email", "password" }` (password at least 8 characters) |
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

Task request body rules: `title` is required (max 255 characters), `description` is optional (max 2000), `priority` and `dueDate` (`yyyy-MM-dd`) are required, `status` defaults to `TODO`.

Tasks are returned as `{ "taskId", "title", "description", "priority", "status", "dueDate", "ownerName" }`.

### Users

| Method | Path | Who | Description |
|---|---|---|---|
| `GET` | `/users/me` | Anyone logged in | The current user: `{ id, username, email, role, taskCount }` |
| `GET` | `/admin/users` | Admin | List all users |
| `POST` | `/admin/users` | Admin | Create a user. Body: `{ "username", "email", "password", "role" }` |
| `PUT` | `/admin/users/{userId}/role` | Admin | Change a role. Body: `{ "role": "USER" \| "ADMIN" }` |
| `DELETE` | `/admin/users/{userId}` | Admin | Delete a user and their tasks |

### Messages (not built yet)

The messages page expects these endpoints:

| Method | Path | Returns |
|---|---|---|
| `GET` | `/users` | `[{ id, username }]`, everyone you can message (open to all logged-in users) |
| `GET` | `/messages/conversations` | `[{ userId, username, lastMessage, lastSentAt, unreadCount }]` |
| `GET` | `/messages/{userId}` | `[{ id, senderId, recipientId, content, sentAt }]`, oldest first |
| `POST` | `/messages/{userId}` | Send a message. Body: `{ "content" }`. Returns the saved message |
| `PUT` | `/messages/{userId}/read` | Mark that user's messages to you as read |

Interactive API docs are at `http://localhost:8080/swagger-ui.html` while the app is running.

## Database migrations

| Version | Change |
|---|---|
| `V1` | `users` table |
| `V2` | `tasks` table |
| `V3` | `status` column on tasks (existing tasks become `TODO`) |
| `V4` | `role` column on users, `user_id` owner on tasks, titles unique per user. Tasks that existed before this migration are given to the first account |

## Project structure

```
src/main/java/org/example/taskmanger/
├── config/       Security, JWT filter, optional admin account setup
├── controller/   REST controllers (auth, tasks, users)
├── dto/          Request/response records (entities are never exposed by the API)
├── exception/    Custom exceptions and the global error handler
├── model/        JPA entities and enums (User, Task, Role, Priority, Status)
├── repository/   Spring Data repositories
└── service/      Business logic (auth, JWT, tasks, users, current user)
src/main/resources/
├── db/migration/ Flyway SQL migrations
└── static/
    ├── index.html, list.html     Board and list views
    ├── login.html, signup.html   Auth pages
    ├── admin.html                Admin panel
    ├── messages.html             Messages (frontend only)
    ├── css/                      Styles
    └── javascript/
        ├── guard.js              Redirects to login when there's no token
        ├── common.js             API helper, current user, shared task actions
        ├── script.js             Board page
        ├── list.js               List page
        ├── admin.js              Admin panel
        ├── auth.js               Login and sign-up
        └── messages.js           Messages page
```

## Still to do

- **Messages backend:** the endpoints listed above.
- **Email verification:** the `verification_code` columns and the mail starter exist, but new accounts are enabled right away (see the TODO in `AuthenticationService`).
- **Tests:** only the default Spring Boot context test exists.
