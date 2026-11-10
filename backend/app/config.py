"""Application configuration.

Everything configurable lives in environment variables (see .env.example at
the repo root). `pydantic-settings` reads `backend/.env` if present and falls
back to the defaults below — so a fresh clone works out of the box.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_PATH), env_file_encoding="utf-8", extra="ignore"
    )

    # --- Database ---
    # Port 5434: the Docker container is mapped there because other local
    # Postgres instances may occupy 5432 or 5433 (see docker-compose.yml).
    database_url: str = "postgresql+psycopg://nerra:nerra_dev_password@127.0.0.1:5434/nerra"
    test_database_url: str = "postgresql+psycopg://nerra:nerra_dev_password@127.0.0.1:5434/nerra_test"

    # --- Auth ---
    jwt_secret: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # --- LLMs (Anthropic Claude or compatible proxy) ---
    anthropic_base_url: str = ""
    anthropic_api_key: str = ""
    extraction_model: str = "claude-sonnet-4.5"
    fast_model: str = "claude-haiku-4.5"
    chat_model: str = "claude-sonnet-4.5"
    extraction_max_tokens: int = 16384
    chat_max_tokens: int = 4096
    use_llm_consistency: bool = True

    # --- Embeddings (computed locally, no API key) ---
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384

    # --- Graph Database (Neo4j in Docker) ---
    neo4j_uri: str = "bolt://127.0.0.1:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "nerra_dev_password"
    neo4j_enabled: bool = True


settings = Settings()
