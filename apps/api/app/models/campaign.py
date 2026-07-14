from datetime import date

from sqlalchemy import Date, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Base,
    OrgScopedMixin,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDMixin,
)
from app.models.enums import CampaignStatus


class Campaign(Base, UUIDMixin, OrgScopedMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "campaigns"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    budget: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=CampaignStatus.DRAFT, index=True
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign_influencers: Mapped[list["CampaignInfluencer"]] = relationship(  # noqa: F821
        back_populates="campaign",
        cascade="all, delete-orphan",
    )
