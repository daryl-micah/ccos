import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Tenant, get_tenant
from app.core.database import get_db
from app.crud import CRUD
from app.models import CampaignInfluencer, Deliverable, Post
from app.models.enums import DeliverableStatus, Platform
from app.schemas.post import PostCreate, PostMetricsResult, PostOut, PostUpdate
from app.services import instagram, metric_engine, youtube

router = APIRouter(prefix="/posts", tags=["posts"])
crud = CRUD(Post)
deliverable_crud = CRUD(Deliverable)
ci_crud = CRUD(CampaignInfluencer)


async def _mark_deliverable_posted(db: AsyncSession, post: Post) -> None:
    """A linked live post fulfils its deliverable: flip pending → posted."""
    if post.deliverable_id is None:
        return
    deliverable = await deliverable_crud.get(db, post.deliverable_id, org_id=post.org_id)
    if deliverable is None:
        return
    if deliverable.status == DeliverableStatus.PENDING:
        deliverable.status = DeliverableStatus.POSTED
    if deliverable.posted_date is None and post.posted_at is not None:
        deliverable.posted_date = post.posted_at.date()
    await db.flush()


@router.post("/{post_id}/sync-metrics", response_model=PostMetricsResult)
async def sync_post_metrics(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    """Fetch a live post's stats (likes, comments, views, ER%) by platform."""
    post = await crud.get(db, post_id, org_id=tenant.org_id)
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")

    if post.platform == Platform.INSTAGRAM:
        return await _sync_instagram_post_metrics(db, post, tenant.org_id)
    if post.platform == Platform.YOUTUBE:
        return await _sync_youtube_post_metrics(db, post, tenant.org_id)
    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        "Automatic metrics are only available for Instagram and YouTube posts.",
    )


async def _sync_instagram_post_metrics(
    db: AsyncSession, post: Post, org_id: str
) -> PostMetricsResult:
    try:
        stats = await asyncio.to_thread(instagram.fetch_post, post.url)
    except instagram.NotConnectedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    except instagram.InstagramError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    rows, followers = await instagram.store_post_metrics(db, post, stats)
    if stats.posted_at is not None:
        post.posted_at = stats.posted_at
        await db.flush()
    await _mark_deliverable_posted(db, post)

    er = await metric_engine.recompute_post_engagement(db, post.id, org_id)
    er_followers = er.get("engagement_rate")
    er_reach = er.get("engagement_rate_reach")

    return PostMetricsResult(
        likes=stats.likes,
        comments=stats.comments,
        views=stats.views,
        engagement_rate=float(er_followers.metric_value) if er_followers else None,
        engagement_rate_reach=float(er_reach.metric_value) if er_reach else None,
        followers=int(followers) if followers else None,
        subscribers=None,
        posted_at=post.posted_at,
        shares_available=False,
        metrics=rows + list(er.values()),
    )


async def _sync_youtube_post_metrics(
    db: AsyncSession, post: Post, org_id: str
) -> PostMetricsResult:
    try:
        stats = await youtube.fetch_video(post.url)
    except youtube.NotConfiguredError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    except youtube.YouTubeError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    rows, subscribers = await youtube.store_post_metrics(db, post, stats)
    if stats.published_at is not None:
        post.posted_at = stats.published_at
        await db.flush()
    await _mark_deliverable_posted(db, post)

    er = await metric_engine.recompute_post_engagement(db, post.id, org_id)
    er_subscribers = er.get("engagement_rate")
    er_reach = er.get("engagement_rate_reach")

    return PostMetricsResult(
        likes=stats.likes,
        comments=stats.comments,
        views=stats.views,
        engagement_rate=float(er_subscribers.metric_value) if er_subscribers else None,
        engagement_rate_reach=float(er_reach.metric_value) if er_reach else None,
        followers=None,
        subscribers=int(subscribers) if subscribers else None,
        posted_at=post.posted_at,
        shares_available=False,
        metrics=rows + list(er.values()),
    )


@router.get("", response_model=list[PostOut])
async def list_posts(
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
    skip: int = 0,
    limit: int = Query(100, le=500),
    campaign_influencer_id: uuid.UUID | None = None,
    deliverable_id: uuid.UUID | None = None,
):
    return await crud.list(
        db,
        org_id=tenant.org_id,
        skip=skip,
        limit=limit,
        filters={
            "campaign_influencer_id": campaign_influencer_id,
            "deliverable_id": deliverable_id,
        },
    )


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    data: PostCreate,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    if not await ci_crud.exists(db, data.campaign_influencer_id, org_id=tenant.org_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CampaignInfluencer not found")
    if data.deliverable_id is not None and not await deliverable_crud.exists(
        db, data.deliverable_id, org_id=tenant.org_id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deliverable not found")
    post = await crud.create(db, data, org_id=tenant.org_id)
    await _mark_deliverable_posted(db, post)
    return post


@router.get("/{post_id}", response_model=PostOut)
async def get_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    obj = await crud.get(db, post_id, org_id=tenant.org_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    return obj


@router.patch("/{post_id}", response_model=PostOut)
async def update_post(
    post_id: uuid.UUID,
    data: PostUpdate,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    obj = await crud.get(db, post_id, org_id=tenant.org_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    if data.deliverable_id is not None and not await deliverable_crud.exists(
        db, data.deliverable_id, org_id=tenant.org_id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deliverable not found")
    updated = await crud.update(db, obj, data)
    await _mark_deliverable_posted(db, updated)
    return updated


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    obj = await crud.get(db, post_id, org_id=tenant.org_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    await crud.remove(db, obj)
