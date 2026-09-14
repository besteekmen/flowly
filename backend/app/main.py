"""FastAPI implementation of the repository's OpenAPI contract."""

import logging
import os
import math
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

import yaml
from fastapi import Depends, FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import models as m
from .store import RATE_WINDOW, RESET_TTL, Store, password_matches, hash_password, timestamp, uid

logger = logging.getLogger("flowly")
CONTRACT = Path(__file__).resolve().parents[2] / "openapi.yaml"
GOOGLE_STUB_TOKEN = "flowly-dev-google"
GOOGLE_STUB_EMAIL = "google@example.com"
bearer = HTTPBearer(auto_error=False)


class ApiError(Exception):
    def __init__(self, status, code, message, headers=None):
        self.status, self.code, self.message = status, code, message
        self.headers = headers or {}


async def get_store(request: Request) -> Store:
    store = request.app.state.store
    async with store.lock:
        with store.database.transaction():
            yield store


Storage = Annotated[Store, Depends(get_store, scope="function")]


async def authenticate(
    store: Storage,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
):
    token = credentials.credentials if credentials else ""
    session = store.sessions.get(token)
    if not session or session[1] <= store.clock() or session[0] not in store.users:
        store.sessions.pop(token, None)
        raise ApiError(401, "unauthorized", "Sign in to continue.", {"WWW-Authenticate": "Bearer"})
    return store.users[session[0]], token


Auth = Annotated[tuple, Depends(authenticate)]


async def rate_limit(request: Request, store: Storage):
    # Small per-IP/per-operation limiter for the documented authentication 429s.
    now = store.clock()
    key = (request.client.host if request.client else "unknown", request.url.path)
    hits = store.rate_hits[key]
    while hits and hits[0] <= now - RATE_WINDOW:
        hits.popleft()
    if len(hits) >= store.rate_limit:
        wait = max(1, math.ceil(hits[0] + RATE_WINDOW - now))
        raise ApiError(429, "rate_limited", "Try again shortly.", {"Retry-After": str(wait)})
    hits.append(now)


def owned_task(store, user, task_id):
    board = store.board_for(user["id"])
    task = store.tasks.get(task_id)
    if task is None or task["boardId"] != board["id"]:
        raise ApiError(404, "not_found", "Task not found.")
    return task


def create_app(database_path=None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app):
        try:
            yield
        finally:
            app.state.store.database.close()

    app = FastAPI(title="Flowly v1 API", version="1.0.0", lifespan=lifespan)
    origins = os.environ.get(
        "FLOWLY_CORS_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173,"
        "http://127.0.0.1:8080,http://localhost:8080,"
        "http://127.0.0.1:4173,http://localhost:4173",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in origins.split(",") if origin.strip()],
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.state.store = Store(database_path)
    # Serve the reviewed contract in Swagger instead of silently generating a
    # different schema (notably FastAPI's default 422 validation errors).
    contract = yaml.safe_load(CONTRACT.read_text())
    app.openapi = lambda: contract

    @app.exception_handler(ApiError)
    async def api_error(_request, exc):
        return JSONResponse({"code": exc.code, "message": exc.message},
                            status_code=exc.status, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request, _exc):
        # Never echo password/token input from Pydantic's validation details.
        return JSONResponse({"code": "validation_error", "message": "Invalid request body or fields."},
                            status_code=400)

    @app.exception_handler(Exception)
    async def internal_error(_request, _exc):
        logger.error("Unexpected API failure", exc_info=True)
        return JSONResponse({"code": "internal_error", "message": "Unexpected server failure."},
                            status_code=500)

    limited = [Depends(rate_limit)]

    @app.post("/api/auth/signup", status_code=201, dependencies=limited)
    async def sign_up(body: m.SignUp, store: Storage):
        email = str(body.email).lower()
        if store.user_by_email(email):
            raise ApiError(409, "email_in_use", "An account with this email already exists.")
        name = body.name.strip() or email.split("@")[0]
        return store.issue_session(store.create_user(name, email, "password", body.password))

    @app.post("/api/auth/login", dependencies=limited)
    async def sign_in(body: m.SignIn, store: Storage):
        user = store.user_by_email(str(body.email).lower())
        if not user or not password_matches(body.password, store.passwords.get(user["id"])):
            raise ApiError(401, "invalid_credentials", "Invalid credentials.")
        store.board_for(user["id"])
        return store.issue_session(user)

    @app.post("/api/auth/google", dependencies=limited)
    async def google(body: m.GoogleSignIn, store: Storage):
        # Explicit homework stub, not a Google credential verifier.
        if body.idToken != GOOGLE_STUB_TOKEN:
            raise ApiError(401, "invalid_credentials", "Invalid credentials.")
        user = store.user_by_email(GOOGLE_STUB_EMAIL)
        if user and user["provider"] != "google":
            raise ApiError(409, "account_provider_conflict", "This email uses password sign-in.")
        if user is None:
            user = store.create_user("Google Demo", GOOGLE_STUB_EMAIL, "google")
        store.board_for(user["id"])
        return store.issue_session(user)

    @app.get("/api/auth/session")
    async def session(auth: Auth):
        return {"user": auth[0]}

    @app.post("/api/auth/logout", status_code=204)
    async def logout(auth: Auth, store: Storage):
        store.sessions.pop(auth[1], None)
        return Response(status_code=204)

    @app.post("/api/auth/password-reset/request", status_code=202, dependencies=limited)
    async def request_reset(body: m.PasswordResetRequest, store: Storage):
        user = store.user_by_email(str(body.email).lower())
        if user and user["provider"] == "password":
            store.clear_resets(user["id"])
            token = secrets.token_urlsafe(32)
            store.reset_tokens[token] = (user["id"], store.clock() + RESET_TTL)
            store.outbox.append({"userId": user["id"], "email": user["email"], "token": token})
            logger.warning("DEVELOPMENT password reset for %s: token=%s", user["email"], token)
        return Response(status_code=202)

    @app.post("/api/auth/password-reset/confirm", status_code=204, dependencies=limited)
    async def reset_password(body: m.ResetPassword, store: Storage):
        reset = store.reset_tokens.get(body.token)
        user = store.users.get(reset[0]) if reset else None
        if not reset or reset[1] <= store.clock() or not user or user["provider"] != "password":
            store.reset_tokens.pop(body.token, None)
            raise ApiError(400, "invalid_reset_token", "Invalid or expired reset token.")
        store.passwords[user["id"]] = hash_password(body.newPassword)
        store.clear_resets(user["id"])
        store.revoke_sessions(user["id"])
        return Response(status_code=204)

    @app.post("/api/me/password", status_code=204, dependencies=limited)
    async def change_password(body: m.ChangePassword, auth: Auth, store: Storage):
        user, token = auth
        if user["provider"] != "password":
            raise ApiError(403, "password_provider_required", "Password accounts only.")
        if not password_matches(body.currentPassword, store.passwords.get(user["id"])):
            raise ApiError(400, "incorrect_current_password", "Your current password is incorrect.")
        store.passwords[user["id"]] = hash_password(body.newPassword)
        store.revoke_sessions(user["id"], except_token=token)
        store.clear_resets(user["id"])
        return Response(status_code=204)

    @app.patch("/api/me")
    async def update_profile(body: m.UpdateProfile, auth: Auth, store: Storage):
        user = auth[0]
        user.update(body.model_dump(exclude_unset=True))
        store.users[user["id"]] = user
        return user

    @app.delete("/api/me", status_code=204)
    async def delete_account(auth: Auth, store: Storage):
        user_id = auth[0]["id"]
        store.clear_resets(user_id)
        # Foreign keys cascade to passwords, all boards/tasks, and sessions.
        del store.users[user_id]
        return Response(status_code=204)

    @app.get("/api/board")
    async def get_board(auth: Auth, store: Storage):
        return store.board_for(auth[0]["id"])

    @app.patch("/api/board")
    async def rename_board(body: m.RenameBoard, auth: Auth, store: Storage):
        board = store.board_for(auth[0]["id"])
        board["name"] = body.name.strip() or "My Board"
        store.boards[board["id"]] = board
        return board

    @app.get("/api/board/tasks")
    async def list_tasks(auth: Auth, store: Storage):
        return store.board_tasks(store.board_for(auth[0]["id"])["id"])

    @app.post("/api/board/tasks", status_code=201)
    async def create_task(body: m.CreateTask, auth: Auth, store: Storage):
        board = store.board_for(auth[0]["id"])
        now = timestamp()
        task = {**body.model_dump(), "id": uid("task"), "boardId": board["id"],
                "title": body.title.strip(), "description": body.description.strip(),
                "position": len(store.column(board["id"], body.status)),
                "createdAt": now, "updatedAt": now}
        store.tasks[task["id"]] = task
        return task

    @app.patch("/api/board/tasks/{taskId}")
    async def update_task(taskId: str, body: m.UpdateTask, auth: Auth, store: Storage):
        task = owned_task(store, auth[0], taskId)
        changes = body.model_dump(exclude_unset=True)
        status = changes.pop("status", task["status"])
        if status != task["status"]:
            store.move(task, status, len(store.column(task["boardId"], status)))
        for field in ("title", "description"):
            if field in changes:
                changes[field] = changes[field].strip()
        task.update(changes)
        task["updatedAt"] = timestamp()
        store.tasks[task["id"]] = task
        return task

    @app.delete("/api/board/tasks/{taskId}", status_code=204)
    async def delete_task(taskId: str, auth: Auth, store: Storage):
        task = owned_task(store, auth[0], taskId)
        del store.tasks[taskId]
        store.renumber(store.column(task["boardId"], task["status"]), timestamp())
        return Response(status_code=204)

    @app.post("/api/board/tasks/{taskId}/move")
    async def move_task(taskId: str, body: m.MoveTask, auth: Auth, store: Storage):
        task = owned_task(store, auth[0], taskId)
        store.move(task, body.status, body.index)
        return store.board_tasks(task["boardId"])

    return app


app = create_app()
