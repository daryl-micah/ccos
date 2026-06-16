from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services import analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/creators")
async def creators(db: AsyncSession = Depends(get_db)) -> list[dict]:
    """Per-creator performance across all campaigns (best ROAS first)."""
    return await analytics.creator_rankings(db)


@router.get("/cities")
async def cities(db: AsyncSession = Depends(get_db)) -> list[dict]:
    return await analytics.city_rankings(db)


@router.get("/categories")
async def categories(db: AsyncSession = Depends(get_db)) -> list[dict]:
    return await analytics.category_rankings(db)


@router.get("/campaigns")
async def campaigns(db: AsyncSession = Depends(get_db)) -> list[dict]:
    return await analytics.campaign_rankings(db)
