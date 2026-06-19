import uuid

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin
from app.models.enums import CampaignInfluencerStatus


class CampaignInfluencer(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Join entity: an influencer participating in a campaign."""

    __tablename__ = "campaign_influencers"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    influencer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("influencers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Who sourced this creator for this campaign ("closed by"); null = in-house.
    agency_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agencies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    cost: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    deliverables: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=CampaignInfluencerStatus.PLANNED, index=True
    )
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign: Mapped["Campaign"] = relationship(back_populates="campaign_influencers")  # noqa: F821
    influencer: Mapped["Influencer"] = relationship(back_populates="campaign_influencers")  # noqa: F821
    agency: Mapped["Agency | None"] = relationship()  # noqa: F821

    deliverable_items: Mapped[list["Deliverable"]] = relationship(  # noqa: F821
        back_populates="campaign_influencer",
        cascade="all, delete-orphan",
    )
    posts: Mapped[list["Post"]] = relationship(  # noqa: F821
        back_populates="campaign_influencer",
        cascade="all, delete-orphan",
    )
    insights: Mapped[list["Insight"]] = relationship(  # noqa: F821
        back_populates="campaign_influencer",
        cascade="all, delete-orphan",
    )
    metrics: Mapped[list["Metric"]] = relationship(  # noqa: F821
        back_populates="campaign_influencer",
        cascade="all, delete-orphan",
    )
