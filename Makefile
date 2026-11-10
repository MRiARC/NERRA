.PHONY: up down logs reset-db install api frontend test help

# Start Postgres (pgvector) & Neo4j in Docker.
up:
	docker compose up -d
	@echo ""
	@echo "Postgres: localhost:5434 (user: nerra, db: nerra) | Neo4j Browser: http://localhost:7474"
	@echo "Next:  make install   (first time only)"
	@echo "       make api       (run the backend -> http://localhost:8001/docs)"

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
	cd backend && ../.venv/bin/python -m uvicorn app.main:app --reload --port 8001

# Run the Next.js frontend on localhost:3001
frontend:
	cd frontend && npm run dev -- -p 3001

# Run the full test suite (run `make up` first — tests need Postgres & Neo4j).
test:
	cd backend && ../.venv/bin/python -m pytest -q
