"""Auth tests — these PASS out of the box.

Auth is the worked example: if these tests fail, something in the shared
spine is broken (tell your team lead). Read them to see how test files are
structured; your task tests follow the same shape.
"""

from tests.utils import expect_status


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_register_login_me_flow(client):
    email = "sarah@nerra.dev"

    # Register
    resp = client.post(
        "/auth/register",
        json={"email": email, "password": "super-secret-123", "display_name": "Sarah"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["email"] == email
    assert "password" not in body and "password_hash" not in body  # never leaked

    # Duplicate email -> 409
    resp = client.post(
        "/auth/register", json={"email": email, "password": "whatever-123"}
    )
    assert resp.status_code == 409

    # Wrong password -> 401
    resp = client.post("/auth/login", data={"username": email, "password": "wrong-pass-1"})
    assert resp.status_code == 401

    # Login -> token
    resp = client.post("/auth/login", data={"username": email, "password": "super-secret-123"})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Protected route with token -> 200, without -> 401
    resp = client.get("/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == email

    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_stub_endpoints_are_helpful(client, auth_headers):
    """Playground contract: an endpoint is either IMPLEMENTED (2xx/4xx for
    normal reasons) or a helpful stub (501 pointing at its task doc) — never
    an unhandled crash. Stays green before AND after Task 01."""
    resp = client.get("/projects", headers=auth_headers)
    if resp.status_code == 501:
        assert "docs/tasks" in resp.json()["detail"]
    else:
        assert resp.status_code == 200, (
            f"GET /projects should be 200 (implemented) or 501 (helpful stub), "
            f"got {resp.status_code}: {resp.text[:200]}"
        )
