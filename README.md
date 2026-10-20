# SkillBridge AI

AI-Powered Career Guidance and Opportunity Matching Platform for young people in Zimbabwe.

## Technology stack

- **Frontend:** React (Create React App), React Router, Axios, plain CSS
- **Backend:** Node.js, Express (REST API)
- **Database:** MySQL (via `mysql2`) — configured in Stage 3
- **AI:** OpenAI API (backend only) — configured in Stage 8

## Prerequisites

- Node.js v24+ and npm 11+
- Git
- MySQL Server (needed from Stage 3 onwards)

> **Windows note:** if PowerShell says `.ps1 cannot be loaded because running scripts is disabled`,
> use `npm.cmd` / `npx.cmd` instead of `npm` / `npx`, or run:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

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

## Environment variables

Backend secrets live in `backend/.env` (never committed). Copy `backend/.env.example`
to `backend/.env` and fill in real values.

## Project structure

```
skillbridge-ai/
    frontend/     React app (Create React App)
    backend/      Express API
    README.md
    .gitignore
```
