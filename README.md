# SkillBridge AI

AI-Powered Career Guidance and Opportunity Matching Platform for young people in Zimbabwe.

## Technology stack

- **Frontend:** React (Create React App), React Router, Fetch API, plain CSS
- **Backend:** Node.js, Express (REST API)
- **Database:** MySQL (via `mysql2`) — configured in Stage 3
- **Authentication:** bcryptjs password hashing, JSON Web Tokens in an
  httpOnly cookie, `cookie-parser`
- **AI:** OpenAI API (backend only) — configured in Stage 8

## Prerequisites

- Node.js v24+ and npm 11+
- Git
- MySQL Server 8.4 (installed locally as the Windows service `MySQL84`)

> **Windows note:** if PowerShell says `.ps1 cannot be loaded because running scripts is disabled`,
> use `npm.cmd` / `npx.cmd` instead of `npm` / `npx`, or run:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## Database setup

The database is `skillbridge_ai` (MySQL 8.4, `utf8mb4`). It has 10 InnoDB tables,
a seeded skills catalogue, and demo opportunities. `schema.sql` and `seed.sql`
are safe to run again: they use `CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`,
and existence checks for demo records.

### 1. Create the database and tables

Run these as MySQL root. In **PowerShell**, use `Get-Content | mysql` because
PowerShell does not support the `<` input redirection operator:

```powershell
$mysql = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
Get-Content backend\sql\schema.sql | & $mysql -u root -p
Get-Content backend\sql\seed.sql   | & $mysql -u root -p
```

Or from **cmd.exe**:

```bat
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p < backend\sql\schema.sql
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p < backend\sql\seed.sql
```

### 2. Create the limited application user

The API must not connect as root. Create a user that can only read and write
rows in this database (no `CREATE`, `DROP`, or access to other databases).
Choose your own strong password, put the same value in `backend/.env`, and never
commit it:

```sql
CREATE USER 'skillbridge_app'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON skillbridge_ai.* TO 'skillbridge_app'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configure the connection

Copy `backend/.env.example` to `backend/.env`, then set `DB_USER`,
`DB_PASSWORD`, and `DB_NAME`. The real `.env` is ignored by Git.

### 4. Verify

Start the backend and open `http://localhost:5000/api/health`. A healthy
response contains `"status": "ok"` and `"database": "connected"`.

Service commands (run in an **administrator** terminal if needed):

```powershell
Get-Service MySQL84
net start MySQL84
net stop MySQL84
```

## How to run (development)

Open two terminals from the project root.

**Terminal 1 - backend:**

```bash
cd backend
npm.cmd run dev
```

The API starts at `http://localhost:5000`. Test it: `http://localhost:5000/api/health`

**Terminal 2 - frontend:**

```bash
cd frontend
npm.cmd start
```

React opens at `http://localhost:3000`.

## Run checks

```powershell
cd frontend
npm.cmd test -- --watchAll=false
npm.cmd run build
```

The tests cover the landing page, the login page, protected-route redirects,
My Skills, career goals, learning roadmaps, and the opportunity directory,
matching, and saved views. The backend auth flow is documented under
[Test the auth flow](#test-the-auth-flow).

## API foundation

The backend is split into small layers so each file has one job:

```text
backend/
  routes/        URL and HTTP method -> controller
  controllers/   read the request, call a service, send the response
  services/      SQL and business logic
  validators/    Zod schemas for params, query strings, and JSON bodies
  middleware/    validation, async errors, 404s, logging, error handling
  utils/         ApiError and shared response helpers
  config/        environment variables, MySQL pool, shared constants
```

Every successful response uses the same shape:

```json
{ "success": true, "data": {}, "meta": {} }
```

Every error response uses the same shape:

```json
{
  "success": false,
  "error": { "message": "Validation failed", "code": "VALIDATION_ERROR", "details": [] }
}
```

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Server and database health |
| `GET` | `/api/meta` | Dropdown values and skill categories |
| `POST` | `/api/auth/register` | Create an account and log in |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Clear the login cookie |
| `GET` | `/api/auth/me` | Current user (protected) |
| `GET` | `/api/profile` | Current user's profile (protected) |
| `PATCH` | `/api/profile` | Update the current user's profile (protected) |
| `GET` | `/api/profile/skills` | List the current user's skills (protected) |
| `POST` | `/api/profile/skills` | Add a catalogue skill to the profile (protected) |
| `PATCH` | `/api/profile/skills/:skillId` | Update the proficiency level (protected) |
| `DELETE` | `/api/profile/skills/:skillId` | Remove a skill from the profile (protected) |
| `GET` | `/api/skills` | List skills (`search`, `category`, `page`, `limit`) |
| `GET` | `/api/skills/:id` | One skill |
| `POST` | `/api/skills` | Create a skill (admin only) |
| `PATCH` | `/api/skills/:id` | Update a skill (admin only) |
| `DELETE` | `/api/skills/:id` | Delete a skill (admin only) |
| `GET` | `/api/career-goals` | List the current user's career goals (protected) |
| `POST` | `/api/career-goals` | Create a career goal (protected) |
| `GET` | `/api/career-goals/:id` | One career goal (protected) |
| `PATCH` | `/api/career-goals/:id` | Update a career goal (protected) |
| `DELETE` | `/api/career-goals/:id` | Delete a career goal (protected) |
| `GET` | `/api/roadmaps` | List the current user's roadmaps (protected) |
| `POST` | `/api/roadmaps` | Create a roadmap (protected) |
| `GET` | `/api/roadmaps/:id` | One roadmap with tasks (protected) |
| `PATCH` | `/api/roadmaps/:id` | Update a roadmap (protected) |
| `DELETE` | `/api/roadmaps/:id` | Delete a roadmap and its tasks (protected) |
| `POST` | `/api/roadmaps/:roadmapId/tasks` | Add a roadmap task (protected) |
| `PATCH` | `/api/roadmaps/:roadmapId/tasks/:taskId` | Update a task (protected) |
| `DELETE` | `/api/roadmaps/:roadmapId/tasks/:taskId` | Delete a task (protected) |
| `GET` | `/api/opportunities` | List opportunities with filters and sorting |
| `GET` | `/api/opportunities/matches` | Skill-based matches for the current user (protected) |
| `GET` | `/api/opportunities/saved` | The current user's saved opportunities (protected) |
| `POST` | `/api/opportunities/:id/save` | Save an opportunity (protected) |
| `DELETE` | `/api/opportunities/:id/save` | Remove a saved opportunity (protected) |
| `GET` | `/api/opportunities/:id` | One opportunity |
| `POST` | `/api/opportunities` | Create an opportunity (admin only) |
| `PATCH` | `/api/opportunities/:id` | Update an opportunity (admin only) |
| `DELETE` | `/api/opportunities/:id` | Delete an opportunity (admin only) |
| `GET` | `/api/test` | Development-only connectivity check |
| `POST` | `/api/test/echo` | Development-only validation check |

The `/api/test` endpoints are hidden when `NODE_ENV=production`.

### Testing with Thunder Client

1. Start the backend with `npm.cmd run dev`.
2. Create a new request and set the method and URL.
3. For `POST` requests, open the **Body** tab, choose **JSON**, and paste the body.

Useful checks:

| Request | Expected result |
| --- | --- |
| `GET http://localhost:5000/api/health` | `200`, database `connected` |
| `GET http://localhost:5000/api/test` | `200`, message `pong` |
| `POST http://localhost:5000/api/test/echo` with `{ "message": "hello" }` | `200`, body echoed back |
| `POST http://localhost:5000/api/test/echo` with `{}` | `400`, `VALIDATION_ERROR` |
| `GET http://localhost:5000/api/skills?search=react` | `200`, one matching skill |
| `GET http://localhost:5000/api/skills/999999` | `404`, `NOT_FOUND` |
| `GET http://localhost:5000/api/profile/skills` without login | `401`, `UNAUTHORIZED` |
| `GET http://localhost:5000/api/career-goals` without login | `401`, `UNAUTHORIZED` |
| `GET http://localhost:5000/api/opportunities/matches` without login | `401`, `UNAUTHORIZED` |
| `GET http://localhost:5000/api/opportunities?is_remote=true&sort=deadline&order=asc` | `200` |
| `GET http://localhost:5000/api/not-a-route` | `404`, `NOT_FOUND` |

Validation rejects unknown fields, invalid ids, bad pagination, impossible
calendar dates (for example `2026-02-31`), and URLs that are not `http` or
`https`.

## Authentication, profiles, and skills

- `POST /api/auth/register` hashes the password with bcrypt (12 rounds) and
  creates the user plus an empty profile in one transaction.
- `POST /api/auth/login` compares the password with the stored hash. Correct
  credentials receive a signed JWT in the httpOnly cookie
  `skillbridge_token`. Browser JavaScript cannot read that cookie.
- `GET /api/auth/me` restores the session after a page reload.
- `POST /api/auth/logout` clears the cookie.
- Protected routes return `401` without a valid cookie. Admin-only writes
  return `403` for normal users.
- Profile queries always use the user id from the token, never an id from the
  URL, so one user cannot read or edit another user's profile.
- The React pages `/login`, `/register`, `/profile`, `/skills`, `/goals`, and
  `/roadmaps` are connected to these endpoints. Everything except the auth
  pages, home, about, and opportunities is wrapped in `ProtectedRoute`.

Packages used by this stage:

- `bcryptjs` — hashes passwords without requiring a native build on Windows.
- `jsonwebtoken` — signs and verifies the login token.
- `cookie-parser` — lets Express read the httpOnly cookie.

The JWT is stateless. Logging out clears the cookie in the browser, but a copy
of the token would remain valid until it expires. Keep `JWT_EXPIRES_IN` short
for production, or add server-side session revocation later.

### Skills management

Users build their skill list from the existing, admin-managed catalogue. They
cannot create shared catalogue entries. Each user skill has a proficiency level:
`beginner`, `intermediate`, or `advanced`.

- `POST /api/profile/skills` takes `{ "skill_id": 1, "proficiency": "intermediate" }`.
  If `proficiency` is omitted it defaults to `beginner`.
- Adding an unknown `skill_id` returns `404`; adding the same skill twice returns
  `409` because `(user_id, skill_id)` is unique.
- `PATCH /api/profile/skills/:skillId` changes the level. Updating a skill that
  is not on the profile returns `404`.
- `DELETE /api/profile/skills/:skillId` removes the skill from the profile.
- Requests cannot choose a `user_id`; the backend always uses the user id from
  the token.
- The `/skills` page shows totals by level, a searchable/filterable catalogue,
  pagination, and controls to add, update, or remove skills.

### Career goals and learning roadmaps

Career goals describe the roles a user is working towards. A goal has a title
(2–150 characters) and one of three statuses: `active`, `completed`, or
`archived`. A user can keep only one goal active; creating or activating an
active goal archives the previous active goal for that user. Deleting a goal
does not delete its roadmaps — their `career_goal_id` becomes `NULL` instead.

Learning roadmaps belong to the logged-in user and can be linked to one of that
user's goals. Tasks use the statuses `not_started`, `in_progress`, and
`completed`. The API calculates `progress_percent` from the number of completed
tasks, and every task status change is recorded in `user_progress`. Users cannot
link a roadmap to somebody else's goal: an unknown or foreign goal id returns
`404`.

The frontend adds `/goals` and `/roadmaps`, both protected. The roadmaps page
supports creating and editing a roadmap, filtering by goal, changing the roadmap
status, adding tasks, updating task progress, and deleting tasks or roadmaps.

### Opportunity matching and saved opportunities

The opportunity directory is public. Matching and saved opportunities require
login:

- `GET /api/opportunities/matches` scores active opportunities against the
  skills on the user's profile.
- `required_skills` is free text split on commas, semicolons, pipes, or new
  lines. Skill names are compared after normalising case and punctuation, so
  `React.js` and `react.js` count as the same skill.
- `match_score` is the percentage of listed skills the user has. It is `null`
  when an opportunity lists no required skills.
- Matching reads up to the first 100 active opportunities that match the current
  filters, sorts them by score and then deadline, and paginates the result.
- `POST /api/opportunities/:id/save` is idempotent: the first save returns `201`
  and a duplicate save returns `200`. Removing an opportunity that is not saved
  returns `404`.
- Saved opportunities are private to the logged-in user.

The frontend `/opportunities` page has a public Browse view, protected For you
and Saved views, filters, match scores, skill chips, and save/remove controls.
Demo records show a **Demo** badge and an **Apply via source** link that opens the
listing or learning page in a new tab.

The seed file creates 14 clearly labelled demo opportunities: six jobs and two
each of internships, training, courses, and scholarships. Their apply links point
to live LinkedIn search, LinkedIn Learning, freeCodeCamp, Google Digital Garage,
or Scholarships.com pages so the external apply/enrol action can be exercised.
No real applications are submitted by SkillBridge AI. There is no admin
opportunity screen yet; further records are added through the admin API.

### Test the auth flow

1. `POST /api/auth/register` with `{ "name": "Test User", "email": "test@example.com", "password": "TestPass123!" }`.
2. `GET /api/auth/me` should return the same user (Thunder Client keeps the cookie).
3. `GET /api/profile` should return an empty profile.
4. `PATCH /api/profile` with education, location, and interests; then reload the request.
5. `POST /api/auth/logout`, then `GET /api/profile` should return `401`.
6. `GET /api/profile` without logging in should also return `401`.
7. A normal user calling `POST /api/skills` should receive `403`.

### Test skills management

1. Log in, then `GET /api/profile/skills` should return an empty `skills` array.
2. Choose an id from `GET /api/skills`, then `POST /api/profile/skills` with
   `{ "skill_id": 1, "proficiency": "beginner" }`.
3. `GET /api/profile/skills` should include the catalogue name and category.
4. Repeat the same `POST` and expect `409 CONFLICT`.
5. `PATCH /api/profile/skills/1` with `{ "proficiency": "advanced" }`.
6. `DELETE /api/profile/skills/1`, then confirm it is no longer listed.
7. In the browser, open `/skills`: search and filter the catalogue, add a skill,
   change its level, and remove it. Logging out and visiting `/skills` directly
   should redirect to `/login`.

### Test career goals and roadmaps

1. Log in, then `POST /api/career-goals` with
   `{ "career_title": "Frontend Developer", "status": "active" }`.
2. Create a second active goal. The first goal should now have status `archived`.
3. `POST /api/roadmaps` with
   `{ "title": "Frontend path", "career_goal_id": 1 }`.
4. `POST /api/roadmaps/1/tasks` with
   `{ "title": "Learn React", "skills_to_develop": "React" }`.
5. `PATCH /api/roadmaps/1/tasks/1` with `{ "status": "in_progress" }`, then
   `{ "status": "completed" }`. Both changes should appear in `user_progress`.
6. `GET /api/roadmaps` should show `completed_task_count` and
   `progress_percent` for the roadmap.
7. Delete the career goal. `GET /api/roadmaps` should still return the roadmap
   with `career_goal_id: null`.
8. In the browser, open `/goals` and `/roadmaps`; create a goal and roadmap,
   add three tasks, update their statuses, and confirm the progress bar changes.
   Logging out and visiting either page directly should redirect to `/login`.

### Test opportunity matching and saving

1. Run `backend/sql/seed.sql`. `GET /api/opportunities` should return 14 demo
   records: six jobs, two internships, two training programmes, two courses, and
   two scholarships.
2. Log in, add HTML, CSS, JavaScript, React, and Git to the profile, then call
   `GET /api/opportunities/matches`. The Junior Frontend Developer demo job
   should have `match_score: 100`.
3. `POST /api/opportunities/:id/save` should return `201` the first time and
   `200` when repeated. `GET /api/opportunities/saved` should contain it.
4. `DELETE /api/opportunities/:id/save` removes it; repeating the delete returns
   `404`.
5. Use **Apply via source** on a demo card and confirm the external page opens.
   No application is submitted by SkillBridge AI.
6. In the browser, open `/opportunities` while logged out and use the public
   filters. After logging in, check For you, save an opportunity, open Saved,
   remove it, and confirm the card disappears.

## Environment variables

Backend secrets live in `backend/.env` (never committed). Copy `backend/.env.example`
to `backend/.env` and fill in real values, including a long random `JWT_SECRET`:

```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

`CLIENT_URL` must match the browser origin that calls the API, because it is
used for CORS and credentialed requests. In production, serve the API over
HTTPS so the `Secure` login cookie is accepted.

The frontend reads `REACT_APP_API_URL` and defaults to
`http://localhost:5000/api`. To point it at another API, create
`frontend/.env` (ignored by Git) with:

```text
REACT_APP_API_URL=https://your-api.example.com/api
```

Create React App reads this value at build time, so rebuild after changing it.

## Project structure

```
skillbridge-ai/
    frontend/     React app (Create React App)
    backend/      Express API
    README.md
    .gitignore
```
