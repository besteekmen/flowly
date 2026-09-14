# Flowly frontend

The UI calls the FastAPI backend through `src/services/`.
Flowly v1 uses a light-only palette, independent of the device color scheme.
Start the backend in a separate terminal:

```sh
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

From `frontend/`:

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

The API base URL is defined only in `src/services/http.ts`. It defaults to
`http://127.0.0.1:8000/api`. To override it, copy `.env.example` to `.env.local`,
set `VITE_API_BASE_URL` (including `/api`), and restart Vite. This is a public
build-time setting, not a place for secrets. For a remote deployment, use a
reachable HTTPS backend URL rather than the local default.

The backend permits localhost/127.0.0.1 origins on ports 5173, 8080, and 4173.
For another frontend origin, set the backend's comma-separated
`FLOWLY_CORS_ORIGINS` environment variable and restart it.

## Sessions and data

- Signup/login receive an opaque bearer token from the backend. Only this token
  is stored at `localStorage['flowly:access-token']`; passwords and API records
  are not saved in browser storage. Local storage is used for this homework's
  refresh/session restoration and is accessible to scripts on the same origin.
- Requests send `Authorization: Bearer <token>`. No cookies are used. Session
  restoration calls `/auth/session`; authenticated 401 responses clear the token
  and sign out. Invalid login credentials do not clear an existing session.
- Logout clears local credentials even if the server cannot be reached. In that
  case server-side revocation could not be confirmed; its token expires normally.
- Changing accounts clears the query cache; board queries are also keyed by user.
  Cross-tab token changes refresh auth state. API failures are surfaced in the UI.
- Users, boards, tasks, sessions, and password-reset tokens are persisted in SQLite.
  The default database file is `backend/data/flowly.sqlite3`. Data survives backend
  restarts; sessions and reset tokens retain their expiry and revocation rules.
  Rate-limit counters and the development email outbox remain in memory and clear
  on restart. See the [backend README](../backend/README.md) for database details.
- Filters, temporary sorting, board summaries and per-device view preferences stay
  client-side. Preference storage uses the existing `flowly:view-preferences` key.

## Remaining development mocks

Google login sends `flowly-dev-google` to the backend's fixed Google stub. It is
not real OAuth. Forgot-password requests call the backend; reset tokens are logged
there rather than emailed. There is still no reset-completion page in the UI.
The existing reset page's email-delivery copy describes the eventual product.

`src/services/mock-store.ts` is retained but has no active importers. Existing
`flowly:db` and `flowly:session` mock data is ignored, not deleted or migrated;
create an account in the backend to use this integration. The old store is safe
for a later, separate cleanup after review.

## Checks

```sh
npx tsc --noEmit
npm run build
npm run lint
```
