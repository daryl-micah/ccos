import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import CRUD
from app.models import Post
from app.schemas.post import PostCreate, PostOut, PostUpdate

router = APIRouter(prefix="/posts", tags=["posts"])
crud = CRUD(Post)


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
