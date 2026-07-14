import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Base,
    OrgScopedMixin,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDMixin,
)
from app.models.enums import DeliverableStatus


class Deliverable(Base, UUIDMixin, OrgScopedMixin, TimestampMixin, SoftDeleteMixin):
    """A content commitment within a campaign-influencer relationship."""

    __tablename__ = "deliverables"

    campaign_influencer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaign_influencers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    posted_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=DeliverableStatus.PENDING, index=True
    )
    link: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign_influencer: Mapped["CampaignInfluencer"] = relationship(  # noqa: F821
        back_populates="deliverable_items"
    )
    posts: Mapped[list["Post"]] = relationship(  # noqa: F821
        back_populates="deliverable",
    )
