from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Tenant, get_tenant
from app.core.database import get_db
from app.services import analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Campaign-ownership filter shared by every endpoint below: a Clerk user id,
# or "unassigned" for campaigns predating owner_user_id. Omit for all owners.
OwnerParam = Query(None, description='Clerk user id, or "unassigned"; omit for all')


@router.get("/creators")
async def creators(
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
    owner: str | None = OwnerParam,
) -> list[dict]:
    """Per-creator performance across all campaigns (best ROAS first)."""
    return await analytics.creator_rankings(db, tenant.org_id, owner)


@router.get("/cities")
async def cities(
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
    owner: str | None = OwnerParam,
) -> list[dict]:
    return await analytics.city_rankings(db, tenant.org_id, owner)


@router.get("/categories")
async def categories(
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
    owner: str | None = OwnerParam,
) -> list[dict]:
    return await analytics.category_rankings(db, tenant.org_id, owner)


@router.get("/campaigns")
async def campaigns(
    db: AsyncSession = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
    owner: str | None = OwnerParam,
) -> list[dict]:
    return await analytics.campaign_rankings(db, tenant.org_id, owner)
