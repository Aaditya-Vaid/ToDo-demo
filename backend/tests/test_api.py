from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_authenticated_task_lifecycle() -> None:
    with TestClient(app) as client:
        email = f"user-{uuid4()}@example.com"
        auth = client.post("/auth/register", json={"email": email, "password": "secure-password"})
        assert auth.status_code == 201
        token = auth.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        created = client.post(
            "/tasks",
            headers=headers,
            json={"title": "  Finish PRD app ", "description": "Ship the MVP", "priority": "high", "due_date": "2026-06-01"},
        )
        assert created.status_code == 201
        task = created.json()
        assert task["title"] == "Finish PRD app"
        assert task["status"] == "active"
        assert task["completed_at"] is None

        toggled = client.patch(f"/tasks/{task['id']}/toggle", headers=headers)
        assert toggled.status_code == 200
        assert toggled.json()["status"] == "completed"
        assert toggled.json()["completed_at"] is not None

        updated = client.patch(f"/tasks/{task['id']}", headers=headers, json={"title": "Launch ToDo MVP", "priority": "medium"})
        assert updated.status_code == 200
        assert updated.json()["title"] == "Launch ToDo MVP"

        listed = client.get("/tasks?status=completed&search=launch", headers=headers)
        assert listed.status_code == 200
        assert len(listed.json()) == 1

        deleted = client.delete(f"/tasks/{task['id']}", headers=headers)
        assert deleted.status_code == 204
