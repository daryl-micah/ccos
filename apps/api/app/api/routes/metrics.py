import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import CRUD
from app.models import Metric
from app.schemas.metric import MetricCreate, MetricOut, MetricUpdate
from app.services import metric_engine

router = APIRouter(prefix="/metrics", tags=["metrics"])
crud = CRUD(Metric)

# Post-scoped metrics that feed the engagement rates
# (likes + comments + shares) / followers-or-views.
ENGAGEMENT_COMPONENTS = {"likes", "comments", "shares", "views"}


async def _refresh_post_engagement(
    db: AsyncSession, post_id: uuid.UUID | None, metric_name: str
) -> None:
    if post_id is not None and metric_name in ENGAGEMENT_COMPONENTS:
        await metric_engine.recompute_post_engagement(db, post_id)


@router.get("", response_model=list[MetricOut])
async def list_metrics(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = Query(100, le=500),
    campaign_influencer_id: uuid.UUID | None = None,
    influencer_id: uuid.UUID | None = None,
    post_id: uuid.UUID | None = None,
    metric_name: str | None = None,
    source: str | None = None,
):
    return await crud.list(
        db,
        skip=skip,
        limit=limit,
        filters={
            "campaign_influencer_id": campaign_influencer_id,
            "influencer_id": influencer_id,
            "post_id": post_id,
            "metric_name": metric_name,
            "source": source,
        },
    )


@router.post("", response_model=MetricOut, status_code=status.HTTP_201_CREATED)
async def create_metric(data: MetricCreate, db: AsyncSession = Depends(get_db)):
    obj = await crud.create(db, data)
    await _refresh_post_engagement(db, obj.post_id, obj.metric_name)
    return obj


@router.get("/{metric_id}", response_model=MetricOut)
async def get_metric(metric_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, metric_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Metric not found")
    return obj


@router.patch("/{metric_id}", response_model=MetricOut)
async def update_metric(
    metric_id: uuid.UUID, data: MetricUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await crud.get(db, metric_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Metric not found")
    updated = await crud.update(db, obj, data)
    await _refresh_post_engagement(db, updated.post_id, updated.metric_name)
    return updated


@router.delete("/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metric(metric_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, metric_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Metric not found")
    post_id, metric_name = obj.post_id, obj.metric_name
    await crud.remove(db, obj)
    await _refresh_post_engagement(db, post_id, metric_name)
