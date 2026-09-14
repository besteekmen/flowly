# Flowly backend

FastAPI implementation of the repository's `openapi.yaml`, using Python 3.12+
and `uv`. Run these commands from `backend/`:

```sh
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API base: `http://127.0.0.1:8000/api`. Interactive documentation: `/docs`.
The server serves the root contract at `/openapi.json`; keep the repository
layout intact. The frontend service layer now calls this API.

Local CORS permits `http://localhost` and `http://127.0.0.1` on ports 5173, 8080,
and 4173, with GET/POST/PATCH/DELETE and Authorization/Content-Type headers.
Set `FLOWLY_CORS_ORIGINS` to a comma-separated list to replace these defaults.
Browser requests use bearer headers, not cookies.

Run tests:

```sh
uv run pytest
```

`uv.lock` pins dependencies. The default `uv sync` includes test dependencies.

## Development authentication

Email/password signup and login work. Passwords use salted scrypt hashes.
Send `Authorization: Bearer <accessToken>` to authenticated endpoints. Tokens
expire after one hour; logout revokes the presented token. Password changes
retain the current session and revoke other sessions; password reset and account
deletion revoke all sessions. No refresh tokens are implemented.

Google sign-in is an intentionally fixed homework stub:

```sh
curl http://127.0.0.1:8000/api/auth/google \
  -H 'Content-Type: application/json' \
  -d '{"idToken":"flowly-dev-google"}'
```

This signs in a demo Google account (`google@example.com`). Other credentials
return 401. If that email already belongs to a password account, the stub returns
409 rather than linking accounts. This does **not** validate actual Google ID
tokens, signatures, issuer, audience, expiry, or Google subject as the eventual
contract requires. It must be replaced before production use.

Password-reset requests return an empty 202 for existing, nonexistent, and
Google-only accounts. For a password account, the development server logs a
`DEVELOPMENT password reset ... token=...` message instead of sending email.
Use that token in `POST /api/auth/password-reset/confirm` with
`{"token":"<logged-token>","newPassword":"new-password"}`. Tokens expire after
15 minutes and are single-use. A new request supersedes the prior token; successful
password changes also invalidate pending resets. The in-memory outbox used by
tests is not exposed through an HTTP endpoint. Reset tokens in logs are strictly
for this local homework backend.

## Behavior and limitations

- All users, boards, tasks, bearer tokens, reset tokens and rate-limit counters are
  in memory. Restarting or reloading the process loses everything. Use one worker.
  No SQLite, files, or persistent database store application data.
- Each user has one private board. Every task mutation checks ownership and returns
  404 for missing or unowned tasks. Account deletion removes all owned boards/tasks.
- Saved positions are contiguous within each column. Moves, status edits, and
  deletions renumber affected columns and update changed tasks' timestamps.
  Mutations execute without `await` in async handlers, atomically on one event loop.
  Password hashing also runs on that loop; this is a simple homework server, not
  a high-throughput deployment architecture.
- Authentication operations have a basic in-memory limit of 30 requests per minute
  per client IP and endpoint; limits return 429 with `Retry-After`. Thresholds and
  token lifetimes are implementation choices not prescribed by the contract.
- Validation errors return the contract's 400 `{code, message}` shape, not 422.
  Dates accept only valid `YYYY-MM-DD` strings. Unexpected fields are rejected.
- Avatar URL/email validation uses Pydantic's URI/email validators. This can be
  stricter than a bare OpenAPI `uri`/`email` annotation for unusual inputs.
- The root contract's introduction still says no backend is implemented. That
  sentence is now stale; the contract was deliberately left unchanged.
- Filters, summaries, temporary sorting, and device preferences stay in the frontend.
  The frontend now uses HTTP services; its old mock store is retained but unused.

The tests exercise all 17 operations, validate exercised response bodies/statuses
against the root contract, and test ownership, authentication lifecycle, malformed
inputs, ordering after mixed mutations, and account deletion.
