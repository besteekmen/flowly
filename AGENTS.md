<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->


# Project

Flowly is a mini full-stack Kanban application.

Repository structure:

- `frontend/` — React/TanStack frontend
- `backend/` — FastAPI backend
- `_docs/specs.md` — product specification
- `openapi.yaml` — frontend/backend API contract

# Source of Truth

- Treat `_docs/specs.md` as the source of truth for product behavior and scope.
- Treat `openapi.yaml` as the contract between the frontend and backend.
- Do not add features that are explicitly out of scope in the specification.
- If the implementation, specification, and API contract disagree, report the discrepancy instead of silently inventing behavior.

# Frontend Commands

Run frontend commands from `frontend/`.

- `npm install` — install dependencies
- `npm run dev` — start the development server
- `npm run build` — build the frontend

The frontend currently uses a centralized service layer under:

`frontend/src/services/`

Backend-facing UI code should continue to go through this service layer.

# Backend Commands

Use `uv` for Python dependency management.

Run backend commands from `backend/`.

- `uv sync` — install backend dependencies
- `uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000` — start the FastAPI development server
- `uv run pytest` — run backend tests
- `uv add <PACKAGE-NAME>` — add a Python dependency
- `uv run <COMMAND>` — run a command inside the project environment
- `uv run python <PYTHON-FILE>` — run a Python file

API base: `http://127.0.0.1:8000/api`. Interactive API documentation: `http://127.0.0.1:8000/docs`.

# Development Rules

- Keep frontend code inside `frontend/`.
- Keep backend code inside `backend/`.
- Keep backend calls centralized in the frontend service layer.
- Implement backend behavior according to `openapi.yaml`.
- Do not bypass ownership checks for user, board, or task data.
- Do not add a dependency unless it is needed for the current task.
- Make the smallest changes necessary for the current homework step.
- Do not redesign or refactor unrelated frontend code while implementing backend work.
- Run relevant tests, validation, and build checks after changes.
- Keep the repository in a working state.
- Commit regularly.
- Never force push, rebase, amend, or squash commits that have already been pushed to the Lovable-connected branch.
