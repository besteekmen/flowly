"""Exercise durable state through fresh applications and transactional failures."""

from app.main import create_app
from app.store import RESET_TTL, TOKEN_TTL, Store
from conftest import ContractClient, headers, signup, task
from test_api import login


def test_new_application_preserves_data_and_ownership(tmp_path):
    path = tmp_path / "flowly.sqlite3"
    with ContractClient(create_app(path)) as first:
        alice, bob = signup(first), signup(first, "bob@example.com")
        auth = headers(alice)
        profile = first.patch("/api/me", headers=auth, json={
            "name": "Saved name", "avatarUrl": "https://example.com/avatar.png",
        }).json()
        board = first.patch("/api/board", headers=auth, json={"name": "Saved board"}).json()
        a, b, c = [task(first, alice, title) for title in ("A", "B", "C")]
        first.patch(f'/api/board/tasks/{a["id"]}', headers=auth,
                    json={"dueDate": "2026-09-20", "priority": "high", "description": "Saved text"})
        first.post(f'/api/board/tasks/{c["id"]}/move', headers=auth,
                   json={"status": "todo", "index": 0})
        first.post(f'/api/board/tasks/{b["id"]}/move', headers=auth,
                   json={"status": "done", "index": 0})
        expected = first.get("/api/board/tasks", headers=auth).json()
        bob_task = task(first, bob)

    with ContractClient(create_app(path)) as second:
        assert second.get("/api/auth/session", headers=auth).json() == {"user": profile}
        assert login(second).json()["user"] == profile
        assert second.get("/api/board", headers=auth).json() == board
        assert second.get("/api/board/tasks", headers=auth).json() == expected
        assert [t["id"] for t in expected if t["status"] == "todo"] == [c["id"], a["id"]]
        assert second.get("/api/board/tasks", headers=headers(bob)).json() == [bob_task]
        for method, suffix, body in [("patch", "", {"title": "Stolen"}),
                                     ("delete", "", None),
                                     ("post", "/move", {"status": "done", "index": 0})]:
            response = second.request(method, f'/api/board/tasks/{a["id"]}' + suffix,
                                      headers=headers(bob), **({"json": body} if body else {}))
            assert response.status_code == 404
        assert second.delete(f'/api/board/tasks/{c["id"]}', headers=auth).status_code == 204
        assert task(second, alice, "New")["position"] == 1
        expected = second.get("/api/board/tasks", headers=auth).json()
        assert second.post("/api/auth/logout", headers=auth).status_code == 204

    with ContractClient(create_app(path)) as third:
        assert third.get("/api/auth/session", headers=auth).status_code == 401
        session = login(third).json()
        assert third.get("/api/board/tasks", headers=headers(session)).json() == expected


def test_reset_and_account_deletion_survive_restarts(tmp_path):
    path = tmp_path / "flowly.sqlite3"
    with ContractClient(create_app(path)) as first:
        alice, bob = signup(first), signup(first, "bob@example.com")
        alice_task, bob_task = task(first, alice), task(first, bob)
        first.post("/api/auth/password-reset/request", json={"email": "alice@example.com"})
        token = first.app.state.store.outbox[-1]["token"]

    with ContractClient(create_app(path)) as second:
        assert second.app.state.store.outbox == []
        assert second.post("/api/auth/password-reset/confirm", json={
            "token": token, "newPassword": "reset12",
        }).status_code == 204

    with ContractClient(create_app(path)) as third:
        assert third.get("/api/auth/session", headers=headers(alice)).status_code == 401
        assert third.post("/api/auth/password-reset/confirm", json={
            "token": token, "newPassword": "again12",
        }).status_code == 400
        assert login(third).status_code == 401
        current = login(third, password="reset12").json()
        third.post("/api/auth/password-reset/request", json={"email": "alice@example.com"})
        assert third.delete("/api/me", headers=headers(current)).status_code == 204

    with ContractClient(create_app(path)) as fourth:
        store = fourth.app.state.store
        assert alice["user"]["id"] not in store.users
        assert alice["user"]["id"] not in store.passwords
        assert alice_task["boardId"] not in store.boards
        assert alice_task["id"] not in store.tasks
        assert not store.reset_tokens
        assert all(s[0] != alice["user"]["id"] for s in store.sessions.values())
        assert fourth.get("/api/board/tasks", headers=headers(bob)).json() == [bob_task]
        assert login(fourth, password="reset12").status_code == 401


def test_password_change_and_expiry_survive_restarts(tmp_path):
    path = tmp_path / "flowly.sqlite3"
    with ContractClient(create_app(path)) as first:
        first.app.state.store.clock = lambda: 1000
        alice = signup(first)
        other = login(first).json()
        first.post("/api/auth/password-reset/request", json={"email": "alice@example.com"})
        old_reset = first.app.state.store.outbox[-1]["token"]
        assert first.post("/api/me/password", headers=headers(alice), json={
            "currentPassword": "secret12", "newPassword": "changed12",
        }).status_code == 204

    with ContractClient(create_app(path)) as second:
        second.app.state.store.clock = lambda: 1001
        assert second.get("/api/auth/session", headers=headers(alice)).status_code == 200
        assert second.get("/api/auth/session", headers=headers(other)).status_code == 401
        assert login(second, password="changed12").status_code == 200
        assert second.post("/api/auth/password-reset/confirm", json={
            "token": old_reset, "newPassword": "reset12",
        }).status_code == 400
        second.post("/api/auth/password-reset/request", json={"email": "alice@example.com"})
        token = second.app.state.store.outbox[-1]["token"]

    with ContractClient(create_app(path)) as third:
        third.app.state.store.clock = lambda: 1001 + RESET_TTL
        assert third.post("/api/auth/password-reset/confirm", json={
            "token": token, "newPassword": "reset12",
        }).status_code == 400
        third.app.state.store.clock = lambda: 1000 + TOKEN_TTL
        assert third.get("/api/auth/session", headers=headers(alice)).status_code == 401


def test_failed_reorder_rolls_back_all_columns(client, monkeypatch):
    alice = signup(client)
    a, b = task(client, alice, "A"), task(client, alice, "B")
    before = client.get("/api/board/tasks", headers=headers(alice)).json()
    store = client.app.state.store
    original = store.renumber

    def fail_after_write(column, now):
        original(column, now)
        raise RuntimeError("Simulated failure after writing positions")

    monkeypatch.setattr(store, "renumber", fail_after_write)
    assert client.post(f'/api/board/tasks/{b["id"]}/move', headers=headers(alice),
                       json={"status": "done", "index": 0}).status_code == 500
    fresh = Store(store.database.path)
    try:
        assert fresh.board_tasks(a["boardId"]) == before
    finally:
        fresh.database.close()


def test_failed_signup_does_not_leave_partial_account(client, monkeypatch):
    def fail(_user_id):
        raise RuntimeError("Simulated board creation failure")

    monkeypatch.setattr(client.app.state.store, "board_for", fail)
    response = client.post("/api/auth/signup", json={
        "name": "Alice", "email": "alice@example.com", "password": "secret12",
    })
    assert response.status_code == 500
    fresh = Store(client.app.state.store.database.path)
    try:
        assert not fresh.users and not fresh.passwords and not fresh.boards and not fresh.sessions
    finally:
        fresh.database.close()
