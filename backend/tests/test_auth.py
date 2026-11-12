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

    client.cookies.clear()
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_projects_endpoint_requires_auth_and_returns_200(client, auth_headers):
    """Protected /projects endpoint rejects anonymous calls and succeeds with JWT."""
    assert client.get("/projects").status_code == 401
    resp = client.get("/projects", headers=auth_headers)
    assert resp.status_code == 200, f"GET /projects failed: {resp.status_code}: {resp.text[:200]}"


def test_cookie_session_and_refresh_token_recycling_flow(client):
    """Verify HttpOnly cookies, session tracking, and refresh token recycling (rotation)."""
    email = "session_user@nerra.dev"
    pwd = "secure-session-password-456"

    # 1. Register
    reg_resp = client.post("/auth/register", json={"email": email, "password": pwd, "display_name": "Session Tester"})
    assert reg_resp.status_code == 201

    # 2. Login -> sets cookies and returns tokens
    login_resp = client.post("/auth/login", data={"username": email, "password": pwd})
    assert login_resp.status_code == 200
    body = login_resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert "session_id" in body
    old_refresh_token = body["refresh_token"]

    # Verify cookies were set in response
    cookies = login_resp.cookies
    assert "access_token" in cookies
    assert "refresh_token" in cookies

    # 3. Protected route works using ONLY cookie (no Authorization header provided)
    client.cookies.set("access_token", cookies["access_token"])
    me_resp = client.get("/auth/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email

    # 4. View active sessions
    sess_resp = client.get("/auth/sessions")
    assert sess_resp.status_code == 200
    sessions = sess_resp.json()
    assert len(sessions) >= 1
    assert any(s["is_current"] for s in sessions)

    # 5. Refresh token recycling (rotation)
    client.cookies.set("refresh_token", cookies["refresh_token"])
    refresh_resp = client.post("/auth/refresh")
    assert refresh_resp.status_code == 200
    refreshed_body = refresh_resp.json()
    new_access_token = refreshed_body["access_token"]
    new_refresh_token = refreshed_body["refresh_token"]

    assert new_refresh_token != old_refresh_token, "Refresh token must rotate/recycle on every use"
    assert new_access_token != body["access_token"]

    # 6. Replay attack rejection: attempting to reuse old refresh token MUST be rejected
    replay_resp = client.post("/auth/refresh", json={"refresh_token": old_refresh_token})
    assert replay_resp.status_code == 401, "Old recycled refresh token must be rejected"

    # 7. Logout -> revokes session and clears cookies
    logout_resp = client.post("/auth/logout")
    assert logout_resp.status_code == 200

    # Old access token with revoked session is rejected
    revoked_me = client.get("/auth/me", headers={"Authorization": f"Bearer {new_access_token}"})
    assert revoked_me.status_code == 401

