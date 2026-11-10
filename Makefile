.PHONY: up down logs reset-db install api test test-task help

# Start Postgres (pgvector) in Docker.
up:
	docker compose up -d
	@echo ""
	@echo "Postgres is starting:  localhost:5433 (user: nerra, db: nerra)"
	@echo "Next:  make install   (first time only)"
	@echo "       make api       (run the backend -> http://localhost:8000/docs)"

down:
	docker compose down

logs:
	docker compose logs -f

# Wipe the database volume; init SQL re-runs on next boot.
reset-db:
	docker compose down
	docker volume rm nerra_nerra_pgdata
	docker compose up -d
	@echo "Database reset."

# First-time setup: create a virtualenv and install backend dependencies.
install:
	python3 -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r backend/requirements.txt
	@echo "Done. Activate with:  source .venv/bin/activate"

# Run the backend with hot reload (run `make up` first).
api:
	cd backend && ../.venv/bin/python -m uvicorn app.main:app --reload --port 8000

# Run the Next.js frontend on localhost:3001
frontend:
	cd frontend && npm run dev -- -p 3001

# Run the full test suite (run `make up` first — tests need Postgres).
test:
	cd backend && ../.venv/bin/python -m pytest -q

# Run only the tests for one task, e.g.:  make test-task TASK=tests/tasks/test_task05_consistency.py
test-task:
	cd backend && ../.venv/bin/python -m pytest $(TASK) -q
