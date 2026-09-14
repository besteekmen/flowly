# Flowly

> Keep your work in flow.

Flowly is a full-stack personal Kanban application for organizing tasks across **To Do**, **In Progress**, and **Done**. It combines a responsive React interface with a FastAPI backend and persistent SQLite storage to keep everyday task management simple and focused.

## Key features

- Email/password signup and login, plus a development Google sign-in stub.
- A private board for each user, with an editable board name and profile.
- Task creation, editing, and deletion, with priorities and due dates.
- Desktop drag-and-drop movement and reordering, plus explicit move controls on mobile.
- Priority and due-date filters, temporary sorting that preserves manual order, and overdue highlighting.
- A responsive interface that follows the system's light or dark theme.
- Persistent accounts, boards, tasks, and sessions that survive backend restarts.

## Screenshots

*Placeholder: add screenshots of the desktop board and mobile task controls here.*

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, TanStack Start / Router, TanStack Query, Vite, Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI, SQLite, uv, pytest |
| API contract | OpenAPI |

## Architecture

```text
frontend/        React UI and centralized API services
backend/         FastAPI application, SQLite storage, and tests
_docs/specs.md   Product specification
openapi.yaml     Frontend/backend API contract
```

The frontend communicates with FastAPI through the centralized service layer in `frontend/src/services/`. The backend enforces ownership and persists data through a separate SQLite database layer. Filtering and temporary sorting stay in the browser; saved task order lives in the database.

## Getting started

Prerequisites: Node.js with npm, Python 3.12+, and uv. Open two terminals, each starting at the repository root.

**Terminal 1 — backend**

```sh
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — frontend**

```sh
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. The frontend defaults to `http://127.0.0.1:8000/api`; see the [frontend README](frontend/README.md) for API configuration. Interactive API documentation is available at `http://127.0.0.1:8000/docs` while the backend is running.

## Testing

Run the backend suite from the repository root:

```sh
cd backend
uv run pytest
```

Tests cover API contract responses, authentication, ownership, task ordering, transaction rollback, and persistence across new application instances.

For frontend type and build checks, start from the repository root:

```sh
cd frontend
npx tsc --noEmit
npm run build
```

## Documentation

- [`_docs/specs.md`](_docs/specs.md) — product specification
- [`openapi.yaml`](openapi.yaml) — API contract
- [`frontend/README.md`](frontend/README.md) — frontend setup and implementation notes
- [`backend/README.md`](backend/README.md) — backend, database, auth, and API details

## Current limitations

- Google authentication is a development stub, not production OAuth.
- Password-reset email delivery is mocked: reset tokens are logged locally.
- Collaboration and team features are outside the scope of v1.

## Project context

Flowly was developed as a full-stack project while following the DataTalksClub AI Dev Tools Zoomcamp.

## Lovable

The project is connected to the [Lovable editor](https://lovable.dev/projects/f0d7cabb-3649-46f3-8e8e-2f2056adae92). Changes pushed to the connected branch sync back to Lovable; avoid rewriting published Git history. See [AGENTS.md](AGENTS.md) for development guidelines.
