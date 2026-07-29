"""campaign owner_user_id

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-29 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Nullable with no backfill — existing campaigns stay "unassigned" rather
    # than being attributed to whoever happens to run the migration.
    op.add_column(
        "campaigns", sa.Column("owner_user_id", sa.String(length=64), nullable=True)
    )
    op.create_index(
        op.f("ix_campaigns_owner_user_id"),
        "campaigns",
        ["owner_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_campaigns_owner_user_id"), table_name="campaigns")
    op.drop_column("campaigns", "owner_user_id")
