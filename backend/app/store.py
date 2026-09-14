"""Single-process memory only. Restarting the server clears everything.

Handlers are async and do not await during store operations, so each mutation is
atomic on the server's event loop. Do not run multiple workers with this store.
"""

import hashlib
import hmac
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timezone

TOKEN_TTL = 3600
RESET_TTL = 900
RATE_LIMIT = 30
RATE_WINDOW = 60


def uid(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(12)}"


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return f"{salt.hex()}:{digest.hex()}"


def password_matches(password: str, stored: str | None) -> bool:
    if stored is None:
        return False
    salt, expected = stored.split(":")
    actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1)
    return hmac.compare_digest(actual.hex(), expected)


class Store:
    def __init__(self):
        self.users: dict[str, dict] = {}
        self.passwords: dict[str, str] = {}
        self.boards: dict[str, dict] = {}
        self.tasks: dict[str, dict] = {}
        self.sessions: dict[str, tuple[str, float]] = {}
        self.reset_tokens: dict[str, tuple[str, float]] = {}
        # Development-only email outbox. No HTTP endpoint exposes these tokens.
        self.outbox: list[dict] = []
        self.rate_hits = defaultdict(deque)
        self.clock = time.time
        self.rate_limit = RATE_LIMIT

    def user_by_email(self, email):
        return next((u for u in self.users.values() if u["email"] == email), None)

    def create_user(self, name, email, provider, password=None):
        user = {"id": uid("user"), "name": name, "email": email,
                "avatarUrl": None, "provider": provider}
        # Hash before publishing any account data.
        hashed = hash_password(password) if password is not None else None
        self.users[user["id"]] = user
        if hashed is not None:
            self.passwords[user["id"]] = hashed
        self.board_for(user["id"])
        return user

    def board_for(self, user_id):
        board = next((b for b in self.boards.values() if b["ownerId"] == user_id), None)
        if board is None:
            board = {"id": uid("board"), "ownerId": user_id, "name": "My Board"}
            self.boards[board["id"]] = board
        return board

    def issue_session(self, user):
        token = secrets.token_urlsafe(32)
        self.sessions[token] = (user["id"], self.clock() + TOKEN_TTL)
        return {"user": user, "accessToken": token,
                "tokenType": "Bearer", "expiresIn": TOKEN_TTL}

    def revoke_sessions(self, user_id, except_token=None):
        self.sessions = {t: s for t, s in self.sessions.items()
                         if s[0] != user_id or t == except_token}

    def clear_resets(self, user_id):
        self.reset_tokens = {t: s for t, s in self.reset_tokens.items() if s[0] != user_id}
        self.outbox = [m for m in self.outbox if m["userId"] != user_id]

    def board_tasks(self, board_id):
        return sorted((t for t in self.tasks.values() if t["boardId"] == board_id),
                      key=lambda t: t["position"])

    def column(self, board_id, status, exclude=None):
        return [t for t in self.board_tasks(board_id)
                if t["status"] == status and t["id"] != exclude]

    @staticmethod
    def renumber(column, now):
        for index, task in enumerate(column):
            if task["position"] != index:
                task["position"] = index
                task["updatedAt"] = now

    def move(self, task, status, index):
        now = timestamp()
        source = task["status"]
        destination = self.column(task["boardId"], status, exclude=task["id"])
        destination.insert(max(0, min(index, len(destination))), task)
        task["status"] = status
        task["updatedAt"] = now
        self.renumber(destination, now)
        if source != status:
            self.renumber(self.column(task["boardId"], source), now)
