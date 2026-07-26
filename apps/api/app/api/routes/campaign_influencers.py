import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Tenant, get_tenant
from app.core.database import get_db
from app.crud import CRUD
from app.models import Agency, Campaign, CampaignInfluencer, Influencer, Metric
from app.models.enums import MetricSource
from app.schemas.campaign_influencer import (
    CampaignInfluencerCreate,
    CampaignInfluencerOut,
    CampaignInfluencerResults,
    CampaignInfluencerUpdate,
)
from app.schemas.metric import MetricOut
from app.services.metric_engine import recompute_for_ci, recompute_for_ci_id

router = APIRouter(prefix="/campaign-influencers", tags=["campaign-influencers"])
crud = CRUD(CampaignInfluencer)
campaign_crud = CRUD(Campaign)
influencer_crud = CRUD(Influencer)
agency_crud = CRUD(Agency)


@router.post("/{ci_id}/recompute-metrics", response_model=list[MetricOut])
async def recompute_metrics(
    ci_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    """Recompute derived KPIs (engagement_rate, CPV, CPM, CPA, ROAS)."""
    written = await recompute_for_ci_id(db, ci_id, tenant.org_id)
    if written is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CampaignInfluencer not found")
    return written


@router.put("/{ci_id}/results", response_model=list[MetricOut])
async def set_results(
    ci_id: uuid.UUID,
    data: CampaignInfluencerResults,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    """Upsert creator-level revenue & conversion metrics, then recompute KPIs.

    Each provided field is stored as a single manual, CI-level metric
    (``post_id`` null); a provided ``null`` clears it. Returns every CI-level
    metric (manual results + freshly recomputed derived KPIs) so the client
    can replace its creator-level state in one round trip.
    """
    ci = await crud.get(db, ci_id, org_id=tenant.org_id)
    if ci is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CampaignInfluencer not found")

    provided = data.model_dump(exclude_unset=True)
    if provided:
        existing = list(
            await db.scalars(
                select(Metric).where(
                    Metric.campaign_influencer_id == ci_id,
                    Metric.org_id == tenant.org_id,
                    Metric.post_id.is_(None),
                    Metric.source == MetricSource.MANUAL,
                    Metric.metric_name.in_(provided.keys()),
                    Metric.deleted_at.is_(None),
                )
            )
        )
        by_name = {m.metric_name: m for m in existing}
        for name, value in provided.items():
            row = by_name.get(name)
            if value is None:
                if row is not None:
                    await crud.remove(db, row)
            elif row is not None:
                row.metric_value = Decimal(str(value))
            else:
                db.add(
                    Metric(
                        campaign_influencer_id=ci_id,
                        post_id=None,
                        metric_name=name,
                        metric_value=Decimal(str(value)),
                        source=MetricSource.MANUAL,
                        org_id=tenant.org_id,
                    )
                )
        await db.flush()

    # Recompute so ROAS / CPA / CPM reflect the new inputs immediately.
    await recompute_for_ci(db, ci, tenant.org_id)

    return list(
        await db.scalars(
            select(Metric).where(
                Metric.campaign_influencer_id == ci_id,
                Metric.org_id == tenant.org_id,
                Metric.post_id.is_(None),
                Metric.deleted_at.is_(None),
            )
        )
    )


@router.get("", response_model=list[CampaignInfluencerOut])
async def list_campaign_influencers(
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
    skip: int = 0,
    limit: int = Query(100, le=500),
    campaign_id: uuid.UUID | None = None,
    influencer_id: uuid.UUID | None = None,
):
    return await crud.list(
        db,
        org_id=tenant.org_id,
        skip=skip,
        limit=limit,
        filters={"campaign_id": campaign_id, "influencer_id": influencer_id},
    )


@router.post(
    "", response_model=CampaignInfluencerOut, status_code=status.HTTP_201_CREATED
)
async def create_campaign_influencer(
    data: CampaignInfluencerCreate,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    if not await campaign_crud.exists(db, data.campaign_id, org_id=tenant.org_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    if not await influencer_crud.exists(db, data.influencer_id, org_id=tenant.org_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Influencer not found")
    if data.agency_id is not None and not await agency_crud.exists(
        db, data.agency_id, org_id=tenant.org_id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agency not found")
    return await crud.create(db, data, org_id=tenant.org_id)


@router.get("/{ci_id}", response_model=CampaignInfluencerOut)
async def get_campaign_influencer(
    ci_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    obj = await crud.get(db, ci_id, org_id=tenant.org_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CampaignInfluencer not found")
    return obj


@router.patch("/{ci_id}", response_model=CampaignInfluencerOut)
async def update_campaign_influencer(
    ci_id: uuid.UUID,
    data: CampaignInfluencerUpdate,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    obj = await crud.get(db, ci_id, org_id=tenant.org_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CampaignInfluencer not found")
    if data.agency_id is not None and not await agency_crud.exists(
        db, data.agency_id, org_id=tenant.org_id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agency not found")
    return await crud.update(db, obj, data)


@router.delete("/{ci_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign_influencer(
    ci_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    obj = await crud.get(db, ci_id, org_id=tenant.org_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CampaignInfluencer not found")
    await crud.remove(db, obj)
