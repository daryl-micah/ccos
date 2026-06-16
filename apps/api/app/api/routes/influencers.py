import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import CRUD
from app.models import Influencer
from app.schemas.influencer import InfluencerCreate, InfluencerOut, InfluencerUpdate

router = APIRouter(prefix="/influencers", tags=["influencers"])
crud = CRUD(Influencer)


@router.get("", response_model=list[InfluencerOut])
async def list_influencers(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = Query(100, le=500),
    city: str | None = None,
    category: str | None = None,
):
    return await crud.list(
        db, skip=skip, limit=limit, filters={"city": city, "category": category}
    )


@router.post("", response_model=InfluencerOut, status_code=status.HTTP_201_CREATED)
async def create_influencer(data: InfluencerCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create(db, data)


@router.get("/{influencer_id}", response_model=InfluencerOut)
async def get_influencer(influencer_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, influencer_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Influencer not found")
    return obj


@router.patch("/{influencer_id}", response_model=InfluencerOut)
async def update_influencer(
    influencer_id: uuid.UUID, data: InfluencerUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await crud.get(db, influencer_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Influencer not found")
    return await crud.update(db, obj, data)


@router.delete("/{influencer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_influencer(influencer_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, influencer_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Influencer not found")
    await crud.remove(db, obj)
