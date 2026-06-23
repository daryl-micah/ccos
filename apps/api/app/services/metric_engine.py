"""Derived-metric engine (PRODUCT.md Phase 2).

Computes KPIs from manually-entered or collected metrics and stores them
back as ``source = calculated`` rows. Manual overrides always win: if a
non-calculated metric with the same name already exists for the
campaign-influencer, the engine leaves it alone.

Formulas:
    engagement_rate = (avg likes + avg comments + avg shares) / followers * 100
    cpv             = cost / views
    cpm             = cost * 1000 / impressions
    cpa             = cost / acquisitions
    roas            = revenue / cost
"""

import uuid
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CampaignInfluencer, Metric, Post
from app.models.enums import MetricSource

DERIVED_NAMES = ["engagement_rate", "cpv", "cpm", "cpa", "roas"]

# Metrics that count as conversions for CPA.
ACQUISITION_NAMES = ["installs", "leads", "bookings", "purchases", "acquisitions"]

# A post's total engagement. Instagram's API omits shares, so the user enters
# them manually; reach-ER folds them in once they're present.
POST_ENGAGEMENT_COMPONENTS = ("likes", "comments", "shares")


def _mean(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def compute_derived(
    *,
    cost: float | None,
    followers: float | None,
    avg_likes: float | None,
    avg_comments: float | None,
    avg_shares: float | None,
    views: float | None,
    impressions: float | None,
    acquisitions: float | None,
    revenue: float | None,
) -> dict[str, float]:
    """Return derived metrics that have sufficient, non-zero inputs."""
    out: dict[str, float] = {}

    if followers and (
        avg_likes is not None or avg_comments is not None or avg_shares is not None
    ):
        out["engagement_rate"] = round(
            ((avg_likes or 0) + (avg_comments or 0) + (avg_shares or 0))
            / followers
            * 100,
            4,
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


async def recompute_post_engagement(
    db: AsyncSession, post_id: uuid.UUID
) -> dict[str, Metric]:
    """Recompute a post's engagement rates, folding in manual shares.

        engagement            = likes + comments + shares
        engagement_rate       = engagement / followers * 100
        engagement_rate_reach = engagement / views     * 100

    Instagram's API omits shares, so the user enters them manually; both rates
    fold them in once present. Each rate is kept as a single
    ``source=calculated`` row per post (a manual override of that rate always
    wins). Returns the authoritative rate rows keyed by name; a rate is absent
    when its denominator (followers / views) is unavailable.
    """
    rows = list(
        await db.scalars(
            select(Metric).where(
                Metric.post_id == post_id,
                Metric.deleted_at.is_(None),
            )
        )
    )

    def latest(name: str) -> float | None:
        candidates = [m for m in rows if m.metric_name == name]
        if not candidates:
            return None
        manual = [m for m in candidates if m.source == MetricSource.MANUAL]
        newest = max(manual or candidates, key=lambda m: m.captured_at)
        return float(newest.metric_value)

    engagement = sum((latest(n) or 0) for n in POST_ENGAGEMENT_COMPONENTS)

    post = await db.get(Post, post_id)
    ci = (
        await db.get(CampaignInfluencer, post.campaign_influencer_id)
        if post
        else None
    )
    followers = (
        await _latest_influencer_followers(db, ci.influencer_id) if ci else None
    )

    # Each rate and the denominator it divides total engagement by.
    denominators = {
        "engagement_rate": followers,
        "engagement_rate_reach": latest("views"),
    }

    result: dict[str, Metric] = {}
    for name, denom in denominators.items():
        existing = [m for m in rows if m.metric_name == name]
        manual_override = next(
            (m for m in existing if m.source == MetricSource.MANUAL), None
        )
        if manual_override is not None:
            # Manual entry always wins; clear any stale derived row beside it.
            for m in existing:
                if m is not manual_override:
                    m.deleted_at = func.now()
            result[name] = manual_override
            continue

        # Supersede the prior derived/collected row (single source of truth).
        for m in existing:
            m.deleted_at = func.now()
        if not denom:
            continue  # no followers / views to divide by

        row = Metric(
            campaign_influencer_id=post.campaign_influencer_id if post else None,
            post_id=post_id,
            metric_name=name,
            metric_value=Decimal(str(round(engagement / denom * 100, 4))),
            source=MetricSource.CALCULATED,
        )
        db.add(row)
        result[name] = row

    await db.flush()
    for row in result.values():
        await db.refresh(row)
    return result


async def _latest_influencer_followers(
    db: AsyncSession, influencer_id: uuid.UUID
) -> float | None:
    """Most recent follower count recorded against the influencer profile."""
    row = await db.scalar(
        select(Metric)
        .where(
            Metric.influencer_id == influencer_id,
            Metric.metric_name == "followers",
            Metric.deleted_at.is_(None),
        )
        .order_by(Metric.captured_at.desc())
        .limit(1)
    )
    return float(row.metric_value) if row is not None else None


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

    # Followers live on the influencer (campaign-agnostic), so they rarely
    # appear among this CI's metrics. Fall back to the influencer's latest.
    followers = latest("followers")
    if followers is None:
        followers = await _latest_influencer_followers(db, ci.influencer_id)

    computed = compute_derived(
        cost=float(ci.cost) if ci.cost is not None else None,
        followers=followers,
        avg_likes=_mean(values("likes")),
        avg_comments=_mean(values("comments")),
        avg_shares=_mean(values("shares")),
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
