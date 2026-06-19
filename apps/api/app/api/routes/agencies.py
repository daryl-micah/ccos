import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import CRUD
from app.models import Agency
from app.schemas.agency import AgencyCreate, AgencyOut, AgencyUpdate

router = APIRouter(prefix="/agencies", tags=["agencies"])
crud = CRUD(Agency)


@router.get("", response_model=list[AgencyOut])
async def list_agencies(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = Query(200, le=500),
):
    return await crud.list(db, skip=skip, limit=limit)


@router.post("", response_model=AgencyOut, status_code=status.HTTP_201_CREATED)
async def create_agency(data: AgencyCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create(db, data)


@router.patch("/{agency_id}", response_model=AgencyOut)
async def update_agency(
    agency_id: uuid.UUID, data: AgencyUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await crud.get(db, agency_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agency not found")
    return await crud.update(db, obj, data)


@router.delete("/{agency_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agency(agency_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await crud.get(db, agency_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agency not found")
    await crud.remove(db, obj)
