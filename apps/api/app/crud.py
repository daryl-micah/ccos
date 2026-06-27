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
        """Soft delete with recursive cascading to child models."""
        import sqlalchemy as sa

        from app.models import (
            Agency,
            Campaign,
            CampaignInfluencer,
            Deliverable,
            Influencer,
            Insight,
            Metric,
            Post,
        )

        now = sa.func.now()
        obj.deleted_at = now

        if isinstance(obj, Campaign):
            # Soft-delete all campaign influencers of this campaign
            ci_stmt = sa.select(CampaignInfluencer).where(
                CampaignInfluencer.campaign_id == obj.id,
                CampaignInfluencer.deleted_at.is_(None),
            )
            cis = (await db.execute(ci_stmt)).scalars().all()
            for ci in cis:
                await self.remove(db, ci)

        elif isinstance(obj, Influencer):
            # Soft-delete all campaign influencers of this influencer
            ci_stmt = sa.select(CampaignInfluencer).where(
                CampaignInfluencer.influencer_id == obj.id,
                CampaignInfluencer.deleted_at.is_(None),
            )
            cis = (await db.execute(ci_stmt)).scalars().all()
            for ci in cis:
                await self.remove(db, ci)

        elif isinstance(obj, CampaignInfluencer):
            # Soft-delete deliverables
            deliv_stmt = sa.select(Deliverable).where(
                Deliverable.campaign_influencer_id == obj.id,
                Deliverable.deleted_at.is_(None),
            )
            delivs = (await db.execute(deliv_stmt)).scalars().all()
            for d in delivs:
                d.deleted_at = now

            # Soft-delete posts
            post_stmt = sa.select(Post).where(
                Post.campaign_influencer_id == obj.id,
                Post.deleted_at.is_(None),
            )
            posts = (await db.execute(post_stmt)).scalars().all()
            for p in posts:
                p.deleted_at = now
                # Soft-delete metrics and insights linked to the post
                metric_stmt = sa.select(Metric).where(
                    Metric.post_id == p.id,
                    Metric.deleted_at.is_(None),
                )
                metrics = (await db.execute(metric_stmt)).scalars().all()
                for m in metrics:
                    m.deleted_at = now

                insight_stmt = sa.select(Insight).where(
                    Insight.post_id == p.id,
                    Insight.deleted_at.is_(None),
                )
                insights = (await db.execute(insight_stmt)).scalars().all()
                for ins in insights:
                    ins.deleted_at = now

            # Soft-delete metrics direct on CI (no post_id)
            metric_stmt = sa.select(Metric).where(
                Metric.campaign_influencer_id == obj.id,
                Metric.post_id.is_(None),
                Metric.deleted_at.is_(None),
            )
            metrics = (await db.execute(metric_stmt)).scalars().all()
            for m in metrics:
                m.deleted_at = now

            # Soft-delete insights direct on CI (no post_id)
            insight_stmt = sa.select(Insight).where(
                Insight.campaign_influencer_id == obj.id,
                Insight.post_id.is_(None),
                Insight.deleted_at.is_(None),
            )
            insights = (await db.execute(insight_stmt)).scalars().all()
            for ins in insights:
                ins.deleted_at = now

        elif isinstance(obj, Agency):
            # Nullify agency_id on all campaign influencers (analogous to SET NULL)
            ci_stmt = sa.select(CampaignInfluencer).where(
                CampaignInfluencer.agency_id == obj.id
            )
            cis = (await db.execute(ci_stmt)).scalars().all()
            for ci in cis:
                ci.agency_id = None

        await db.flush()
