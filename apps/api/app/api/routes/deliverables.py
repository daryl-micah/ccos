import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import CRUD
from app.models import Deliverable
from app.schemas.deliverable import (
    DeliverableCreate,
    DeliverableOut,
    DeliverableUpdate,
)

router = APIRouter(prefix="/deliverables", tags=["deliverables"])
crud = CRUD(Deliverable)


@router.get("", response_model=list[DeliverableOut])
async def list_deliverables(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = Query(100, le=500),
    campaign_influencer_id: uuid.UUID | None = None,
):
    return await crud.list(
        db,
        skip=skip,
        limit=limit,
        filters={"campaign_influencer_id": campaign_influencer_id},
    )


@router.post("", response_model=DeliverableOut, status_code=status.HTTP_201_CREATED)
async def create_deliverable(data: DeliverableCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create(db, data)


@router.get("/{deliverable_id}", response_model=DeliverableOut)
async def get_deliverable(deliverable_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, deliverable_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deliverable not found")
    return obj


@router.patch("/{deliverable_id}", response_model=DeliverableOut)
async def update_deliverable(
    deliverable_id: uuid.UUID,
    data: DeliverableUpdate,
    db: AsyncSession = Depends(get_db),
):
    obj = await crud.get(db, deliverable_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deliverable not found")
    return await crud.update(db, obj, data)


@router.delete("/{deliverable_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deliverable(
    deliverable_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    obj = await crud.get(db, deliverable_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deliverable not found")
    await crud.remove(db, obj)
