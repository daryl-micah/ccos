from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import (
    Base,
    OrgScopedMixin,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDMixin,
)


class Agency(Base, UUIDMixin, OrgScopedMixin, TimestampMixin, SoftDeleteMixin):
    """Talent agency that supplies creators for campaigns.

    A creator's agency is recorded per campaign on CampaignInfluencer
    (null = in-house), since agency rosters vary per campaign.
    """

    __tablename__ = "agencies"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
