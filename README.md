# CCOS — Creator Campaign Operating System

A campaign-centric influencer CRM that replaces the tangle of Google Sheets,
scattered notes, and manual reports that marketing teams use to run creator
campaigns. CCOS keeps campaigns, creators, deliverables, and performance data
in one place — and turns the history into cross-campaign intelligence.

> **Manual-first by design.** Every field can be typed in by hand; the
> Instagram, metric-engine, and AI modules only *enhance* the workflow. The
> product never depends on a third-party API being reachable.

For the full product spec, roadmap, and the running decisions log, see
[PRODUCT.md](PRODUCT.md).

---

## What it does

CCOS is built around three jobs: **Campaign Operations**, an **Influencer CRM**,
and **Performance Intelligence** — with automation layered on top.

### Campaign operations

- **Campaigns** — create and edit marketing initiatives with brand, objective,
  budget, status (Draft / Active / Completed), dates, and notes.
- **Per-campaign roster** — add creators to a campaign with cost, deliverables,
  status (Planned → Negotiating → Confirmed → Posted → Completed), and remarks.
- **"Closed by" attribution** — each creator on a campaign is tagged with the
  **agency** that sourced them (or in-house). Attribution is recorded *per
  campaign*, because an agency's roster changes from one campaign to the next.
- **Agency roster import** — drop in the Excel a talent agency sends for a
  campaign (name / contact / handle). CCOS matches each row to a master creator
  by handle then name, auto-creates anyone new, and links them to the campaign
  under that agency. Idempotent — re-importing skips creators already on the
  campaign.
- **Deliverables** — track content commitments (Reel, Story, Carousel, YouTube
  Short / Video) with quantity, due/posted dates, status, and link. A
  deliverable auto-completes when its live post goes live.

### Influencer CRM

- **Master creator records** — one record per creator (handles, city, country,
  category, language, manager, contact), reused across every campaign.
- **Cross-campaign history** — see every campaign a creator has been part of and
  how they performed, so institutional knowledge accumulates over time.
- **Live post insights** — paste the link to a published post and track its
  real-world numbers (likes, comments, views, engagement rate). Manual entry is
  the baseline; the Instagram collector enriches the same post automatically.
- **Human insights & notes** — record qualitative observations ("strong
  Bangalore audience", "fast approvals") against a creator-in-campaign.

### Performance intelligence

- **Generic, source-attributed metrics** — every number is stored in one
  flexible metric table tagged with its origin (`manual`, `instagram`,
  `youtube`, `calculated`, …). No schema explosion, full transparency, and
  **manual overrides always win**.
- **Derived-metric engine** — auto-computes the KPIs teams care about from the
  entered numbers: **engagement rate**, **CPV**, **CPM**, **CPA**, and **ROAS**,
  stored as `source=calculated` and recomputed in place.
- **Two engagement rates** — `ER (followers)` = engagement ÷ followers (the
  industry standard, always low for mega accounts) and `ER (reach)` =
  engagement ÷ views (for video/reels, comparable to HypeAuditor-style numbers).
  Both fold in manually-entered shares, which Instagram's API omits.
- **Dashboard** — KPI cards (total creators, spend, revenue) and a spend chart
  at a glance.
- **Cross-campaign analytics** — which creators, cities, and categories perform
  best; lowest CPV; highest ROAS; best campaign; and repeat-collaboration
  candidates — surfaced as highlight cards and ranking tables.

### Automation & collectors

- **Instagram module** — connect a session (browser `sessionid` cookie or
  username/password; only the session is persisted, never the password) and
  sync profile stats. Adding an Instagram post link auto-fetches its likes,
  comments, and views.
- **Historical tracking** — a Celery beat job snapshots Instagram profiles
  daily; an influencer's growth-over-time chart is driven by a trends endpoint.
- **AI layer (Groq)** — natural-language insights and budget recommendations
  ("ROAS consistently above campaign average", "shift budget toward Bangalore").
  Powered by Groq; disabled with a clear message when no API key is set.

### Spreadsheet bridge (import / export)

Teams keep their existing sheets and adopt CCOS in parallel — no migration cliff.

- **Import** — bulk-create influencers from CSV/Excel with header aliasing, plus
  the agency roster import described above.
- **Export** — readable `.xlsx` workbooks that mirror the columns teams already
  use:
  - **POA – Supply** (primary) — one row per live post, matching the marketing
    team's master tracker layout.
  - **Full campaign workbook** — Summary, Deliverables, Posts, and Metrics
    sheets.
  - **Per-campaign creators** and **per-campaign posts** extracts.
  - **Campaigns tracker** — one row per campaign with the aggregated funnel.

---

## Screens

| Route | What's there |
| --- | --- |
| `/` | Dashboard — KPI cards + spend chart |
| `/campaigns` | Campaign list + create; Tracker export |
| `/campaigns/[id]` | Campaign detail — creator roster, "closed by", exports |
| `/campaigns/[id]/creators/[ciId]` | Creator-in-campaign — deliverables, live posts, per-post metrics, derived KPIs |
| `/influencers` | Creator list + create + CSV/Excel import |
| `/influencers/[id]` | Creator detail — cross-campaign history, Instagram, growth chart |
| `/analytics` | Cross-campaign analytics + AI insights |

---

## Tech stack

- **Frontend** — Next.js (App Router) · TypeScript · Tailwind v4 · TanStack
  Table · Recharts
- **Backend** — FastAPI · async SQLAlchemy 2.0 + asyncpg · Pydantic · Alembic
- **Data** — PostgreSQL (UUID PKs, soft delete) · Redis
- **Background jobs** — Celery worker + beat (daily snapshots, recompute)
- **Collectors** — Instagram via `instagrapi`
- **AI** — Groq (`llama-3.3-70b-versatile` by default)

---

## Monorepo layout

```
apps/
  web/   Next.js frontend (TypeScript, Tailwind, TanStack Table, Recharts)
  api/   FastAPI backend — models, CRUD, services, and the Celery worker/beat
docker-compose.yml   Postgres + Redis + api + web + worker + beat
PRODUCT.md           Product spec, roadmap, and decisions log
```

---

## Prerequisites

- Node 20+ and pnpm 11+
- Python 3.12 (managed via [`uv`](https://docs.astral.sh/uv/))
- Docker (for local Postgres + Redis)

## Quick start (local dev)

```bash
# 1. Start infra (Postgres on host :5433, Redis on :6379)
docker compose up -d postgres redis

# 2. Backend
cd apps/api
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
# API + interactive docs at http://localhost:8000/docs

# 3. Frontend (from the repo root, in another terminal)
pnpm install
pnpm dev:web
# App at http://localhost:3000
```

Background jobs (Instagram snapshots, recompute) — optional in dev:

```bash
cd apps/api
uv run celery -A app.worker.celery_app worker --loglevel=info   # processes jobs
uv run celery -A app.worker.celery_app beat   --loglevel=info   # daily schedule
```

### Configuration

- **Backend** — copy `apps/api/.env.example` to `.env`. Set `GROQ_API_KEY` to
  enable the AI layer (it degrades gracefully without one). Instagram is
  connected at runtime via the Connect flow.
- **Frontend** — `NEXT_PUBLIC_API_URL` points the web app at the API
  (defaults to the local backend).

## Run everything with Docker

```bash
docker compose up -d   # postgres + redis + api + web + worker + beat
# Web → http://localhost:3000   API → http://localhost:8000/docs
```

---

## Project status

Phases 1–8 of the roadmap are built: spreadsheet replacement, the metric
engine, the Instagram module, historical tracking, analytics, Excel reports,
and the Groq-powered AI layer. The YouTube collector and deeper Google Sheets
sync remain on the roadmap. See [PRODUCT.md](PRODUCT.md) for the full phased
plan and the dated decisions log.
