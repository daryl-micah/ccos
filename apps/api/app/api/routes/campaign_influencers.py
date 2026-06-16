import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import CRUD
from app.models import CampaignInfluencer
from app.schemas.campaign_influencer import (
    CampaignInfluencerCreate,
    CampaignInfluencerOut,
    CampaignInfluencerUpdate,
)

router = APIRouter(prefix="/campaign-influencers", tags=["campaign-influencers"])
crud = CRUD(CampaignInfluencer)


@router.get("", response_model=list[CampaignInfluencerOut])
async def list_campaign_influencers(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = Query(100, le=500),
    campaign_id: uuid.UUID | None = None,
    influencer_id: uuid.UUID | None = None,
):
    return await crud.list(
        db,
        skip=skip,
        limit=limit,
        filters={"campaign_id": campaign_id, "influencer_id": influencer_id},
    )


@router.post(
    "", response_model=CampaignInfluencerOut, status_code=status.HTTP_201_CREATED
)
async def create_campaign_influencer(
    data: CampaignInfluencerCreate, db: AsyncSession = Depends(get_db)
):
    return await crud.create(db, data)


@router.get("/{ci_id}", response_model=CampaignInfluencerOut)
async def get_campaign_influencer(ci_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, ci_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CampaignInfluencer not found")
    return obj


@router.patch("/{ci_id}", response_model=CampaignInfluencerOut)
async def update_campaign_influencer(
    ci_id: uuid.UUID,
    data: CampaignInfluencerUpdate,
    db: AsyncSession = Depends(get_db),
):
    obj = await crud.get(db, ci_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CampaignInfluencer not found")
    return await crud.update(db, obj, data)


@router.delete("/{ci_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign_influencer(
    ci_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    obj = await crud.get(db, ci_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CampaignInfluencer not found")
    await crud.remove(db, obj)
