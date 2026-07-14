from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Tenant, get_tenant
from app.core.database import get_db
from app.services import ai_insights

router = APIRouter(prefix="/ai", tags=["ai"])


class AIStatus(BaseModel):
    configured: bool
    provider: str
    model: str


class Recommendation(BaseModel):
    question: str
    answer: str


class InsightsResult(BaseModel):
    summary: str
    insights: list[str]
    recommendations: list[Recommendation]
    model: str


@router.get("/status", response_model=AIStatus)
async def ai_status():
    return ai_insights.get_status()


@router.post("/insights", response_model=InsightsResult)
async def ai_generate_insights(
    db: AsyncSession = Depends(get_db), tenant: Tenant = Depends(get_tenant)
):
    """Generate natural-language insights over the campaign analytics."""
    try:
        return await ai_insights.generate_insights(db, tenant.org_id)
    except ai_insights.AINotConfiguredError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - surface upstream failures clearly
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"AI provider error: {exc}"
        ) from exc
