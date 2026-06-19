"""Import an agency's per-campaign creator roster.

Agencies send a different Excel of creators (name / contact / handle) for
each campaign. This matches each row to a master influencer (by handle,
then name), creating the influencer if new, then links them to the campaign
tagged with the agency ("closed by"; null = in-house). Idempotent — creators
already on the campaign are skipped.
"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CampaignInfluencer, Influencer
from app.services.imports import parse_influencer_rows


def _norm_handle(value: str | None) -> str:
    return (value or "").lstrip("@").strip("/").split("/")[-1].strip().lower()


async def import_roster(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    agency_id: uuid.UUID | None,
    filename: str,
    content: bytes,
) -> dict:
    rows = parse_influencer_rows(filename, content)

    existing = await db.scalars(
        select(CampaignInfluencer).where(
            CampaignInfluencer.campaign_id == campaign_id,
            CampaignInfluencer.deleted_at.is_(None),
        )
    )
    on_campaign = {ci.influencer_id for ci in existing}

    created: list[Influencer] = []
    linked = 0
    skipped = 0

    for row in rows:
        name = row.get("name")
        handle = _norm_handle(row.get("instagram_username"))

        inf = None
        if handle:
            inf = await db.scalar(
                select(Influencer).where(
                    func.lower(Influencer.instagram_username) == handle,
                    Influencer.deleted_at.is_(None),
                )
            )
        if inf is None and name:
            inf = await db.scalar(
                select(Influencer).where(
                    func.lower(Influencer.name) == name.lower(),
                    Influencer.deleted_at.is_(None),
                )
            )
        if inf is None:
            data = dict(row)
            if handle:
                data["instagram_username"] = handle  # store the clean handle
            inf = Influencer(**data)
            db.add(inf)
            await db.flush()
            created.append(inf)

        if inf.id in on_campaign:
            skipped += 1
            continue

        db.add(
            CampaignInfluencer(
                campaign_id=campaign_id,
                influencer_id=inf.id,
                agency_id=agency_id,
            )
        )
        on_campaign.add(inf.id)
        linked += 1

    await db.flush()
    for inf in created:
        await db.refresh(inf)
    return {"linked": linked, "skipped": skipped, "created_influencers": created}
