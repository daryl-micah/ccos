# CCOS — Agent Instructions

## Structure

Monorepo (`pnpm@11.1.1` workspaces). Two apps, no shared packages yet:

- `apps/api/` — FastAPI · async SQLAlchemy 2.0 + asyncpg · Alembic · Celery · Python 3.12 (`uv`)
- `apps/web/` — Next.js 16 (App Router) · TypeScript (strict) · Tailwind v4 · TanStack Table · Recharts

No tests exist anywhere (0% coverage). No authentication — all endpoints public.

## Quick start (local dev)

```bash
# Infra (Postgres :5433, Redis :6379)
docker compose up -d postgres redis

# Backend
cd apps/api
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload          # localhost:8000/docs

# Frontend (root or apps/web)
pnpm install
pnpm dev:web                                   # localhost:3000
```

## Commands

| Action | Command |
|---|---|
| Frontend dev | `pnpm --filter @ccos/web dev` (alias: `pnpm dev:web`) |
| Frontend lint | `pnpm --filter @ccos/web lint` (eslint, no typecheck script exists) |
| Frontend build | `pnpm build:web` |
| Backend lint | `cd apps/api && uv run ruff check .` |
| Backend format | `cd apps/api && uv run ruff format .` |
| Backend test (none exist) | `cd apps/api && uv run pytest` |
| Backend migration | `cd apps/api && uv run alembic upgrade head` |
| Docker full stack | `docker compose up -d` |
| Celery worker | `cd apps/api && uv run celery -A app.worker.celery_app worker --loglevel=info` |
| Celery beat | `cd apps/api && uv run celery -A app.worker.celery_app beat --loglevel=info` |

## Quirks & gotchas

- **Postgres on host :5433** (container maps :5433→:5432). Use `POSTGRES_USER/PASSWORD/DB=ccos`.
- **`pnpm verifyDepsBeforeRun: false`** — set in `pnpm-workspace.yaml` and `.npmrc` because pnpm 11's pre-run install check aborts on the native-build approval gate.
- **Docker web build** sets `NEXT_ISOLATED_BUILD=1` — this tells `next.config.ts` to skip looking for a monorepo root above `apps/web/`.
- **Settings cached at import time** via `@lru_cache` — reload the server to pick up `.env` changes.
- **`get_db` dependency** in `database.py` guards `commit()`/`rollback()` with `session.is_active` checks, but does not use `session.begin()`. Be careful not to double-commit when adding transaction logic.
- **Celery tasks create their own engine/session** — each task calls `create_async_engine()` and disposes it in `finally`. Do not reuse the app's global engine from sync worker context.
- **Python 3.12 only** — enforced by `.python-version` and `pyproject.toml`.
- **`ruff` ignores B008** — FastAPI idiomatically uses `Depends()`/`Query()` as function defaults, which B008 would flag.

## Design conventions

- **UUID PKs** on every entity.
- **Soft delete** everywhere (`deleted_at` column in `base.py`; `crud.py` sets `deleted_at=func.now()` instead of deleting). **No cascade soft delete** — `crud.remove()` handles this via explicit recursion for Campaign → CampaignInfluencer → Deliverable/Post/Metric/Insight.
- **Generic metric table** — all measurements stored in `Metric` (name/value/source/scope). No per-entity metric columns.
- **Manual overrides always win** — `source=manual` metrics take precedence over `source=instagram` or `source=calculated` in the metric engine.
- **`source` field** tracks origin: `manual`, `instagram`, `youtube`, `calculated`, etc.
- **Two engagement rates** — `engagement_rate` (÷ followers) and `engagement_rate_reach` (÷ views). Both include shares in numerator (Instagram API omits shares).
- **Derived metrics** (ER, CPV, CPM, CPA, ROAS) stored as `source=calculated`, upserted in place.

## Known bugs (check before editing)

Still outstanding from the audit (not yet fixed):
- Uncaught promise rejections on delete handlers (3 locations in `apps/web/src/app/`)
- Instagram login error swallowed (`apps/api/app/services/instagram.py:188-207`)
- `undefined as T` in `api.ts:56` on 204 responses
- Empty-string filters stripped from query params (`apps/web/src/lib/api.ts:61-62`)
- Stale Celery engine sessions (`apps/api/app/tasks.py`)

## Existing instruction files

- `apps/web/AGENTS.md` — Next.js version note (17 bytes, stub only).
- `apps/web/CLAUDE.md` — Behavioral guidelines (generic, not repo-specific).
- `PRODUCT.md` — Full product spec, roadmap, running decisions log.
