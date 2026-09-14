"""SQLite repositories. SQL identifiers come only from the fixed schema below."""

import sqlite3
from collections.abc import MutableMapping
from contextlib import contextmanager
from pathlib import Path

DEFAULT_DATABASE = Path(__file__).resolve().parents[1] / "data" / "flowly.sqlite3"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 avatarUrl TEXT, provider TEXT NOT NULL CHECK(provider IN ('password', 'google'))
);
CREATE TABLE IF NOT EXISTS passwords (
 userId TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS boards (
 id TEXT PRIMARY KEY, ownerId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS boards_owner ON boards(ownerId);
CREATE TABLE IF NOT EXISTS tasks (
 id TEXT PRIMARY KEY, boardId TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
 title TEXT NOT NULL, description TEXT NOT NULL, dueDate TEXT,
 priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')),
 status TEXT NOT NULL CHECK(status IN ('todo', 'in_progress', 'done')),
 position INTEGER NOT NULL CHECK(position >= 0), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_board_position ON tasks(boardId, position);
CREATE TABLE IF NOT EXISTS sessions (
 token TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expiresAt REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS reset_tokens (
 token TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expiresAt REAL NOT NULL
);
"""


class Database:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(self.path, isolation_level=None, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA foreign_keys = ON")
        self.connection.executescript(SCHEMA)

    @contextmanager
    def transaction(self):
        # Serialize read/modify/write sequences, including ordering and signup.
        self.connection.execute("BEGIN IMMEDIATE")
        try:
            yield
            self.connection.commit()
        except BaseException:
            self.connection.rollback()
            raise

    def close(self):
        self.connection.close()


class Repository(MutableMapping):
    """Dictionary-shaped rows with explicit writes; reads return detached values."""

    def __init__(self, database, table, key="id", value_columns=None):
        self.db = database.connection
        self.table, self.key, self.value_columns = table, key, value_columns

    def decode(self, row):
        if self.value_columns:
            values = tuple(row[c] for c in self.value_columns)
            return values[0] if len(values) == 1 else values
        return dict(row)

    def __getitem__(self, key):
        row = self.db.execute(f"SELECT * FROM {self.table} WHERE {self.key} = ?", (key,)).fetchone()
        if row is None:
            raise KeyError(key)
        return self.decode(row)

    def __setitem__(self, key, value):
        if self.value_columns:
            values = (value,) if len(self.value_columns) == 1 else value
            row = {self.key: key, **dict(zip(self.value_columns, values))}
        else:
            row = dict(value)
            row[self.key] = key
        # Only schema column names may become SQL identifiers.
        allowed = {r[1] for r in self.db.execute(f"PRAGMA table_info({self.table})")}
        if not row.keys() <= allowed:
            raise ValueError("Unknown database fields")
        columns = list(row)
        updates = ", ".join(f"{c}=excluded.{c}" for c in columns if c != self.key)
        self.db.execute(
            f"INSERT INTO {self.table} ({', '.join(columns)}) VALUES ({', '.join('?' for _ in columns)}) "
            f"ON CONFLICT({self.key}) DO UPDATE SET {updates}", tuple(row.values()))

    def __delitem__(self, key):
        result = self.db.execute(f"DELETE FROM {self.table} WHERE {self.key} = ?", (key,))
        if not result.rowcount:
            raise KeyError(key)

    def __iter__(self):
        return iter([r[0] for r in self.db.execute(f"SELECT {self.key} FROM {self.table}")])

    def __len__(self):
        return self.db.execute(f"SELECT COUNT(*) FROM {self.table}").fetchone()[0]

    def select(self, field, value, order=None):
        allowed = {r[1] for r in self.db.execute(f"PRAGMA table_info({self.table})")}
        if field not in allowed or (order is not None and order not in allowed):
            raise ValueError("Unknown database fields")
        sql = f"SELECT * FROM {self.table} WHERE {field} = ?"
        if order:
            sql += f" ORDER BY {order}"
        return [self.decode(r) for r in self.db.execute(sql, (value,))]
