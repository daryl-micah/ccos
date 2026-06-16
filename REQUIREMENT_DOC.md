# Creator Campaign Operating System (CCOS)

## Project Vision

Build a campaign-centric creator management platform that replaces spreadsheets used by marketing teams.

The platform enables companies to:

* Organize influencer campaigns.
* Track creator relationships.
* Store campaign metrics.
* Combine automatic social insights with manual data entry.
* Generate reports and historical intelligence.
* Build institutional knowledge around creators.

---

# Problem Statement

Current workflow:

```text
Google Sheets
↓
Manual metrics
↓
Scattered notes
↓
No history
↓
Difficult reporting
```

Problems:

* Campaign data scattered across sheets.
* Duplicate work.
* No creator history.
* No metric standardization.
* No derived KPI calculations.
* No cross-campaign insights.
* Difficult collaboration.

---

# Product Scope

This is NOT an influencer discovery platform.

This is NOT a HypeAuditor alternative.

Automatic social insights are only one module.

Primary focus:

> Campaign Operations + Influencer CRM + Performance Intelligence.

---

# Target Users

## Marketing Manager

Responsible for:

* Campaign execution
* Budget tracking
* Reporting

---

## Influencer Marketing Team

Responsible for:

* Managing creators
* Recording insights
* Deliverable tracking

---

## Product Companies

Examples:

* Pronto
* Consumer brands
* D2C startups
* Hyperlocal service businesses

---

# High-Level Architecture

```text
Frontend (Next.js)
        ↓
FastAPI Backend
        ↓
PostgreSQL
        ↓
Redis
        ↓
Celery Workers
        ↓
Instagram + YouTube collectors
```

---

# Tech Stack

## Frontend

### Next.js

Reason:

* Excellent Codex support.
* Server actions.
* Easy deployment.

---

### TypeScript

Reason:

Strong typing and maintainability.

---

### TailwindCSS

Reason:

Fast UI development.

---

### Shadcn UI

Reason:

Composable components.

---

### TanStack Table

Reason:

Spreadsheet-like tables.

---

### Recharts

Reason:

Analytics and charts.

---

## Backend

### FastAPI

Reason:

* Excellent with Codex.
* Typed APIs.
* Async support.
* Pydantic models.

---

### SQLAlchemy

ORM layer.

---

### Alembic

Database migrations.

---

## Database

### PostgreSQL

Reason:

Relational structure fits campaigns and metrics.

---

## Cache

### Redis

Used for:

* Celery queue
* Session cache
* Job status

---

## Background Processing

### Celery

Responsible for:

* Daily metric collection.
* Historical snapshots.
* Data refresh jobs.

---

## Authentication

### Better Auth

Reason:

Modern TypeScript-first auth.

---

## Deployment

Frontend:

* Vercel

Backend:

* Railway

Database:

* Neon Postgres

Redis:

* Upstash

---

# Core Design Principles

## Campaign-Centric

Campaigns are first-class entities.

Everything belongs to campaigns.

---

## Manual First

The platform should never depend on APIs.

Users can enter everything manually.

Automation only enhances workflows.

---

## Flexible Metrics

Avoid adding hundreds of columns.

Metrics should be extensible.

---

## Historical Intelligence

Data should accumulate over time.

History becomes the moat.

---

# Entity Model

---

# Campaign

Represents a marketing initiative.

Examples:

* Bangalore Launch
* Summer Campaign
* House Help Expansion

Fields:

```yaml
id
name
brand
objective
budget
status
start_date
end_date
notes
```

Status:

* Draft
* Active
* Completed

---

# Influencer

Master creator record.

Fields:

```yaml
id
name
instagram_username
youtube_channel
city
country
category
language
manager_name
email
phone
notes
```

Examples:

Categories:

* Tech
* Lifestyle
* Fitness
* Parenting

---

# CampaignInfluencer

Joins campaigns and influencers.

Fields:

```yaml
campaign_id
influencer_id
cost
deliverables
status
remarks
```

Status:

* Planned
* Negotiating
* Confirmed
* Posted
* Completed

---

# Deliverable

Represents content commitments.

Fields:

```yaml
campaign_influencer_id
type
quantity
due_date
posted_date
status
link
```

Types:

* Reel
* Story
* Carousel
* YouTube Short
* YouTube Video

---

# Post (Live Post Insights)

Once a campaign goes live, users paste the link to the actual published
post and record its real-world performance.

A Post represents one published piece of content tied to a deliverable.
Users enter the live link and then see/track per-post insight metrics
(likes, comments, engagement rate, etc.).

Fields:

```yaml
id
deliverable_id        # optional — links the live post to its commitment
campaign_influencer_id
url                   # the live post link
platform              # instagram | youtube | other
posted_at
notes
```

Per-post metrics are stored in the generic Metric table, scoped to the
post (see Metric System below). This lets a single deliverable's live
post carry its own likes / comments / views / engagement_rate without
schema changes.

Manual entry is the baseline: a user can paste a link and type in the
numbers. Automated collectors (Phases 3–4) can later enrich the same
post, but manual overrides always win.

---

# Insight

Human observations.

Examples:

```text
Strong Bangalore audience.

Good conversion quality.

Fast approvals.

Should collaborate again.
```

Fields:

```yaml
campaign_influencer_id
note
created_by
created_at
```

---

# Metric System

Use a generic metric table.

Fields:

```yaml
id
campaign_influencer_id
post_id               # optional — set when the metric belongs to a live post
metric_name
metric_value
source
captured_at
```

A metric is scoped to a campaign-influencer by default, or to a specific
live Post when `post_id` is set. This keeps per-post insights (likes,
comments, engagement_rate on an individual published link) in the same
generic table without new columns or tables.

Source:

* manual
* instagram
* youtube
* firebase
* appsflyer
* branch
* calculated

---

# Supported Metrics

## Awareness Metrics

* followers
* views
* reach
* impressions

---

## Engagement Metrics

* likes
* comments
* saves
* shares

---

## Conversion Metrics

* installs
* leads
* bookings
* purchases

---

## Commercial Metrics

* spend
* revenue

---

## Derived Metrics

* engagement_rate
* cpv
* cpm
* cpa
* roas

---

# Phase 1

## Spreadsheet Replacement

Goal:

Replace Google Sheets.

Features:

### Campaigns

CRUD operations.

---

### Influencers

Master creator database.

---

### Deliverables

Track content commitments.

---

### Manual Metric Entry

Users can add:

* views
* reach
* installs
* bookings
* revenue

---

### Notes

Campaign learnings.

---

### Live Post Insights

Users paste the link of a live post (the result of a campaign) and
record its insight metrics manually:

* likes
* comments
* views
* engagement_rate

Metrics are tied to the specific post so a campaign's actual published
content can be tracked, not just the deliverable commitment.

---

### CSV / Excel Import + Export

* Import existing campaign / influencer / metric data from CSV or Excel.
* Export reports back out to Excel.

Removes the migration barrier — teams keep their sheets and adopt CCOS
in parallel.

---

### Dashboard

Show:

* total influencers
* spend
* revenue
* campaign KPIs

---

# Phase 2

## Metric Engine

Goal:

Automatic KPI calculations.

Derived metrics:

### Engagement Rate

Instagram:

```text
(avg likes + avg comments)
÷ followers × 100
```

---

### CPV

```text
cost ÷ views
```

---

### CPM

```text
(cost × 1000)
÷ impressions
```

---

### CPA

```text
cost ÷ acquisitions
```

---

### ROAS

```text
revenue ÷ cost
```

---

# Phase 3

## Instagram Module

Purpose:

Reduce manual effort.

Technology:

Instaloader

Collected:

### Profile

* followers
* following
* post count

---

### Posts

Latest 12–50 posts.

Store:

* likes
* comments
* timestamps
* captions

---

Calculate:

* average likes
* average comments
* posting frequency
* top posts
* engagement rate

Source:

instagram

Manual override should always be allowed.

---

# Phase 4

## YouTube Module

Technology:

YouTube Data API

Collect:

### Channel

* subscribers
* total videos

### Videos

Latest 20–50 videos.

Metrics:

* views
* likes
* comments

Calculate:

* average views
* average likes
* upload frequency
* engagement rate

Source:

youtube

---

# Phase 5

## Historical Tracking

Daily jobs.

Store snapshots.

Example:

```yaml
date
followers
engagement_rate
avg_views
```

Enables:

* trend analysis
* growth charts
* campaign comparisons

---

# Phase 6

## Analytics

Questions answered:

### Which creators perform best?

---

### Which cities perform best?

---

### Which categories perform best?

---

### Lowest CPV?

---

### Highest ROAS?

---

### Best campaign?

---

### Repeat collaboration candidates?

---

# Phase 7

## Reports

Export:

* CSV
* Excel

Generate:

* Campaign summaries
* Creator scorecards
* Monthly reports

Goal:

Keep exported data mapped to a clean, **readable Excel format** that
mirrors the columns teams already use. The point is that adopting CCOS
does not force teams to abandon their existing spreadsheet workflow —
they can always pull a familiar sheet back out.

Suggested workbook layout:

* Campaign summary sheet — one row per influencer, key metrics
* Deliverables sheet
* Posts sheet — live links + per-post insights
* Metrics sheet — raw + derived KPIs

Full migration off spreadsheets is a long-term product vision, not a
near-term requirement.

---

# Phase 8

## AI Layer

Natural language insights.

Examples:

```text
Creator performs well in Bangalore.

Reels outperform stories.

ROAS consistently above campaign average.

Audience quality appears strong.
```

Questions:

* Which creators should we retain?
* Which creators underperformed?
* Which campaign delivered best ROI?
* Which city should receive more budget?

---

# System Decisions

## Use UUIDs Everywhere

Avoid integer IDs.

---

## Soft Delete Records

Never lose campaign history.

---

## Generic Metric Table

Prevents schema explosions.

Allows future integrations.

---

## Background Jobs

All collectors run asynchronously.

Never block user requests.

---

## Source Attribution

Every metric records origin.

Examples:

* manual
* instagram
* youtube
* calculated

This provides transparency.

---

## Manual Overrides Always Win

Human-entered data takes precedence.

---

## API-First Backend

FastAPI should expose REST endpoints.

Allows future:

* mobile app
* integrations
* AI agents

---

# Google Sheets & Excel Integration

Phased rollout so teams never have to abandon their current workflow.

## Integration Phase 1 — CSV / Excel Import + Export

* Import campaign / influencer / metric data from CSV or Excel.
* Export readable Excel reports.
* No live connection — deliberate import/export actions.

(Delivered as part of product Phase 1 + Phase 7.)

## Integration Phase 2 — One-Way Sheet Sync

* Direction: Google Sheet → CCOS dashboard.
* CCOS reads from a linked sheet and populates data.
* Reduces manual data entry.

## Integration Phase 3 — Full Two-Way Sync

* CCOS becomes the source of truth.
* Changes reflect back to Google Sheets.
* Highest complexity — only after the platform is trusted.

---

# Decisions Log

Running log of scope decisions made during development.

## 2026-06-16

* **Live post insights** — Users can paste the link of a live post (the
  result of a campaign) and view/record per-post insight metrics
  (likes, comments, engagement_rate, views). Modeled as a `Post` entity
  with metrics scoped via `post_id` on the generic Metric table. Manual
  entry first; collectors enrich later.
* **Readable Excel export** — Reports must stay mapped to a clean,
  readable Excel format mirroring teams' existing columns, so adopting
  CCOS does not force abandoning the spreadsheet workflow. Full
  migration off spreadsheets is long-term vision only.
* **Google Sheets phasing** — (1) CSV/Excel import-export now,
  (2) one-way Google Sheet → dashboard sync next, (3) full two-way sync
  long term.
* **Backend foundation built** — Monorepo scaffolded (`apps/`, `packages/`,
  `workers/`). FastAPI backend stands up with async SQLAlchemy 2.0 +
  asyncpg, Alembic migrations, and full Phase 1 CRUD for all 7 entities
  (Campaign, Influencer, CampaignInfluencer, Deliverable, Post, Insight,
  Metric). UUID PKs, soft delete, and source-attributed metrics all in
  place. Local Postgres runs on host port **5433** (host 5432 was taken);
  backend pinned to **Python 3.12** via `uv`.
* **Phase 1 frontend built** — Next.js 16 + Tailwind v4 + TanStack Table.
  Dashboard (KPI cards + spend chart), Campaigns (list, create, detail
  with creator roster), Influencers (list, create, cross-campaign detail).
* **Live-post insights UI** — Creator-in-campaign page
  (`/campaigns/[id]/creators/[ciId]`) to manage deliverables, paste live
  post links, and record per-post insight metrics.
* **CSV/Excel import-export shipped** — `GET /export/campaigns/{id}`
  streams a readable .xlsx (Summary, Deliverables, Posts, Metrics sheets,
  insights pivoted to columns); `POST /import/influencers` bulk-loads
  creators from CSV/Excel with header aliasing. (Integration phase 1.)
* **Metric engine shipped (Phase 2)** — engagement_rate, CPV, CPM, CPA,
  ROAS computed from entered metrics, stored as `source=calculated`,
  upserted in place. Manual entries of the same name always win. Recompute
  per campaign-influencer and per campaign; surfaced as a Derived KPIs card.
* **Analytics shipped (Phase 6)** — `/analytics/*` aggregates spend,
  revenue, ROAS, CPV, engagement across campaigns by creator, city,
  category, and campaign; flags repeat-collaboration candidates. Frontend
  Analytics page with highlight cards + ranking tables.
* **Full-stack Docker** — Dockerfiles for backend + frontend and a
  docker-compose that runs db + redis + api + web. (Web image build is
  network-bound on first native-binary pull; verification deferred.)

---

# Development Workflow with Codex

Repository Structure:

```text
apps/
    web/
    api/

packages/
    ui/
    types/
    config/

workers/
    collector/
    metrics/
```

Approach:

1. Build schema first.
2. Generate SQLAlchemy models.
3. Build APIs.
4. Build frontend tables.
5. Add metric engine.
6. Add collectors.
7. Add analytics.

Codex should be used for:

* model generation
* CRUD APIs
* migrations
* table components
* charts
* background jobs

Avoid excessive abstractions.

Prefer:

* explicit models
* simple service layers
* typed DTOs
* modular architecture

---

# Long-Term Vision

Become a Creator Campaign Operating System.

Replacing:

* Google Sheets
* scattered notes
* manual reports

With:

* campaign intelligence
* creator CRM
* historical knowledge
* automated analytics
* AI-assisted decisions

