# CCOS — Creator Campaign Operating System

A campaign-centric influencer CRM that replaces spreadsheets for marketing teams.
See [REQUIREMENT_DOC.md](REQUIREMENT_DOC.md) for full scope and the decisions log.

## Monorepo Layout

```
apps/
  web/        Next.js frontend (TypeScript, Tailwind, shadcn)
  api/        FastAPI backend (SQLAlchemy, Alembic)
packages/
  ui/         shared React components
  types/      shared TypeScript types
  config/     shared config (tsconfig, eslint)
workers/
  collector/  social data collectors (Instagram, YouTube)
  metrics/    metric calculation jobs
```

## Prerequisites

- Node 20+ and pnpm 11+
- Python 3.12 (managed via `uv`)
- Docker (for local Postgres + Redis)

## Quick Start

```bash
# 1. Start infra (Postgres + Redis)
docker compose up -d

# 2. Backend
cd apps/api
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
# API docs at http://localhost:8000/docs

# 3. Frontend (once scaffolded)
pnpm install
pnpm dev:web
```

## Build Order

Per the requirement doc:

1. Schema → 2. SQLAlchemy models → 3. CRUD APIs → 4. Frontend tables →
5. Metric engine → 6. Collectors → 7. Analytics
