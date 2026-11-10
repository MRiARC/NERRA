"""Auth route integration tests."""


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


def test_projects_endpoint_requires_auth_and_returns_200(client, auth_headers):
    """Protected /projects endpoint rejects anonymous calls and succeeds with JWT."""
    assert client.get("/projects").status_code == 401
    resp = client.get("/projects", headers=auth_headers)
    assert resp.status_code == 200, f"GET /projects failed: {resp.status_code}: {resp.text[:200]}"
