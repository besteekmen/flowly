import re
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient
from openapi_schema_validator import OAS30Validator

from app.main import create_app

CONTRACT = yaml.safe_load((Path(__file__).resolve().parents[2] / "openapi.yaml").read_text())


def expand(value):
    if isinstance(value, dict):
        if "$ref" in value:
            node = CONTRACT
            for part in value["$ref"][2:].split("/"):
                node = node[part]
            return expand(node)
        return {key: expand(item) for key, item in value.items()}
    if isinstance(value, list):
        return [expand(item) for item in value]
    return value


class ContractClient(TestClient):
    """Validate every exercised API response against the hand-written contract."""

    def request(self, method, url, **kwargs):
        response = super().request(method, url, **kwargs)
        for path, item in CONTRACT["paths"].items():
            pattern = "/api" + path.replace("{taskId}", "[^/]+")
            if re.fullmatch(pattern, response.request.url.path) and method.lower() in item:
                operation = item[method.lower()]
                assert str(response.status_code) in operation["responses"], response.text
                spec = expand(operation["responses"][str(response.status_code)])
                if "content" in spec:
                    schema = spec["content"]["application/json"]["schema"]
                    OAS30Validator(schema, format_checker=OAS30Validator.FORMAT_CHECKER).validate(response.json())
                else:
                    assert response.content == b""
                break
        return response


@pytest.fixture
def client(tmp_path):
    with ContractClient(create_app(tmp_path / "test.sqlite3"), raise_server_exceptions=False) as client:
        yield client


def signup(client, email="alice@example.com", name=" Alice "):
    response = client.post("/api/auth/signup", json={"name": name, "email": email, "password": "secret12"})
    assert response.status_code == 201, response.text
    return response.json()


def headers(session):
    return {"Authorization": "Bearer " + session["accessToken"]}


def task(client, session, title="Task", status="todo"):
    response = client.post("/api/board/tasks", headers=headers(session), json={
        "title": title, "description": " description ", "dueDate": None,
        "priority": "medium", "status": status,
    })
    assert response.status_code == 201, response.text
    return response.json()
