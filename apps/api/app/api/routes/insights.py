import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Tenant, get_tenant
from app.core.database import get_db
from app.crud import CRUD
from app.models import CampaignInfluencer, Insight
from app.schemas.insight import InsightCreate, InsightOut, InsightUpdate

router = APIRouter(prefix="/insights", tags=["insights"])
crud = CRUD(Insight)
ci_crud = CRUD(CampaignInfluencer)


@router.get("", response_model=list[InsightOut])
async def list_insights(
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
    skip: int = 0,
    limit: int = Query(100, le=500),
    campaign_influencer_id: uuid.UUID | None = None,
):
    return await crud.list(
        db,
        org_id=tenant.org_id,
        skip=skip,
        limit=limit,
        filters={"campaign_influencer_id": campaign_influencer_id},
    )


@router.post("", response_model=InsightOut, status_code=status.HTTP_201_CREATED)
async def create_insight(
    data: InsightCreate,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    if not await ci_crud.exists(db, data.campaign_influencer_id, org_id=tenant.org_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CampaignInfluencer not found")
    return await crud.create(db, data, org_id=tenant.org_id)


@router.get("/{insight_id}", response_model=InsightOut)
async def get_insight(
    insight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    obj = await crud.get(db, insight_id, org_id=tenant.org_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Insight not found")
    return obj


@router.patch("/{insight_id}", response_model=InsightOut)
async def update_insight(
    insight_id: uuid.UUID,
    data: InsightUpdate,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    obj = await crud.get(db, insight_id, org_id=tenant.org_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Insight not found")
    return await crud.update(db, obj, data)


@router.delete("/{insight_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_insight(
    insight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    obj = await crud.get(db, insight_id, org_id=tenant.org_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Insight not found")
    await crud.remove(db, obj)
