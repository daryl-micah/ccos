import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Base,
    OrgScopedMixin,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDMixin,
)


class Insight(Base, UUIDMixin, OrgScopedMixin, TimestampMixin, SoftDeleteMixin):
    """Human observation about a creator within a campaign."""

    __tablename__ = "insights"

    campaign_influencer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaign_influencers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    note: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    campaign_influencer: Mapped["CampaignInfluencer"] = relationship(  # noqa: F821
        back_populates="insights"
    )
