"""Application configuration.

Everything configurable lives in environment variables (see .env.example at
the repo root). `pydantic-settings` reads a `.env` file if present and falls
back to the defaults below — so a fresh clone works out of the box.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- Database ---
    # Port 5433: the Docker container is mapped there because a locally
    # installed Postgres usually owns 5432 (see docker-compose.yml).
    database_url: str = "postgresql+psycopg://nerra:nerra_dev_password@localhost:5433/nerra"
    test_database_url: str = "postgresql+psycopg://nerra:nerra_dev_password@localhost:5433/nerra_test"

    # --- Auth ---
    jwt_secret: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # --- LLMs (Anthropic Claude) ---
    anthropic_api_key: str = ""
    extraction_model: str = "claude-haiku-4-5"  # fast + cheap: per-chapter extraction
    chat_model: str = "claude-sonnet-4-5"       # stronger reasoning: story chat agent

    # --- Embeddings (computed locally, no API key) ---
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384


settings = Settings()
