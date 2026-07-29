"""beta applications

Revision ID: a1b2c3d4e5f6
Revises: 8f7b2c3d4e5f
Create Date: 2026-07-29 00:00:00.000000

"""
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "8f7b2c3d4e5f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "beta_applications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column("clerk_user_id", sa.String(length=64), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=64), nullable=True),
        sa.Column("team_size", sa.String(length=64), nullable=True),
        sa.Column("current_workflow", sa.String(length=64), nullable=True),
        sa.Column("creators_managed", sa.String(length=64), nullable=True),
        sa.Column("goal", sa.Text(), nullable=True),
        sa.Column("referrer", sa.Text(), nullable=True),
        sa.Column("utm_source", sa.String(length=255), nullable=True),
        sa.Column("utm_medium", sa.String(length=255), nullable=True),
        sa.Column("utm_campaign", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("org_id", sa.String(length=64), nullable=True),
    )
    op.create_index(
        op.f("ix_beta_applications_clerk_user_id"),
        "beta_applications",
        ["clerk_user_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_beta_applications_org_id"),
        "beta_applications",
        ["org_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_beta_applications_org_id"), table_name="beta_applications")
    op.drop_index(op.f("ix_beta_applications_clerk_user_id"), table_name="beta_applications")
    op.drop_table("beta_applications")
