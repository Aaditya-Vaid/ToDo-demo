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

Open the app from the computer running Docker:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/docs
- PostgreSQL: localhost:5432

### About Vite's Docker network URL

When the frontend starts in Docker, Vite may print a URL like `http://172.18.0.4:5173/`. That address is the container's private Docker-network IP, not the URL you should open in your laptop browser. Use `http://localhost:5173` on the Docker host instead.

If you want to open the app from another device on your LAN, set `APP_HOST` in `.env` to the Docker host computer's LAN IP before starting Docker Compose:

```bash
cp .env.example .env
# edit .env and change APP_HOST to your computer's LAN IP, for example:
# APP_HOST=192.168.1.25
docker compose up --build
```

Then open `http://192.168.1.25:5173` from the other device. `APP_HOST` also makes the frontend call `http://192.168.1.25:8000` for the API and adds that frontend origin to the backend CORS allowlist.

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
