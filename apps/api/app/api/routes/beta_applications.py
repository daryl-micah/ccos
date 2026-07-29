from typing import Any

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_claims
from app.core.clerk import set_public_metadata
from app.core.database import get_db
from app.models import BetaApplication
from app.schemas.beta_application import BetaApplicationCreate, BetaApplicationOut

# Mounted directly on `app` in main.py, not on api_router — an applicant has
# no organization yet, so api_router's blanket get_tenant dependency would
# 403 every request here. See PRODUCT.md Decisions Log ("Gated private-beta
# onboarding — approval is organization creation").
router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("", response_model=BetaApplicationOut, status_code=status.HTTP_201_CREATED)
async def submit_application(
    data: BetaApplicationCreate,
    db: AsyncSession = Depends(get_db),
    claims: dict[str, Any] = Depends(get_current_claims),
):
    clerk_user_id = claims["sub"]

    existing = (
        await db.execute(
            sa.select(BetaApplication).where(BetaApplication.clerk_user_id == clerk_user_id)
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Application already submitted")

    obj = BetaApplication(clerk_user_id=clerk_user_id, **data.model_dump())
    db.add(obj)
    await db.flush()
    await db.refresh(obj)

    # proxy.ts reads this claim to route pending applicants to /pending
    # instead of bouncing them back to /apply.
    await set_public_metadata(clerk_user_id, {"status": "pending"})

    return obj


@router.get("/me", response_model=BetaApplicationOut)
async def get_my_application(
    db: AsyncSession = Depends(get_db),
    claims: dict[str, Any] = Depends(get_current_claims),
):
    obj = (
        await db.execute(
            sa.select(BetaApplication).where(BetaApplication.clerk_user_id == claims["sub"])
        )
    ).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No application on file")
    return obj
