import asyncio
import uuid
from collections import defaultdict
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Tenant, get_tenant
from app.core.database import get_db
from app.crud import CRUD
from app.models import Influencer, Metric
from app.schemas.influencer import InfluencerCreate, InfluencerOut, InfluencerUpdate
from app.schemas.instagram import InstagramPostOut, InstagramSyncResult
from app.schemas.trends import TrendPoint
from app.services import instagram

router = APIRouter(prefix="/influencers", tags=["influencers"])
crud = CRUD(Influencer)


@router.get("/{influencer_id}/trends", response_model=dict[str, list[TrendPoint]])
async def influencer_trends(
    influencer_id: uuid.UUID,
    days: int = Query(180, ge=1, le=1095),
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    """Time series of influencer-scoped metrics (for growth charts, Phase 5)."""
    inf = await crud.get(db, influencer_id, org_id=tenant.org_id)
    if inf is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Influencer not found")

    since = func.now() - timedelta(days=days)
    rows = await db.scalars(
        select(Metric)
        .where(
            Metric.influencer_id == influencer_id,
            Metric.org_id == tenant.org_id,
            Metric.deleted_at.is_(None),
            Metric.captured_at >= since,
        )
        .order_by(Metric.captured_at)
    )
    series: dict[str, list[TrendPoint]] = defaultdict(list)
    for m in rows:
        series[m.metric_name].append(
            TrendPoint(captured_at=m.captured_at, value=float(m.metric_value))
        )
    return series


@router.post("/{influencer_id}/sync-instagram", response_model=InstagramSyncResult)
async def sync_instagram(
    influencer_id: uuid.UUID,
    max_posts: int = Query(instagram.DEFAULT_MAX_POSTS, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    """Collect Instagram profile + recent-post stats and store a snapshot."""
    inf = await crud.get(db, influencer_id, org_id=tenant.org_id)
    if inf is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Influencer not found")
    if not inf.instagram_username:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This influencer has no instagram_username set.",
        )

    handle = inf.instagram_username.lstrip("@").strip("/").split("/")[-1]
    try:
        # Instaloader is blocking; keep the event loop free.
        profile = await asyncio.to_thread(instagram.fetch_profile, handle, max_posts)
    except instagram.NotConnectedError as exc:
        # 409 → the UI prompts the user to Connect Instagram.
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    except instagram.InstagramError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    metrics = await instagram.store_profile_metrics(db, inf, profile)
    computed = instagram.compute_profile_metrics(profile)

    return InstagramSyncResult(
        username=profile.username,
        is_private=profile.is_private,
        followers=profile.followers,
        following=profile.following,
        post_count=profile.media_count,
        avg_likes=computed["avg_likes"],
        avg_comments=computed["avg_comments"],
        engagement_rate=computed["engagement_rate"],
        engagement_rate_reach=computed.get("engagement_rate_reach"),
        posting_frequency=computed["posting_frequency"],
        top_posts=[
            InstagramPostOut(
                shortcode=p.shortcode,
                likes=p.likes,
                comments=p.comments,
                timestamp=p.timestamp,
                caption=p.caption,
                url=p.url,
            )
            for p in instagram.top_posts(profile)
        ],
        metrics=metrics,
    )


@router.get("", response_model=list[InfluencerOut])
async def list_influencers(
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
    skip: int = 0,
    limit: int = Query(100, le=500),
    city: str | None = None,
    category: str | None = None,
):
    return await crud.list(
        db,
        org_id=tenant.org_id,
        skip=skip,
        limit=limit,
        filters={"city": city, "category": category},
    )


@router.post("", response_model=InfluencerOut, status_code=status.HTTP_201_CREATED)
async def create_influencer(
    data: InfluencerCreate,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    return await crud.create(db, data, org_id=tenant.org_id)


@router.get("/{influencer_id}", response_model=InfluencerOut)
async def get_influencer(
    influencer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    obj = await crud.get(db, influencer_id, org_id=tenant.org_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Influencer not found")
    return obj


@router.patch("/{influencer_id}", response_model=InfluencerOut)
async def update_influencer(
    influencer_id: uuid.UUID,
    data: InfluencerUpdate,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    obj = await crud.get(db, influencer_id, org_id=tenant.org_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Influencer not found")
    return await crud.update(db, obj, data)


@router.delete("/{influencer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_influencer(
    influencer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    obj = await crud.get(db, influencer_id, org_id=tenant.org_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Influencer not found")
    await crud.remove(db, obj)
