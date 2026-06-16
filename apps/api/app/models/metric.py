import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin
from app.models.enums import MetricSource


class Metric(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Generic metric record (see REQUIREMENT_DOC "Metric System").

    Scoped to a campaign-influencer by default, or to a specific live
    Post when ``post_id`` is set. Avoids schema explosion and supports
    future integrations via ``source`` attribution.
    """

    __tablename__ = "metrics"

    campaign_influencer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaign_influencers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    post_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    metric_name: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    metric_value: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    source: Mapped[str] = mapped_column(
        String(32), nullable=False, default=MetricSource.MANUAL, index=True
    )
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    campaign_influencer: Mapped["CampaignInfluencer"] = relationship(  # noqa: F821
        back_populates="metrics"
    )
    post: Mapped["Post | None"] = relationship(back_populates="metrics")  # noqa: F821
