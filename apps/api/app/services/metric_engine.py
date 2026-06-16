"""Derived-metric engine (REQUIREMENT_DOC Phase 2).

Computes KPIs from manually-entered or collected metrics and stores them
back as ``source = calculated`` rows. Manual overrides always win: if a
non-calculated metric with the same name already exists for the
campaign-influencer, the engine leaves it alone.

Formulas:
    engagement_rate = (avg likes + avg comments) / followers * 100
    cpv             = cost / views
    cpm             = cost * 1000 / impressions
    cpa             = cost / acquisitions
    roas            = revenue / cost
"""

import uuid
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CampaignInfluencer, Metric
from app.models.enums import MetricSource

DERIVED_NAMES = ["engagement_rate", "cpv", "cpm", "cpa", "roas"]

# Metrics that count as conversions for CPA.
ACQUISITION_NAMES = ["installs", "leads", "bookings", "purchases", "acquisitions"]


def _mean(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def compute_derived(
    *,
    cost: float | None,
    followers: float | None,
    avg_likes: float | None,
    avg_comments: float | None,
    views: float | None,
    impressions: float | None,
    acquisitions: float | None,
    revenue: float | None,
) -> dict[str, float]:
    """Return derived metrics that have sufficient, non-zero inputs."""
    out: dict[str, float] = {}

    if followers and (avg_likes is not None or avg_comments is not None):
        out["engagement_rate"] = round(
            ((avg_likes or 0) + (avg_comments or 0)) / followers * 100, 4
        )
    if cost is not None and views:
        out["cpv"] = round(cost / views, 4)
    if cost is not None and impressions:
        out["cpm"] = round(cost * 1000 / impressions, 4)
    if cost is not None and acquisitions:
        out["cpa"] = round(cost / acquisitions, 4)
    if cost and revenue is not None:
        out["roas"] = round(revenue / cost, 4)

    return out


async def recompute_for_ci(
    db: AsyncSession, ci: CampaignInfluencer
) -> list[Metric]:
    """Recompute derived metrics for one campaign-influencer.

    Returns the calculated Metric rows that were created or updated
    (skipping any derived name that a manual entry already owns).
    """
    metrics = list(
        await db.scalars(
            select(Metric).where(
                Metric.campaign_influencer_id == ci.id,
                Metric.deleted_at.is_(None),
            )
        )
    )

    by_name: dict[str, list[Metric]] = defaultdict(list)
    for m in metrics:
        by_name[m.metric_name].append(m)

    def values(name: str) -> list[float]:
        return [float(m.metric_value) for m in by_name.get(name, [])]

    def total(name: str) -> float | None:
        vals = values(name)
        return sum(vals) if vals else None

    def latest(name: str) -> float | None:
        rows = by_name.get(name, [])
        if not rows:
            return None
        newest = max(rows, key=lambda m: m.captured_at)
        return float(newest.metric_value)

    acquisitions = sum((total(n) or 0) for n in ACQUISITION_NAMES) or None

    computed = compute_derived(
        cost=float(ci.cost) if ci.cost is not None else None,
        followers=latest("followers"),
        avg_likes=_mean(values("likes")),
        avg_comments=_mean(values("comments")),
        views=total("views"),
        impressions=total("impressions"),
        acquisitions=acquisitions,
        revenue=total("revenue"),
    )

    # Names a human already owns — manual overrides win, so skip them.
    manual_owned = {
        name
        for name, rows in by_name.items()
        if any(m.source != MetricSource.CALCULATED for m in rows)
    }

    existing_calc = {
        m.metric_name: m
        for m in metrics
        if m.source == MetricSource.CALCULATED and m.post_id is None
    }

    written: list[Metric] = []
    for name, value in computed.items():
        if name in manual_owned:
            continue
        row = existing_calc.get(name)
        if row is not None:
            row.metric_value = Decimal(str(value))
        else:
            row = Metric(
                campaign_influencer_id=ci.id,
                post_id=None,
                metric_name=name,
                metric_value=Decimal(str(value)),
                source=MetricSource.CALCULATED,
            )
            db.add(row)
        written.append(row)

    await db.flush()
    for row in written:
        await db.refresh(row)
    return written


async def recompute_for_ci_id(
    db: AsyncSession, ci_id: uuid.UUID
) -> list[Metric] | None:
    ci = await db.scalar(
        select(CampaignInfluencer).where(
            CampaignInfluencer.id == ci_id,
            CampaignInfluencer.deleted_at.is_(None),
        )
    )
    if ci is None:
        return None
    return await recompute_for_ci(db, ci)


async def recompute_for_campaign(
    db: AsyncSession, campaign_id: uuid.UUID
) -> list[Metric]:
    cis = list(
        await db.scalars(
            select(CampaignInfluencer).where(
                CampaignInfluencer.campaign_id == campaign_id,
                CampaignInfluencer.deleted_at.is_(None),
            )
        )
    )
    written: list[Metric] = []
    for ci in cis:
        written.extend(await recompute_for_ci(db, ci))
    return written
