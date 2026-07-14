import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


class UUIDMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class OrgScopedMixin:
    """Tenant key — Clerk `org_id` (e.g. "org_xxx"), present on every row.

    Denormalized onto child tables too (not just campaigns/influencers/
    agencies) so tenant scoping is always a single ``WHERE org_id = :org_id``
    rather than a join chain up to the root entity. See PRODUCT.md Decisions
    Log ("Team-workspace isolation via Clerk Organizations").
    """

    org_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)


class SoftDeleteMixin:
    """Soft delete — never lose campaign history (see PRODUCT.md)."""

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
