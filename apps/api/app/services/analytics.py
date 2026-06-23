"""Cross-campaign analytics (PRODUCT.md Phase 6).

Answers: which creators / cities / categories perform best, lowest CPV,
highest ROAS, best campaign, and repeat-collaboration candidates.

Aggregations run in Python over the (small) working set. Per
campaign-influencer we derive spend, revenue, views and a resolved
engagement_rate (manual overrides win), then roll those up by creator,
city, category and campaign.
"""

from collections import defaultdict
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Campaign, CampaignInfluencer, Influencer, Metric
from app.models.enums import MetricSource


@dataclass
class _CiStats:
    spend: float = 0.0
    revenue: float = 0.0
    views: float = 0.0
    engagement_rate: float | None = None
    campaign_id: str = ""
    influencer_id: str = ""


def _roas(spend: float, revenue: float) -> float | None:
    return round(revenue / spend, 4) if spend > 0 else None


def _cpv(spend: float, views: float) -> float | None:
    return round(spend / views, 4) if views > 0 else None


def _avg(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 4) if values else None


async def _ci_stats(db: AsyncSession) -> tuple[
    dict, dict[str, Influencer], dict[str, Campaign], dict[str, _CiStats]
]:
    cis = list(
        await db.scalars(
            select(CampaignInfluencer).where(
                CampaignInfluencer.deleted_at.is_(None)
            )
        )
    )
    influencers = {
        str(i.id): i
        for i in await db.scalars(
            select(Influencer).where(Influencer.deleted_at.is_(None))
        )
    }
    campaigns = {
        str(c.id): c
        for c in await db.scalars(
            select(Campaign).where(Campaign.deleted_at.is_(None))
        )
    }
    metrics = list(
        await db.scalars(select(Metric).where(Metric.deleted_at.is_(None)))
    )

    by_ci_name: dict[str, dict[str, list[Metric]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for m in metrics:
        by_ci_name[str(m.campaign_influencer_id)][m.metric_name].append(m)

    def resolved_rate(rows: list[Metric]) -> float | None:
        if not rows:
            return None
        manual = [m for m in rows if m.source != MetricSource.CALCULATED]
        pool = manual or rows
        return _avg([float(m.metric_value) for m in pool])

    stats: dict[str, _CiStats] = {}
    for ci in cis:
        names = by_ci_name.get(str(ci.id), {})
        stats[str(ci.id)] = _CiStats(
            spend=float(ci.cost) if ci.cost is not None else 0.0,
            revenue=sum(float(m.metric_value) for m in names.get("revenue", [])),
            views=sum(float(m.metric_value) for m in names.get("views", [])),
            engagement_rate=resolved_rate(names.get("engagement_rate", [])),
            campaign_id=str(ci.campaign_id),
            influencer_id=str(ci.influencer_id),
        )
    return cis, influencers, campaigns, stats


@dataclass
class _Agg:
    spend: float = 0.0
    revenue: float = 0.0
    views: float = 0.0
    posts: int = 0
    campaigns: set = field(default_factory=set)
    influencers: set = field(default_factory=set)
    rates: list = field(default_factory=list)


async def creator_rankings(db: AsyncSession) -> list[dict]:
    cis, influencers, _campaigns, stats = await _ci_stats(db)
    agg: dict[str, _Agg] = defaultdict(_Agg)
    for ci in cis:
        s = stats[str(ci.id)]
        a = agg[s.influencer_id]
        a.spend += s.spend
        a.revenue += s.revenue
        a.views += s.views
        a.campaigns.add(s.campaign_id)
        if s.engagement_rate is not None:
            a.rates.append(s.engagement_rate)

    rows = []
    for inf_id, a in agg.items():
        inf = influencers.get(inf_id)
        rows.append(
            {
                "influencer_id": inf_id,
                "name": inf.name if inf else "Unknown",
                "city": inf.city if inf else None,
                "category": inf.category if inf else None,
                "campaigns": len(a.campaigns),
                "spend": round(a.spend, 2),
                "revenue": round(a.revenue, 2),
                "roas": _roas(a.spend, a.revenue),
                "cpv": _cpv(a.spend, a.views),
                "avg_engagement_rate": _avg(a.rates),
                "repeat_candidate": len(a.campaigns) > 1
                and (_roas(a.spend, a.revenue) or 0) >= 1,
            }
        )
    rows.sort(key=lambda r: (r["roas"] is not None, r["roas"] or 0), reverse=True)
    return rows


async def _group_by(db: AsyncSession, key: str) -> list[dict]:
    cis, influencers, _campaigns, stats = await _ci_stats(db)
    agg: dict[str, _Agg] = defaultdict(_Agg)
    for ci in cis:
        s = stats[str(ci.id)]
        inf = influencers.get(s.influencer_id)
        bucket = (getattr(inf, key) if inf else None) or "Unknown"
        a = agg[bucket]
        a.spend += s.spend
        a.revenue += s.revenue
        a.views += s.views
        a.influencers.add(s.influencer_id)
        if s.engagement_rate is not None:
            a.rates.append(s.engagement_rate)

    rows = [
        {
            key: bucket,
            "creators": len(a.influencers),
            "spend": round(a.spend, 2),
            "revenue": round(a.revenue, 2),
            "roas": _roas(a.spend, a.revenue),
            "cpv": _cpv(a.spend, a.views),
            "avg_engagement_rate": _avg(a.rates),
        }
        for bucket, a in agg.items()
    ]
    rows.sort(key=lambda r: (r["roas"] is not None, r["roas"] or 0), reverse=True)
    return rows


async def city_rankings(db: AsyncSession) -> list[dict]:
    return await _group_by(db, "city")


async def category_rankings(db: AsyncSession) -> list[dict]:
    return await _group_by(db, "category")


async def campaign_rankings(db: AsyncSession) -> list[dict]:
    cis, _influencers, campaigns, stats = await _ci_stats(db)
    agg: dict[str, _Agg] = defaultdict(_Agg)
    for ci in cis:
        s = stats[str(ci.id)]
        a = agg[s.campaign_id]
        a.spend += s.spend
        a.revenue += s.revenue
        a.views += s.views
        a.influencers.add(s.influencer_id)
        if s.engagement_rate is not None:
            a.rates.append(s.engagement_rate)

    rows = []
    for camp_id, a in agg.items():
        c = campaigns.get(camp_id)
        rows.append(
            {
                "campaign_id": camp_id,
                "name": c.name if c else "Unknown",
                "status": c.status if c else None,
                "creators": len(a.influencers),
                "spend": round(a.spend, 2),
                "revenue": round(a.revenue, 2),
                "roas": _roas(a.spend, a.revenue),
                "avg_engagement_rate": _avg(a.rates),
            }
        )
    rows.sort(key=lambda r: (r["roas"] is not None, r["roas"] or 0), reverse=True)
    return rows
