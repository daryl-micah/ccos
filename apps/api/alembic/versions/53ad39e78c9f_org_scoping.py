"""org scoping

Revision ID: 53ad39e78c9f
Revises: 50d29fefb6cf
Create Date: 2026-07-14 00:00:00.000000

Adds the Clerk `org_id` tenant key to every table (see PRODUCT.md Decisions
Log, "Team-workspace isolation via Clerk Organizations"). Non-destructive:
columns start nullable, existing rows backfill into one default org, then
the column is locked to NOT NULL.

Set ``CCOS_DEFAULT_ORG_ID`` in the environment running this migration to the
real Clerk org id that should own pre-existing data; otherwise rows backfill
into the placeholder below and must be reassigned manually before go-live.
"""
import os
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '53ad39e78c9f'
down_revision: str | None = '50d29fefb6cf'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEFAULT_ORG_ID = os.environ.get("CCOS_DEFAULT_ORG_ID", "org_legacy_default")

TABLES = [
    "campaigns",
    "influencers",
    "agencies",
    "campaign_influencers",
    "deliverables",
    "posts",
    "metrics",
    "insights",
]


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column("org_id", sa.String(length=64), nullable=True))

    for table in TABLES:
        op.execute(
            sa.text(f"UPDATE {table} SET org_id = :org_id WHERE org_id IS NULL").bindparams(
                org_id=DEFAULT_ORG_ID
            )
        )

    for table in TABLES:
        op.alter_column(table, "org_id", existing_type=sa.String(length=64), nullable=False)
        op.create_index(op.f(f"ix_{table}_org_id"), table, ["org_id"], unique=False)
        op.create_index(
            f"ix_{table}_org_id_created_at", table, ["org_id", "created_at"], unique=False
        )
        op.create_index(
            f"ix_{table}_org_id_deleted_at", table, ["org_id", "deleted_at"], unique=False
        )


def downgrade() -> None:
    for table in TABLES:
        op.drop_index(f"ix_{table}_org_id_deleted_at", table_name=table)
        op.drop_index(f"ix_{table}_org_id_created_at", table_name=table)
        op.drop_index(op.f(f"ix_{table}_org_id"), table_name=table)
        op.drop_column(table, "org_id")
