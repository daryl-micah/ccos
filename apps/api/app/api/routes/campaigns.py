import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import CRUD
from app.models import Campaign
from app.schemas.campaign import CampaignCreate, CampaignOut, CampaignUpdate
from app.schemas.influencer import InfluencerOut
from app.schemas.metric import MetricOut
from app.services.metric_engine import recompute_for_campaign
from app.services.roster import import_roster

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


class RosterImportResult(BaseModel):
    linked: int
    skipped: int
    created: int
    created_influencers: list[InfluencerOut]


@router.post("/{campaign_id}/import-roster", response_model=RosterImportResult)
async def import_campaign_roster(
    campaign_id: uuid.UUID,
    file: UploadFile = File(...),
    agency_id: uuid.UUID | None = Form(None),  # omit for in-house
    db: AsyncSession = Depends(get_db),
):
    """Import an agency's creator list (name/contact/handle) into the campaign."""
    campaign = await crud.get(db, campaign_id)
    if campaign is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")

    content = await file.read()
    try:
        result = await import_roster(
            db, campaign_id, agency_id, file.filename or "upload", content
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - surface parse failures to the client
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Could not read file: {exc}"
        ) from exc

    created = result["created_influencers"]
    return RosterImportResult(
        linked=result["linked"],
        skipped=result["skipped"],
        created=len(created),
        created_influencers=created,
    )


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
