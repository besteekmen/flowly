import random

import pytest
from openapi_spec_validator import validate

from app.main import GOOGLE_STUB_EMAIL, GOOGLE_STUB_TOKEN, create_app
from app.store import TOKEN_TTL, RESET_TTL
from conftest import CONTRACT, headers, signup, task


def login(client, email="alice@example.com", password="secret12"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_contract_and_routes(client):
    validate(CONTRACT)
    expected = {("/api" + p, method.upper()) for p, item in CONTRACT["paths"].items()
                for method in item if method in {"get", "post", "patch", "delete"}}
    actual = {(r.path, method) for r in client.app.routes if r.path.startswith("/api/")
              for method in r.methods}
    assert len(expected) == 17
    assert actual == expected
    assert client.get("/openapi.json").json() == CONTRACT
    assert client.get("/docs").status_code == 200


def test_signup_login_session_logout_and_empty_board(client):
    s = signup(client, " ALICE@EXAMPLE.COM ")
    assert s["user"]["name"] == "Alice"
    assert s["user"]["email"] == "alice@example.com"
    assert s["user"]["provider"] == "password"
    assert set(s["user"]) == {"id", "name", "email", "avatarUrl", "provider"}
    stored = client.app.state.store.passwords[s["user"]["id"]]
    assert stored != "secret12" and "secret12" not in stored
    board = client.get("/api/board", headers=headers(s)).json()
    assert board["name"] == "My Board" and board["ownerId"] == s["user"]["id"]
    assert client.get("/api/board/tasks", headers=headers(s)).json() == []
    assert client.get("/api/auth/session", headers=headers(s)).json() == {"user": s["user"]}
    duplicate = client.post("/api/auth/signup", json={"name": "Other", "email": "Alice@example.com", "password": "secret12"})
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "email_in_use"
    for email, password in [("alice@example.com", "wrong"), ("missing@example.com", "secret12")]:
        response = login(client, email, password)
        assert response.status_code == 401 and response.json()["code"] == "invalid_credentials"
    second = login(client).json()
    assert second["accessToken"] != s["accessToken"]
    assert client.post("/api/auth/logout", headers=headers(s)).status_code == 204
    assert client.get("/api/auth/session", headers=headers(s)).status_code == 401
    assert client.post("/api/auth/logout", headers=headers(s)).status_code == 401
    assert client.get("/api/auth/session", headers=headers(second)).status_code == 200


@pytest.mark.parametrize("authorization", [None, "Basic abc", "Bearer bad", "Bearer"])
def test_bearer_required(client, authorization):
    auth = {"Authorization": authorization} if authorization else {}
    for path, item in CONTRACT["paths"].items():
        for method, op in item.items():
            if method not in {"get", "post", "patch", "delete"} or op.get("security") == []:
                continue
            response = client.request(method, "/api" + path.replace("{taskId}", "missing"), headers=auth)
            assert response.status_code == 401, (method, path, response.text)
            assert response.headers["www-authenticate"] == "Bearer"


def test_expired_session(client):
    store = client.app.state.store
    store.clock = lambda: 1000
    s = signup(client)
    store.clock = lambda: 1000 + TOKEN_TTL
    assert client.get("/api/board", headers=headers(s)).status_code == 401


def test_profile_and_board_updates(client):
    s = signup(client, name=" ")
    assert s["user"]["name"] == "alice"
    auth = headers(s)
    r = client.patch("/api/me", headers=auth, json={"name": "Updated", "avatarUrl": "https://example.com/a.png"})
    assert r.status_code == 200 and r.json()["avatarUrl"] == "https://example.com/a.png"
    r = client.patch("/api/me", headers=auth, json={"avatarUrl": None})
    assert r.json()["name"] == "Updated" and r.json()["avatarUrl"] is None
    assert client.patch("/api/me", headers=auth, json={}).json() == r.json()
    assert client.get("/api/auth/session", headers=auth).json()["user"] == r.json()
    for value, expected in [(" Sprint ", "Sprint"), ("  ", "My Board")]:
        r = client.patch("/api/board", headers=auth, json={"name": value})
        assert r.status_code == 200 and r.json()["name"] == expected
    client.app.state.store.boards.clear()
    assert client.get("/api/board", headers=auth).json()["name"] == "My Board"


def test_password_change_revokes_other_sessions(client):
    s = signup(client)
    other = login(client).json()
    auth = headers(s)
    body = {"currentPassword": "wrong", "newPassword": "changed12"}
    r = client.post("/api/me/password", headers=auth, json=body)
    assert r.status_code == 400 and r.json()["code"] == "incorrect_current_password"
    body["currentPassword"] = "secret12"
    assert client.post("/api/me/password", headers=auth, json=body).status_code == 204
    assert client.get("/api/auth/session", headers=auth).status_code == 200
    assert client.get("/api/auth/session", headers=headers(other)).status_code == 401
    assert login(client).status_code == 401
    assert login(client, password="changed12").status_code == 200


def test_google_stub_and_provider_restriction(client):
    assert client.post("/api/auth/google", json={"idToken": "not-google"}).status_code == 401
    s = client.post("/api/auth/google", json={"idToken": GOOGLE_STUB_TOKEN}).json()
    other = client.post("/api/auth/google", json={"idToken": GOOGLE_STUB_TOKEN}).json()
    assert s["user"] == other["user"]
    assert s["user"]["provider"] == "google"
    assert client.get("/api/board/tasks", headers=headers(s)).json() == []
    assert login(client, GOOGLE_STUB_EMAIL).status_code == 401
    r = client.post("/api/me/password", headers=headers(s), json={"currentPassword": "anything", "newPassword": "changed12"})
    assert r.status_code == 403 and r.json()["code"] == "password_provider_required"
    assert client.post("/api/auth/password-reset/request", json={"email": GOOGLE_STUB_EMAIL}).status_code == 202
    assert client.app.state.store.outbox == []


def test_google_does_not_link_password_account(client):
    signup(client, GOOGLE_STUB_EMAIL)
    r = client.post("/api/auth/google", json={"idToken": GOOGLE_STUB_TOKEN})
    assert r.status_code == 409 and r.json()["code"] == "account_provider_conflict"


def test_reset_single_use_expiry_and_session_revocation(client):
    s = signup(client)
    other = login(client).json()
    store = client.app.state.store
    store.clock = lambda: 1000
    for email in ["alice@example.com", "unknown@example.com"]:
        r = client.post("/api/auth/password-reset/request", json={"email": email})
        assert r.status_code == 202 and r.content == b""
    assert len(store.outbox) == 1
    token = store.outbox[-1]["token"]
    r = client.post("/api/auth/password-reset/confirm", json={"token": token, "newPassword": "reset12"})
    assert r.status_code == 204
    assert client.post("/api/auth/password-reset/confirm", json={"token": token, "newPassword": "another12"}).status_code == 400
    for session in [s, other]:
        assert client.get("/api/auth/session", headers=headers(session)).status_code == 401
    assert login(client).status_code == 401
    assert login(client, password="reset12").status_code == 200
    client.post("/api/auth/password-reset/request", json={"email": "alice@example.com"})
    token = store.outbox[-1]["token"]
    store.clock = lambda: 1000 + RESET_TTL
    r = client.post("/api/auth/password-reset/confirm", json={"token": token, "newPassword": "another12"})
    assert r.status_code == 400 and r.json()["code"] == "invalid_reset_token"


def test_account_deletion_cascades_without_touching_other_users(client):
    alice, bob = signup(client), signup(client, "bob@example.com")
    other_session = login(client).json()
    a_task, b_task = task(client, alice), task(client, bob)
    client.post("/api/auth/password-reset/request", json={"email": "alice@example.com"})
    token = client.app.state.store.outbox[-1]["token"]
    assert client.delete("/api/me", headers=headers(alice)).status_code == 204
    store = client.app.state.store
    assert alice["user"]["id"] not in store.users
    assert alice["user"]["id"] not in store.passwords
    assert a_task["boardId"] not in store.boards and a_task["id"] not in store.tasks
    assert store.reset_tokens == {} and store.outbox == []
    for s in [alice, other_session]:
        assert client.get("/api/auth/session", headers=headers(s)).status_code == 401
    assert client.post("/api/auth/password-reset/confirm", json={"token": token, "newPassword": "reset12"}).status_code == 400
    assert client.get("/api/board/tasks", headers=headers(bob)).json() == [b_task]
    assert login(client).status_code == 401
    new = signup(client)
    assert new["user"]["id"] != alice["user"]["id"]
    assert client.get("/api/board/tasks", headers=headers(new)).json() == []


def test_task_crud_ordering_and_timestamps(client):
    s = signup(client)
    auth = headers(s)
    a, b, c = [task(client, s, name) for name in [" A ", "B", "C"]]
    assert a["title"] == "A" and a["description"] == "description"
    r = client.patch(f'/api/board/tasks/{a["id"]}', headers=auth,
                     json={"title": " New ", "description": " ", "dueDate": "2026-09-20", "priority": "high"}).json()
    assert r["title"] == "New" and r["description"] == "" and r["priority"] == "high"
    assert r["createdAt"] == a["createdAt"] and r["updatedAt"] > a["updatedAt"]
    r = client.patch(f'/api/board/tasks/{a["id"]}', headers=auth, json={"dueDate": None}).json()
    assert r["dueDate"] is None
    r2 = client.patch(f'/api/board/tasks/{a["id"]}', headers=auth, json={}).json()
    assert r2["updatedAt"] > r["updatedAt"] and r2["position"] == r["position"]
    # Reorder inside a column, then move across columns and clamp both ends.
    r = client.post(f'/api/board/tasks/{c["id"]}/move', headers=auth, json={"status": "todo", "index": -10}).json()
    assert [t["id"] for t in r] == [c["id"], a["id"], b["id"]]
    r = client.post(f'/api/board/tasks/{c["id"]}/move', headers=auth, json={"status": "done", "index": 999}).json()
    assert len(r) == 3
    client.patch(f'/api/board/tasks/{a["id"]}', headers=auth, json={"status": "done"})
    tasks = client.get("/api/board/tasks", headers=auth).json()
    done = [t for t in tasks if t["status"] == "done"]
    assert [t["id"] for t in done] == [c["id"], a["id"]]
    assert [t["position"] for t in done] == [0, 1]
    assert next(t for t in tasks if t["id"] == b["id"])["position"] == 0
    assert client.delete(f'/api/board/tasks/{c["id"]}', headers=auth).status_code == 204
    remaining = client.get("/api/board/tasks", headers=auth).json()
    assert next(t for t in remaining if t["id"] == a["id"])["position"] == 0
    assert task(client, s, "Last", "done")["position"] == 1
    assert client.delete(f'/api/board/tasks/{c["id"]}', headers=auth).status_code == 404


def test_task_ownership_for_every_mutation(client):
    alice, bob = signup(client), signup(client, "bob@example.com")
    a = task(client, alice)
    b = task(client, bob)
    assert a["boardId"] != b["boardId"]
    for task_id in [a["id"], "missing"]:
        path = f"/api/board/tasks/{task_id}"
        for method, suffix, body in [("patch", "", {"title": "Hijacked"}), ("delete", "", None),
                                     ("post", "/move", {"status": "done", "index": 0})]:
            r = client.request(method, path + suffix, headers=headers(bob), **({"json": body} if body else {}))
            assert r.status_code == 404 and r.json()["code"] == "not_found"
    assert client.get("/api/board/tasks", headers=headers(alice)).json() == [a]
    assert client.get("/api/board/tasks", headers=headers(bob)).json() == [b]


@pytest.mark.parametrize("change", [
    {"title": " "}, {"title": None}, {"description": None}, {"status": "archived"},
    {"priority": "urgent"}, {"dueDate": "2026-02-30"}, {"dueDate": "2026-09-14T00:00:00Z"},
    {"dueDate": 100}, {"ownerId": "other"}, {"boardId": "other"}, {"position": 2},
])
def test_task_validation_no_partial_writes(client, change):
    s = signup(client)
    a = task(client, s)
    r = client.patch(f'/api/board/tasks/{a["id"]}', headers=headers(s), json=change)
    assert r.status_code == 400 and r.json()["code"] == "validation_error"
    assert client.get("/api/board/tasks", headers=headers(s)).json() == [a]


def test_invalid_bodies_and_readonly_profile_fields(client):
    s = signup(client)
    for payload in [{"email": "changed@example.com"}, {"name": None}, {"provider": "google"}, {"avatarUrl": "bad url"}]:
        assert client.patch("/api/me", headers=headers(s), json=payload).status_code == 400
    assert client.post("/api/auth/login", content='{"password":', headers={"Content-Type": "application/json"}).status_code == 400
    assert client.post("/api/auth/signup", json={"name": "x", "email": "not-email", "password": "secret12"}).status_code == 400
    assert client.post("/api/auth/signup", json={"name": "x", "email": "valid@example.com", "password": "short"}).status_code == 400
    assert client.post("/api/board/tasks", headers=headers(s), json={}).status_code == 400
    t = task(client, s)
    for index in [True, 1.2, "1"]:
        assert client.post(f'/api/board/tasks/{t["id"]}/move', headers=headers(s), json={"status": "done", "index": index}).status_code == 400


def test_ordering_survives_mixed_actions(client):
    rng = random.Random(7)
    s = signup(client)
    auth = headers(s)
    expected = {status: [] for status in ["todo", "in_progress", "done"]}
    for i in range(60):
        existing = [(status, id) for status, ids in expected.items() for id in ids]
        action = rng.choice(["create", "move", "edit", "delete"]) if existing else "create"
        target = rng.choice(list(expected))
        if action == "create":
            t = task(client, s, str(i), target)
            expected[target].append(t["id"])
        else:
            source, id = rng.choice(existing)
            path = f"/api/board/tasks/{id}"
            if action == "delete":
                assert client.delete(path, headers=auth).status_code == 204
                expected[source].remove(id)
            elif action == "edit":
                assert client.patch(path, headers=auth, json={"status": target}).status_code == 200
                if target != source:
                    expected[source].remove(id)
                    expected[target].append(id)
            else:
                index = rng.randint(-3, 10)
                assert client.post(path + "/move", headers=auth, json={"status": target, "index": index}).status_code == 200
                expected[source].remove(id)
                expected[target].insert(max(0, min(index, len(expected[target]))), id)
        tasks = client.get("/api/board/tasks", headers=auth).json()
        for status, ids in expected.items():
            column = [t for t in tasks if t["status"] == status]
            assert [t["id"] for t in column] == ids
            assert [t["position"] for t in column] == list(range(len(ids)))


def test_rate_limit_and_recovery(client):
    store = client.app.state.store
    store.clock = lambda: 1000
    store.rate_limit = 2
    for _ in range(2):
        assert login(client).status_code == 401
    r = login(client)
    assert r.status_code == 429 and r.json()["code"] == "rate_limited"
    assert int(r.headers["retry-after"]) > 0
    store.clock = lambda: 1060
    assert login(client).status_code == 401


def test_internal_error_is_sanitized(client, monkeypatch):
    s = signup(client)
    def fail(_user_id):
        raise RuntimeError("secret internals")
    monkeypatch.setattr(client.app.state.store, "board_for", fail)
    r = client.get("/api/board", headers=headers(s))
    assert r.status_code == 500
    assert r.json() == {"code": "internal_error", "message": "Unexpected server failure."}


@pytest.mark.parametrize("origin", ["http://127.0.0.1:5173", "http://localhost:8080", "http://127.0.0.1:4173"])
def test_local_frontend_cors(client, origin):
    response = client.options("/api/board/tasks", headers={
        "Origin": origin, "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "authorization" in response.headers["access-control-allow-headers"].lower()
    response = client.get("/api/board", headers={"Origin": origin})
    assert response.status_code == 401
    assert response.headers["access-control-allow-origin"] == origin


def test_cors_rejects_unknown_origin(client):
    response = client.options("/api/board", headers={
        "Origin": "https://untrusted.example.com", "Access-Control-Request-Method": "GET",
    })
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
