import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import CRUD
from app.models import Metric
from app.schemas.metric import MetricCreate, MetricOut, MetricUpdate

router = APIRouter(prefix="/metrics", tags=["metrics"])
crud = CRUD(Metric)


@router.get("", response_model=list[MetricOut])
async def list_metrics(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = Query(100, le=500),
    campaign_influencer_id: uuid.UUID | None = None,
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
            "post_id": post_id,
            "metric_name": metric_name,
            "source": source,
        },
    )


@router.post("", response_model=MetricOut, status_code=status.HTTP_201_CREATED)
async def create_metric(data: MetricCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create(db, data)


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
    return await crud.update(db, obj, data)


@router.delete("/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metric(metric_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, metric_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Metric not found")
    await crud.remove(db, obj)
