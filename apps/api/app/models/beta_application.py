from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class BetaApplication(Base, UUIDMixin, TimestampMixin):
    """A private-beta access request submitted before any org exists.

    Deliberately not OrgScopedMixin — the applicant has no organization yet.
    Keyed on the Clerk user id instead, and stamped with the org_id created
    at approval time. See PRODUCT.md Decisions Log ("Gated private-beta
    onboarding — approval is organization creation").
    """

    __tablename__ = "beta_applications"

    clerk_user_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)

    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str | None] = mapped_column(String(64), nullable=True)
    team_size: Mapped[str | None] = mapped_column(String(64), nullable=True)
    current_workflow: Mapped[str | None] = mapped_column(String(64), nullable=True)
    creators_managed: Mapped[str | None] = mapped_column(String(64), nullable=True)
    goal: Mapped[str | None] = mapped_column(Text, nullable=True)

    referrer: Mapped[str | None] = mapped_column(Text, nullable=True)
    utm_source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    utm_medium: Mapped[str | None] = mapped_column(String(255), nullable=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    org_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
