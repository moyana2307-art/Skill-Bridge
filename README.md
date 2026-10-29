# SkillBridge AI

AI-Powered Career Guidance and Opportunity Matching Platform for young people in Zimbabwe.

## Technology stack

- **Frontend:** React (Create React App), React Router, Fetch API, plain CSS
- **Backend:** Node.js, Express (REST API)
- **Database:** PostgreSQL on Supabase (via the `pg` driver)
- **Authentication:** bcryptjs password hashing, JSON Web Tokens in an
  httpOnly cookie, `cookie-parser`
- **AI:** Local Ollama by default (free, no API credits) with optional OpenAI
  support (backend only)

## Prerequisites

- Node.js v24+ and npm 11+
- Git
- A Supabase PostgreSQL database
- Ollama for free local AI: <https://ollama.com/download>

> **Windows note:** if PowerShell says `.ps1 cannot be loaded because running scripts is disabled`,
> use `npm.cmd` / `npx.cmd` instead of `npm` / `npx`, or run:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## Database setup

The application uses PostgreSQL on Supabase. The schema is in
`backend/sql/schema.sql`, seed data is in `backend/sql/seed.sql`, and
PostgreSQL migrations are in `backend/sql/migrations/`.

### 1. Create the tables and seed data

Copy the contents of `backend/sql/schema.sql` into the Supabase SQL Editor and
run it, then do the same for `backend/sql/seed.sql`. For an existing database,
run the migration files in numeric order if needed.

The `psql` equivalent is:

```powershell
psql "$env:DATABASE_URL" -f backend/sql/schema.sql
psql "$env:DATABASE_URL" -f backend/sql/seed.sql
```

### 2. Configure the connection

Copy `backend/.env.example` to `backend/.env`. Prefer the Supabase transaction
or session pooler connection string:

```text
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

The real `.env` is ignored by Git. Do not put database credentials in frontend
files.

### 3. Verify

Start the backend and open `http://localhost:5000/api/health`. A healthy
response contains `"status": "ok"` and `"database": "connected"`.

## How to run (development)

The easiest way: double-click **`start-skillbridge.cmd`** in the project root.
On first run it installs every dependency, then starts both services and opens
`http://localhost:3000` in your browser automatically once they are ready.

Or run it from a terminal, from the project root:

```bash
npm.cmd run dev
```

Install every dependency once if you have not already:

```bash
npm.cmd run install:all
```

This starts the backend at `http://localhost:5000` and the frontend at
`http://localhost:3000`, then opens the browser when both are reachable. It
checks both services first, so it is safe to run again: services that are
already running are skipped rather than started twice. Press `Ctrl+C` to stop
the services it started.

To start the services without opening a browser, use `npm.cmd run dev -- --no-open`
or set `NO_OPEN=1`.

If you prefer separate terminals, you can still run `npm.cmd run dev` in
`backend` and `npm.cmd start` in `frontend`.

> A web page cannot start local processes by itself for security reasons, so
> opening `http://localhost:3000` in a browser cannot boot the backend. Use the
> launcher or `npm.cmd run dev` instead.

## Run checks

```powershell
cd frontend
npm.cmd test -- --watchAll=false
npm.cmd run build
```

The tests cover the landing page, login and registration flows, profile-picture
upload and removal, protected-route redirects, My Skills, career goals, learning
roadmaps, and the opportunity directory, matching, and saved views. The backend
auth flow is documented under [Test the auth flow](#test-the-auth-flow).

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
  config/        environment variables, PostgreSQL pool, shared constants
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
| `POST` | `/api/profile/avatar` | Upload a profile picture (`avatar` multipart field, protected) |
| `DELETE` | `/api/profile/avatar` | Remove the profile picture (protected) |
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
| `POST` | `/api/opportunities/sync` | Import fresh real listings (admin only) |
| `POST` | `/api/ai/skills-gap` | Generate a skills-gap analysis (protected) |
| `GET` | `/api/ai/skills-gap/latest` | Latest saved skills-gap analysis (protected) |
| `POST` | `/api/ai/roadmaps` | Generate and save a learning roadmap (protected) |
| `POST` | `/api/ai/opportunity-insight` | Explain how an opportunity fits (protected) |
| `POST` | `/api/ai/profile-review` | Review the current profile (protected) |
| `GET` | `/api/ai/profile-review/latest` | Latest saved profile review (protected) |
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

### Profile pictures

- The profile page can add, change, or remove a picture. Uploads are cropped
  square and compressed to a 512×512 JPEG in the browser before being sent.
- The backend accepts JPEG, PNG, or WebP files up to 2 MB, checks the actual
  file signature rather than trusting the filename or browser MIME type, and
  stores the image in PostgreSQL (`user_profiles.avatar_data` / `avatar_mime`). This
  keeps pictures available across backend restarts and redeploys.
- Profile responses and `/api/auth/me` include the current user's picture as a
  data URL so the sidebar and mobile header can show it without another request.
- Removing a picture clears both avatar columns and restores the initials
  fallback.

Packages used by this stage:

- `bcryptjs` — hashes passwords without requiring a native build on Windows.
- `jsonwebtoken` — signs and verifies the login token.
- `cookie-parser` — lets Express read the httpOnly cookie.
- `multer` — reads the in-memory multipart profile-picture upload.

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
and Saved views, filters, match scores, skill chips, save/remove controls, and
an **Apply via source** link that opens the real listing in a new tab.

There are no demo listings. Real opportunities are imported from Remotive and,
when an approved ReliefWeb appname is configured, ReliefWeb.

- The backend syncs shortly after startup and every
  `OPPORTUNITY_SYNC_INTERVAL_HOURS` hours (default 6).
- Records are upserted on `(source_name, external_id)`, so repeated syncs never
  duplicate a listing.
- Listings no longer returned by a source are marked inactive only after a
  successful fetch that returned at least one result.
- Admins can trigger a sync with `POST /api/opportunities/sync`. Promote an
  account first with `npm.cmd run make-admin -- you@example.com`.
- ReliefWeb requires an approved appname from
  <https://apidoc.reliefweb.int/parameters#appname>. Set
  `RELIEFWEB_APP_NAME` in `backend/.env`; when it is empty, ReliefWeb is skipped
  and Remotive still works.

### AI career features

All AI endpoints require login, use the caller's own profile, skills, and goals,
and store their output in `ai_analyses` so it can be shown again:

- **Skills-gap analysis** (`/analysis`): a 0-100 readiness score, strengths, gaps
  with priorities, next steps, and project ideas.
- **AI roadmap generation** (Roadmaps page): drafts a 4-52 week plan and saves
  the roadmap and all tasks in one transaction. Every generated task remains
  editable.
- **Opportunity insight** (Opportunities page): a fit level, strengths, gaps,
  application tips, and questions to prepare for a specific listing.
- **Profile review** (Profile page): a completeness score, strengths,
  improvements, and suggested headline/about wording.

The default provider is **local Ollama**, which is free and does not use API
credits. Install Ollama, start it, and download the default model once:

```powershell
ollama pull llama3.2:3b
```

The backend expects Ollama at `http://127.0.0.1:11434`. To use a different model
or machine, change `OLLAMA_MODEL` or `OLLAMA_BASE_URL` in `backend/.env`. The
first request after a model loads can take longer; increase
`OLLAMA_TIMEOUT_MS` if needed. If Ollama is not running or the model is missing,
these endpoints return a clear configuration error instead of crashing the
server.

To use OpenAI instead, set `AI_PROVIDER=openai` and provide
`OPENAI_API_KEY`. AI output is educational guidance and can be wrong; it never
guarantees a job, scholarship, or admission.

### Test the auth flow

1. `POST /api/auth/register` with `{ "name": "Test User", "email": "test@example.com", "password": "TestPass123!" }`.
2. `GET /api/auth/me` should return the same user (Thunder Client keeps the cookie).
3. `GET /api/profile` should return an empty profile.
4. `PATCH /api/profile` with education, location, and interests; then reload the request.
5. `POST /api/auth/logout`, then `GET /api/profile` should return `401`.
6. `GET /api/profile` without logging in should also return `401`.
7. A normal user calling `POST /api/skills` should receive `403`.

### Test profile pictures

1. In the browser, log in and open `/profile`.
2. Choose a JPEG, PNG, or WebP image under 10 MB with **Add picture**. The
   browser crops and compresses it, then the image should appear in the preview,
   sidebar, and mobile header.
3. Reload the page; the picture should still be there.
4. Use **Remove** and confirm the initials fallback returns.
5. `POST /api/profile/avatar` with a multipart field named `avatar` should reject
   text files and files over 2 MB with `400 BAD_REQUEST`.

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

1. Start the backend (or run an admin sync). `GET /api/opportunities` should
   return real records with a `source_name` such as `Remotive`. If it is empty,
   check the sync log and your network connection.
2. Log in, add HTML, CSS, JavaScript, React, and Git to the profile, then call
   `GET /api/opportunities/matches`. Listings that mention those skills should
   have a non-null `match_score`.
3. `POST /api/opportunities/:id/save` should return `201` the first time and
   `200` when repeated. `GET /api/opportunities/saved` should contain it.
4. `DELETE /api/opportunities/:id/save` removes it; repeating the delete returns
   `404`.
5. Use **Apply via source** on a card and confirm the real external page opens.
   No application is submitted by SkillBridge AI.
6. In the browser, open `/opportunities` while logged out and use the public
   filters. After logging in, check For you, save an opportunity, open Saved,
   remove it, and confirm the card disappears.
7. Click **Why this fits** on a card (requires Ollama and the configured model)
   and confirm the AI insight dialog appears.

## Environment variables

Backend secrets live in `backend/.env` (never committed). Copy `backend/.env.example`
to `backend/.env` and fill in real values, including a long random `JWT_SECRET`:

```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

`CLIENT_URL` must match the browser origin that calls the API, because it is
used for CORS and credentialed requests. Separate multiple allowed origins with
commas. In production, serve the API over HTTPS so the `Secure` login cookie is
accepted.

AI and live-sync settings:

| Variable | Purpose |
| --- | --- |
| `AI_PROVIDER` | `ollama` (free local default) or `openai` |
| `OLLAMA_BASE_URL` | Ollama API URL, default `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Local model name, default `llama3.2:3b` |
| `OLLAMA_TIMEOUT_MS` | Local model timeout, default `120000` |
| `OLLAMA_NUM_CTX` | Context window size, default `4096` |
| `OPENAI_API_KEY` | Only required when `AI_PROVIDER=openai` |
| `OPENAI_MODEL` | OpenAI model name, default `gpt-4o-mini` |
| `OPENAI_TIMEOUT_MS` | OpenAI request timeout, default `45000` |
| `OPPORTUNITY_SYNC_ENABLED` | Start the background sync, default `true` |
| `OPPORTUNITY_SYNC_INTERVAL_HOURS` | Refresh interval, default `6` |
| `RELIEFWEB_APP_NAME` | Approved ReliefWeb appname; empty skips ReliefWeb |

The frontend reads `REACT_APP_API_URL` and defaults to
`http://localhost:5000/api`. To point it at another API, create
`frontend/.env` (ignored by Git) with:

```text
REACT_APP_API_URL=https://your-api.example.com/api
```

Create React App reads this value at build time, so rebuild after changing it.

## Deployment (Vercel + Supabase PostgreSQL)

The root `vercel.json` deploys the frontend and Express API as two services
behind one Vercel domain:

- **Frontend:** `/`
- **API:** `/api/*`
- **Database:** Supabase PostgreSQL

### 1. Create the Supabase database

Run the PostgreSQL schema in the Supabase SQL Editor:

```sql
-- Open backend/sql/schema.sql and execute it in the Supabase SQL Editor.
-- Then open backend/sql/seed.sql and execute it.
```

A `psql` alternative is:

```powershell
psql "$env:DATABASE_URL" -f backend/sql/schema.sql
psql "$env:DATABASE_URL" -f backend/sql/seed.sql
```

### 2. Configure Vercel

In Project Settings → Environment Variables, add production values for:

- `DATABASE_URL`: Supabase transaction/session pooler connection string
- `DB_SSL=true`
- `DB_SSL_REJECT_UNAUTHORIZED=true`
- `JWT_SECRET`: a new long random value
- `JWT_EXPIRES_IN=7d`
- `CLIENT_URL=https://your-project.vercel.app`
- `NODE_ENV=production`
- `AI_PROVIDER=openai`
- `OPENAI_API_KEY`: your secret OpenAI API key

Do not add real secrets to frontend environment files or source code.

### 3. Deploy

Import this repository without changing the root directory. The root
configuration builds the Create React App frontend and the Express API, then
routes `/api/*` to the API service.

After deployment, verify:

```text
https://your-project.vercel.app/api/health
```

The response should contain `"database":"connected"` and HTTP 200.

### Production checklist

- Use the Supabase pooler connection string for serverless Vercel functions.
- Use HTTPS and a final Vercel domain in `CLIENT_URL`.
- Use a long random production `JWT_SECRET`.
- Keep `DB_SSL=true` for managed PostgreSQL.
- Confirm OpenAI credentials and billing before using AI pages.

## Project structure

```
skillbridge-ai/
    frontend/     React app (Create React App)
    backend/      Express API
    scripts/      dev launcher and make-admin helper
    render.yaml   Render backend blueprint
    README.md
    .gitignore
```
