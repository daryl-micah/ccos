from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    env: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+asyncpg://ccos:ccos@localhost:5433/ccos"

    @field_validator("database_url")
    @classmethod
    def _use_asyncpg_driver(cls, v: str) -> str:
        # Heroku Postgres sets DATABASE_URL with the plain postgres:// (or
        # postgresql://) scheme; SQLAlchemy's async engine needs the asyncpg
        # driver named explicitly.
        for scheme in ("postgres://", "postgresql://"):
            if v.startswith(scheme):
                return "postgresql+asyncpg://" + v[len(scheme):]
        return v

    # Instagram (Phase 3). A single shared/server-side account authenticates all
    # collection. Username/password is tried first; if that login fails (2FA,
    # challenge, block), it falls back to ``instagram_sessionid`` (a browser
    # sessionid cookie, the more reliable method). The resulting session is
    # persisted under ``instagram_session_dir`` (password is never stored).
    instagram_username: str = ""
    instagram_password: str = ""
    instagram_sessionid: str = ""
    instagram_session_dir: str = "instagram_sessions"

    # AI layer (Phase 8) — powered by Groq. Leave the key blank to disable.
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Clerk auth (multi-tenancy rollout, Phase 2). The secret key also
    # authenticates the JWKS fetch at ``clerk_jwks_url`` — using Clerk's
    # Backend API JWKS endpoint means we verify tokens without needing to
    # know the instance's frontend-api/custom domain.
    clerk_secret_key: str = ""
    clerk_jwks_url: str = "https://api.clerk.com/v1/jwks"

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

    @property
    def db_connect_args(self) -> dict:
        """asyncpg connect kwargs. Heroku Postgres requires SSL; local Docker
        Postgres doesn't support it."""
        return {"ssl": "require"} if self.env == "production" else {}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
