"""Excel report generation for a campaign.

Produces a readable workbook mapped to the columns marketing teams
already use, so adopting CCOS doesn't force abandoning their spreadsheet
workflow (see REQUIREMENT_DOC "Reports").
"""

import io
import uuid
from collections import defaultdict
from decimal import Decimal

from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Campaign,
    CampaignInfluencer,
    Deliverable,
    Influencer,
    Metric,
    Post,
)

# Insight metrics surfaced as columns in the summary / posts sheets.
KEY_METRICS = [
    "likes",
    "comments",
    "views",
    "engagement_rate",
    "engagement_rate_reach",
]

HEADER_FONT = Font(bold=True)


def _num(value: Decimal | None) -> float | None:
    return float(value) if value is not None else None


def _write_header(ws: Worksheet, headers: list[str]) -> None:
    ws.append(headers)
    for cell in ws[1]:
        cell.font = HEADER_FONT


def _autosize(ws: Worksheet) -> None:
    for col in ws.columns:
        width = max((len(str(c.value)) for c in col if c.value is not None), default=10)
        ws.column_dimensions[get_column_letter(col[0].column)].width = min(
            width + 2, 60
        )


def _aggregate(values: list[float], metric_name: str) -> float:
    """Rates average; everything else sums."""
    if not values:
        return 0.0
    if metric_name.endswith("_rate"):
        return round(sum(values) / len(values), 4)
    return round(sum(values), 4)


async def build_campaign_report(
    db: AsyncSession, campaign_id: uuid.UUID
) -> tuple[io.BytesIO, str] | None:
    """Return (xlsx bytes, filename) for the campaign, or None if not found."""
    campaign = await db.scalar(
        select(Campaign).where(
            Campaign.id == campaign_id, Campaign.deleted_at.is_(None)
        )
    )
    if campaign is None:
        return None

    cis = list(
        await db.scalars(
            select(CampaignInfluencer).where(
                CampaignInfluencer.campaign_id == campaign_id,
                CampaignInfluencer.deleted_at.is_(None),
            )
        )
    )
    ci_ids = [ci.id for ci in cis]
    inf_ids = [ci.influencer_id for ci in cis]

    influencers = {
        i.id: i
        for i in await db.scalars(
            select(Influencer).where(Influencer.id.in_(inf_ids or [uuid.uuid4()]))
        )
    }
    deliverables = list(
        await db.scalars(
            select(Deliverable).where(
                Deliverable.campaign_influencer_id.in_(ci_ids or [uuid.uuid4()]),
                Deliverable.deleted_at.is_(None),
            )
        )
    )
    posts = list(
        await db.scalars(
            select(Post).where(
                Post.campaign_influencer_id.in_(ci_ids or [uuid.uuid4()]),
                Post.deleted_at.is_(None),
            )
        )
    )
    metrics = list(
        await db.scalars(
            select(Metric).where(
                Metric.campaign_influencer_id.in_(ci_ids or [uuid.uuid4()]),
                Metric.deleted_at.is_(None),
            )
        )
    )

    # Index helpers.
    deliv_by_ci: dict[uuid.UUID, list[Deliverable]] = defaultdict(list)
    for d in deliverables:
        deliv_by_ci[d.campaign_influencer_id].append(d)

    posts_by_ci: dict[uuid.UUID, list[Post]] = defaultdict(list)
    for p in posts:
        posts_by_ci[p.campaign_influencer_id].append(p)

    metrics_by_ci: dict[uuid.UUID, list[Metric]] = defaultdict(list)
    metrics_by_post: dict[uuid.UUID, list[Metric]] = defaultdict(list)
    for m in metrics:
        metrics_by_ci[m.campaign_influencer_id].append(m)
        if m.post_id:
            metrics_by_post[m.post_id].append(m)

    wb = Workbook()
    _build_summary_sheet(wb, campaign, cis, influencers, deliv_by_ci, posts_by_ci, metrics_by_ci)
    _build_deliverables_sheet(wb, cis, influencers, deliv_by_ci)
    _build_posts_sheet(wb, cis, influencers, posts_by_ci, metrics_by_post)
    _build_metrics_sheet(wb, cis, influencers, metrics, posts)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    slug = "".join(c if c.isalnum() else "_" for c in campaign.name).strip("_")
    return buf, f"{slug or 'campaign'}_report.xlsx"


def _build_summary_sheet(wb, campaign, cis, influencers, deliv_by_ci, posts_by_ci, metrics_by_ci):
    ws = wb.active
    ws.title = "Summary"

    # Campaign header block.
    ws.append(["Campaign", campaign.name])
    ws.append(["Brand", campaign.brand or ""])
    ws.append(["Objective", campaign.objective or ""])
    ws.append(["Status", campaign.status])
    ws.append(["Budget", _num(campaign.budget)])
    ws.append(
        ["Dates", f"{campaign.start_date or '—'} → {campaign.end_date or '—'}"]
    )
    for row in ws.iter_rows(min_row=1, max_row=6, max_col=1):
        row[0].font = HEADER_FONT
    ws.append([])

    header_row = ws.max_row + 1
    headers = ["Creator", "City", "Category", "Status", "Cost", "Deliverables", "Posts"]
    headers += [m.replace("_", " ").title() for m in KEY_METRICS]
    ws.append(headers)
    for cell in ws[header_row]:
        cell.font = HEADER_FONT

    for ci in cis:
        inf = influencers.get(ci.influencer_id)
        ci_metrics = metrics_by_ci.get(ci.id, [])
        by_name: dict[str, list[float]] = defaultdict(list)
        for m in ci_metrics:
            by_name[m.metric_name].append(float(m.metric_value))
        row = [
            inf.name if inf else "Unknown",
            inf.city if inf else "",
            inf.category if inf else "",
            ci.status,
            _num(ci.cost),
            len(deliv_by_ci.get(ci.id, [])),
            len(posts_by_ci.get(ci.id, [])),
        ]
        row += [_aggregate(by_name.get(m, []), m) for m in KEY_METRICS]
        ws.append(row)

    _autosize(ws)


def _build_deliverables_sheet(wb, cis, influencers, deliv_by_ci):
    ws = wb.create_sheet("Deliverables")
    _write_header(
        ws, ["Creator", "Type", "Quantity", "Due", "Posted", "Status", "Link"]
    )
    ci_by_id = {ci.id: ci for ci in cis}
    for ci_id, items in deliv_by_ci.items():
        inf = influencers.get(ci_by_id[ci_id].influencer_id) if ci_id in ci_by_id else None
        for d in items:
            ws.append(
                [
                    inf.name if inf else "Unknown",
                    d.type,
                    d.quantity,
                    str(d.due_date) if d.due_date else "",
                    str(d.posted_date) if d.posted_date else "",
                    d.status,
                    d.link or "",
                ]
            )
    _autosize(ws)


def _build_posts_sheet(wb, cis, influencers, posts_by_ci, metrics_by_post):
    ws = wb.create_sheet("Posts")
    # Collect all metric names present on posts (key metrics first).
    extra = sorted(
        {
            m.metric_name
            for ms in metrics_by_post.values()
            for m in ms
            if m.metric_name not in KEY_METRICS
        }
    )
    metric_cols = KEY_METRICS + extra
    _write_header(
        ws,
        ["Creator", "Platform", "URL", "Posted at"]
        + [m.replace("_", " ").title() for m in metric_cols],
    )
    ci_by_id = {ci.id: ci for ci in cis}
    for ci_id, items in posts_by_ci.items():
        inf = influencers.get(ci_by_id[ci_id].influencer_id) if ci_id in ci_by_id else None
        for p in items:
            latest: dict[str, float] = {}
            for m in metrics_by_post.get(p.id, []):
                latest[m.metric_name] = float(m.metric_value)
            ws.append(
                [
                    inf.name if inf else "Unknown",
                    p.platform,
                    p.url,
                    str(p.posted_at) if p.posted_at else "",
                ]
                + [latest.get(m, "") for m in metric_cols]
            )
    _autosize(ws)


def _build_metrics_sheet(wb, cis, influencers, metrics, posts):
    ws = wb.create_sheet("Metrics")
    _write_header(
        ws, ["Creator", "Post URL", "Metric", "Value", "Source", "Captured at"]
    )
    ci_by_id = {ci.id: ci for ci in cis}
    post_url = {p.id: p.url for p in posts}
    for m in metrics:
        ci = ci_by_id.get(m.campaign_influencer_id)
        inf = influencers.get(ci.influencer_id) if ci else None
        ws.append(
            [
                inf.name if inf else "Unknown",
                post_url.get(m.post_id, "") if m.post_id else "",
                m.metric_name,
                float(m.metric_value),
                m.source,
                str(m.captured_at) if m.captured_at else "",
            ]
        )
    _autosize(ws)
