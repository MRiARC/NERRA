# Task 01 — Projects CRUD + Story Views

| | |
|---|---|
| **Difficulty** | Easy |
| **Depends on** | nothing — start here |
| **Files you implement** | `app/routers/projects.py`, `app/routers/story.py` |
| **Files to read first** | `docs/ARCHITECTURE_GUIDE.md` §2, `app/auth/router.py` (worked example), `app/models.py` (Project + story tables) |
| **Tests** | `make test-task TASK=tests/tasks/test_task01_projects.py` |

## The idea

Auth is built; nothing else is. Before any AI magic, NERRA needs plain
CRUD: users create **projects** (one novel each), and read back the story
world the AI will later fill in. This task is pure pattern-copying: the
router files are fully declared (paths, validation, auth, response schemas);
you write the bodies — 3–6 lines each — exactly like the ones in
`app/auth/router.py`.

## Concepts you'll practice

- SQLAlchemy queries: `db.query(Model).filter(...)`, `.all()`, `.first()`
- `db.add()` → `db.commit()` → `db.refresh()` for writes
- Ownership checks via `Depends(get_owned_project)` (read it in
  `app/auth/dependencies.py` — it already answers 404 for other people's projects)
- Empty-body responses with HTTP 204

## Requirements

- [ ] `POST /projects` → 201, project created with `owner_id = current user`
- [ ] `GET /projects` → 200, **only the caller's** projects, newest first
- [ ] `GET /projects/{id}` → 200 (yours) / 404 (exists but not yours)
- [ ] `PATCH /projects/{id}` → 200, updates only the fields the client sent,
      leaves the rest untouched
- [ ] `DELETE /projects/{id}` → 204 empty body; a later GET returns 404
- [ ] `GET /projects/{id}/characters | relationships | events | knowledge | issues`
      → 200 with `[]` on a fresh project (they're queries over empty tables —
      that's correct!)
- [ ] `GET /projects/{id}/world` → 200 `{"locations": [], "objects": []}`
- [ ] `PATCH /projects/{id}/issues/{id}` → 404 for unknown issue, and updates
      `status` when the issue exists (it will exist after Task 05)

## Where to code

Every function in the two router files ends with:

```python
# ========== YOUR CODE HERE (Task 01) ==========
raise not_implemented("01-projects-crud")
```

Delete the `raise` and write the body. The docstring above each one tells
you the steps. Example — the first one, solved (this is the level of
difficulty you should expect):

```python
project = Project(owner_id=user.id, title=payload.title, genre=payload.genre)
db.add(project)
db.commit()
db.refresh(project)
return project
```

## See it working

In `http://localhost:8000/docs`: click **Authorize**, log in with the same
email/password you registered (the swagger login takes `username` = email),
then:

1. `POST /projects` → Try it out → body `{"title": "Ashford", "genre": "mystery"}` → **201**
2. `GET /projects` → your list, containing *Ashford*
3. `POST /auth/register` a SECOND user, authorize as them, `GET /projects`
   → the list is empty; `GET /projects/{first-id}` → **404**. Ownership works.

Or with curl:

```bash
TOKEN=$(curl -s -X POST localhost:8000/auth/login -d 'username=me@nerra.test&password=super-secret-123' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
curl -s localhost:8000/projects -H "Authorization: Bearer $TOKEN"
```

## Questions (answer in your PR description — one line each)

1. Why does `get_owned_project` return **404** (not 403) for someone else's
   project, and what information leak does that avoid?
2. In `update_project`, what happens if you naively do
   `project.title = payload.title` and the client omitted `title`?
3. `DELETE /projects/{id}` cascades to manuscripts/characters/issues. Which
   lines in `app/models.py` make that happen?

## Stretch (optional)

- Add `?genre=` filtering to `GET /projects`.
- Return a `409` when creating a project with a title the same user already
  uses, plus a test.
