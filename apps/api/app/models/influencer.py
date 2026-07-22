from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Base,
    OrgScopedMixin,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDMixin,
)


class Influencer(Base, UUIDMixin, OrgScopedMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "influencers"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    instagram_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    youtube_channel: Mapped[str | None] = mapped_column(String(255), nullable=True)
    youtube_channel_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    city: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    country: Mapped[str | None] = mapped_column(String(128), nullable=True)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    language: Mapped[str | None] = mapped_column(String(64), nullable=True)
    manager_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign_influencers: Mapped[list["CampaignInfluencer"]] = relationship(  # noqa: F821
        back_populates="influencer",
        cascade="all, delete-orphan",
    )
