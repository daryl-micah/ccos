import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import CRUD
from app.models import Deliverable, Post
from app.models.enums import DeliverableStatus
from app.schemas.post import PostCreate, PostMetricsResult, PostOut, PostUpdate
from app.services import instagram, metric_engine

router = APIRouter(prefix="/posts", tags=["posts"])
crud = CRUD(Post)
deliverable_crud = CRUD(Deliverable)


async def _mark_deliverable_posted(db: AsyncSession, post: Post) -> None:
    """A linked live post fulfils its deliverable: flip pending → posted."""
    if post.deliverable_id is None:
        return
    deliverable = await deliverable_crud.get(db, post.deliverable_id)
    if deliverable is None:
        return
    if deliverable.status == DeliverableStatus.PENDING:
        deliverable.status = DeliverableStatus.POSTED
    if deliverable.posted_date is None and post.posted_at is not None:
        deliverable.posted_date = post.posted_at.date()
    await db.flush()


@router.post("/{post_id}/sync-metrics", response_model=PostMetricsResult)
async def sync_post_metrics(post_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Fetch a live post's stats (likes, comments, views, ER%) from Instagram."""
    post = await crud.get(db, post_id)
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    if post.platform != "instagram":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Automatic metrics are only available for Instagram posts.",
        )

    try:
        stats = await asyncio.to_thread(instagram.fetch_post, post.url)
    except instagram.NotConnectedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    except instagram.InstagramError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    rows, followers = await instagram.store_post_metrics(db, post, stats)
    # Use Instagram's real publish time instead of manual entry.
    if stats.posted_at is not None:
        post.posted_at = stats.posted_at
        await db.flush()
    await _mark_deliverable_posted(db, post)

    # Derive both engagement rates separately so any manually-entered shares
    # are folded in (Instagram's API omits shares).
    er = await metric_engine.recompute_post_engagement(db, post.id)
    er_followers = er.get("engagement_rate")
    er_reach = er.get("engagement_rate_reach")

    return PostMetricsResult(
        likes=stats.likes,
        comments=stats.comments,
        views=stats.views,
        engagement_rate=float(er_followers.metric_value) if er_followers else None,
        engagement_rate_reach=float(er_reach.metric_value) if er_reach else None,
        followers=int(followers) if followers else None,
        posted_at=post.posted_at,
        shares_available=False,
        metrics=rows + list(er.values()),
    )


@router.get("", response_model=list[PostOut])
async def list_posts(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = Query(100, le=500),
    campaign_influencer_id: uuid.UUID | None = None,
    deliverable_id: uuid.UUID | None = None,
):
    return await crud.list(
        db,
        skip=skip,
        limit=limit,
        filters={
            "campaign_influencer_id": campaign_influencer_id,
            "deliverable_id": deliverable_id,
        },
    )


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(data: PostCreate, db: AsyncSession = Depends(get_db)):
    post = await crud.create(db, data)
    await _mark_deliverable_posted(db, post)
    return post


@router.get("/{post_id}", response_model=PostOut)
async def get_post(post_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, post_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    return obj


@router.patch("/{post_id}", response_model=PostOut)
async def update_post(
    post_id: uuid.UUID, data: PostUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await crud.get(db, post_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    updated = await crud.update(db, obj, data)
    await _mark_deliverable_posted(db, updated)
    return updated


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, post_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    await crud.remove(db, obj)
