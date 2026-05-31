# ToDo Demo

A PRD-driven full-stack ToDo application with a React + TypeScript + Vite frontend and a FastAPI backend using JWT authentication and PostgreSQL persistence.

## Features

- Register, sign in, and sign out with JWT-backed authentication.
- Create, view, edit, complete/reopen, and delete tasks.
- Track title, description, status, priority, due date, created/updated timestamps, and completion timestamp.
- Filter by all, active, completed, and overdue.
- Search title and description.
- Sort by creation date, due date, or priority.
- Responsive, keyboard-friendly UI built with Tailwind CSS.

## Local development with Docker

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/docs
- PostgreSQL: localhost:5432

## Manual development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```
