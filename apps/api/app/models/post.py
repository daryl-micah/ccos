import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Base,
    OrgScopedMixin,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDMixin,
)
from app.models.enums import Platform


class Post(Base, UUIDMixin, OrgScopedMixin, TimestampMixin, SoftDeleteMixin):
    """A live published post — the real-world result of a campaign.

    Users paste the live link and track per-post insight metrics
    (likes, comments, engagement_rate) via the generic Metric table
    scoped through ``post_id``.
    """

    __tablename__ = "posts"

    campaign_influencer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaign_influencers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    deliverable_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deliverables.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    platform: Mapped[str] = mapped_column(
        String(32), nullable=False, default=Platform.INSTAGRAM
    )
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign_influencer: Mapped["CampaignInfluencer"] = relationship(  # noqa: F821
        back_populates="posts"
    )
    deliverable: Mapped["Deliverable | None"] = relationship(  # noqa: F821
        back_populates="posts"
    )
    metrics: Mapped[list["Metric"]] = relationship(  # noqa: F821
        back_populates="post",
        cascade="all, delete-orphan",
    )
