"""Task 01 tests — Projects CRUD + story read views.

These fail (with hints) until you implement app/routers/projects.py and
app/routers/story.py. Run just this file:

    make test-task TASK=tests/tasks/test_task01_projects.py
"""

import uuid

from tests.utils import expect_status

TASK = "01-projects-crud"


def _create_project(client, headers, title="My Novel", genre="mystery") -> dict:
    resp = client.post(
        "/projects", json={"title": title, "genre": genre}, headers=headers
    )
    expect_status(resp, 201, TASK, "POST /projects")
    return resp.json()


def test_create_and_get_project(client, auth_headers):
    project = _create_project(client, auth_headers)

    resp = client.get(f"/projects/{project['id']}", headers=auth_headers)
    expect_status(resp, 200, TASK, "GET /projects/{id}")
    assert resp.json()["title"] == "My Novel"
    assert resp.json()["genre"] == "mystery"


def test_list_projects_returns_only_yours(client, auth_headers):
    _create_project(client, auth_headers, title="Novel A")
    _create_project(client, auth_headers, title="Novel B")

    resp = client.get("/projects", headers=auth_headers)
    expect_status(resp, 200, TASK, "GET /projects")
    titles = {p["title"] for p in resp.json()}
    assert titles == {"Novel A", "Novel B"}


def test_update_and_delete_project(client, auth_headers):
    project = _create_project(client, auth_headers)

    resp = client.patch(
        f"/projects/{project['id']}", json={"title": "Renamed"}, headers=auth_headers
    )
    expect_status(resp, 200, TASK, "PATCH /projects/{id}")
    assert resp.json()["title"] == "Renamed"
    assert resp.json()["genre"] == "mystery"  # untouched field survives

    resp = client.delete(f"/projects/{project['id']}", headers=auth_headers)
    expect_status(resp, 204, TASK, "DELETE /projects/{id}")

    resp = client.get(f"/projects/{project['id']}", headers=auth_headers)
    assert resp.status_code == 404


def test_cannot_touch_someone_elses_project(client, auth_headers):
    project = _create_project(client, auth_headers)

    # A second user
    other_email = f"other-{uuid.uuid4().hex[:6]}@nerra.dev"
    client.post("/auth/register", json={"email": other_email, "password": "other-pass-123"})
    resp = client.post("/auth/login", data={"username": other_email, "password": "other-pass-123"})
    other_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    resp = client.get(f"/projects/{project['id']}", headers=other_headers)
    expect_status(resp, 404, TASK, "GET someone else's project (must 404)")


def test_story_views_shape(client, auth_headers):
    """The read endpoints exist and return lists/objects with the right shape
    (empty for a fresh project — data arrives in Tasks 03-05)."""
    project = _create_project(client, auth_headers)
    pid = project["id"]

    for path, what in [
        (f"/projects/{pid}/characters", "GET /characters"),
        (f"/projects/{pid}/relationships", "GET /relationships"),
        (f"/projects/{pid}/events", "GET /events"),
        (f"/projects/{pid}/knowledge", "GET /knowledge"),
        (f"/projects/{pid}/issues", "GET /issues"),
    ]:
        resp = client.get(path, headers=auth_headers)
        expect_status(resp, 200, TASK, what)
        assert isinstance(resp.json(), list), what

    resp = client.get(f"/projects/{pid}/world", headers=auth_headers)
    expect_status(resp, 200, TASK, "GET /world")
    body = resp.json()
    assert set(body.keys()) == {"locations", "objects"}


def test_issue_patch_contract(client, auth_headers):
    """PATCH /issues/{id} accepts the four allowed statuses."""
    project = _create_project(client, auth_headers)
    # No issues exist yet -> expect 404 for a random issue id (not 501/500).
    random_id = uuid.uuid4()
    resp = client.patch(
        f"/projects/{project['id']}/issues/{random_id}",
        json={"status": "intentional"},
        headers=auth_headers,
    )
    expect_status(resp, 404, TASK, "PATCH unknown issue should 404 (implement the handler)")
