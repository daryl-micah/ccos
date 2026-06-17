import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import CRUD
from app.models import Post
from app.schemas.post import PostCreate, PostMetricsResult, PostOut, PostUpdate
from app.services import instagram

router = APIRouter(prefix="/posts", tags=["posts"])
crud = CRUD(Post)


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

    rows, engagement_rate, followers = await instagram.store_post_metrics(
        db, post, stats
    )
    return PostMetricsResult(
        likes=stats.likes,
        comments=stats.comments,
        views=stats.views,
        engagement_rate=engagement_rate,
        followers=int(followers) if followers else None,
        shares_available=False,
        metrics=rows,
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
    return await crud.create(db, data)


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
    return await crud.update(db, obj, data)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, post_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    await crud.remove(db, obj)
