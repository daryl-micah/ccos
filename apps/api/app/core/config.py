from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    env: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+asyncpg://ccos:ccos@localhost:5433/ccos"
    redis_url: str = "redis://localhost:6379/0"

    # Instagram (Phase 3). Login is required — connect from the UI, or set
    # these env credentials for an automatic/server-side session. Sessions are
    # persisted under ``instagram_session_dir`` (password is never stored).
    instagram_username: str = ""
    instagram_password: str = ""
    instagram_session_dir: str = "instagram_sessions"

    # AI layer (Phase 8) — powered by Groq. Leave the key blank to disable.
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Comma-separated string in env (CORS_ORIGINS); use ``cors_origins`` for the list.
    cors_origins_raw: str = Field(
        default="http://localhost:3000", validation_alias="CORS_ORIGINS"
    )

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]

    @property
    def sync_database_url(self) -> str:
        """Sync URL (psycopg/psycopg2 style) for tooling that needs it."""
        return self.database_url.replace("+asyncpg", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
