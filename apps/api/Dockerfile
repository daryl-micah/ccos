# CCOS FastAPI backend
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# UV_NO_SYNC: the venv is fully built below, so `uv run` at runtime uses it
# as-is instead of re-syncing (which would try to pull dev deps over the
# network and fail offline).
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_SYNC=1 \
    PYTHONUNBUFFERED=1

# Install dependencies first (cached layer).
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Application code.
COPY . .
RUN uv sync --frozen --no-dev

EXPOSE 8000

# Apply migrations, then serve. $PORT is set dynamically by Heroku; falls
# back to 8000 for docker-compose, where it isn't set.
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
