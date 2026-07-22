"""youtube channel id

Revision ID: 8f7b2c3d4e5f
Revises: 53ad39e78c9f
Create Date: 2026-07-22 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8f7b2c3d4e5f"
down_revision: str | None = "53ad39e78c9f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "influencers", sa.Column("youtube_channel_id", sa.String(length=64), nullable=True)
    )
    op.create_index(
        op.f("ix_influencers_youtube_channel_id"),
        "influencers",
        ["youtube_channel_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_influencers_youtube_channel_id"), table_name="influencers")
    op.drop_column("influencers", "youtube_channel_id")
