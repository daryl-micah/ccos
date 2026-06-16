"""Light, explicit async CRUD helper shared by routers.

Soft-delete aware: list/get ignore rows with ``deleted_at`` set, and
``remove`` performs a soft delete (never destroys history).
"""

import uuid

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base


class CRUD[ModelT: Base]:
    def __init__(self, model: type[ModelT]):
        self.model = model

    async def get(self, db: AsyncSession, obj_id: uuid.UUID) -> ModelT | None:
        result = await db.execute(
            select(self.model).where(
                self.model.id == obj_id,
                self.model.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: dict | None = None,
    ) -> list[ModelT]:
        stmt = select(self.model).where(self.model.deleted_at.is_(None))
        for field, value in (filters or {}).items():
            if value is not None:
                stmt = stmt.where(getattr(self.model, field) == value)
        stmt = stmt.order_by(self.model.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def count(self, db: AsyncSession, *, filters: dict | None = None) -> int:
        stmt = select(func.count()).select_from(self.model).where(
            self.model.deleted_at.is_(None)
        )
        for field, value in (filters or {}).items():
            if value is not None:
                stmt = stmt.where(getattr(self.model, field) == value)
        result = await db.execute(stmt)
        return int(result.scalar_one())

    async def create(self, db: AsyncSession, data: BaseModel) -> ModelT:
        obj = self.model(**data.model_dump(exclude_unset=True))
        db.add(obj)
        await db.flush()
        await db.refresh(obj)
        return obj

    async def update(
        self, db: AsyncSession, obj: ModelT, data: BaseModel
    ) -> ModelT:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        await db.flush()
        await db.refresh(obj)
        return obj

    async def remove(self, db: AsyncSession, obj: ModelT) -> None:
        """Soft delete."""
        obj.deleted_at = func.now()
        await db.flush()
