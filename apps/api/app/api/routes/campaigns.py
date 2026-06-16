import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import CRUD
from app.models import Campaign
from app.schemas.campaign import CampaignCreate, CampaignOut, CampaignUpdate
from app.schemas.metric import MetricOut
from app.services.metric_engine import recompute_for_campaign

router = APIRouter(prefix="/campaigns", tags=["campaigns"])
crud = CRUD(Campaign)


@router.post("/{campaign_id}/recompute-metrics", response_model=list[MetricOut])
async def recompute_campaign_metrics(
    campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    """Recompute derived KPIs for every creator in the campaign."""
    obj = await crud.get(db, campaign_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    return await recompute_for_campaign(db, campaign_id)


@router.get("", response_model=list[CampaignOut])
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = Query(100, le=500),
    status: str | None = None,
):
    return await crud.list(db, skip=skip, limit=limit, filters={"status": status})


@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
async def create_campaign(data: CampaignCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create(db, data)


@router.get("/{campaign_id}", response_model=CampaignOut)
async def get_campaign(campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, campaign_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    return obj


@router.patch("/{campaign_id}", response_model=CampaignOut)
async def update_campaign(
    campaign_id: uuid.UUID, data: CampaignUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await crud.get(db, campaign_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    return await crud.update(db, obj, data)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, campaign_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    await crud.remove(db, obj)
