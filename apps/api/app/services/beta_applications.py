"""Approve/list private-beta applications for the CLI (app/cli.py).

Approving an application *is* creating the applicant's organization — see
PRODUCT.md Decisions Log ("Gated private-beta onboarding — approval is
organization creation"). There is no separate admin-UI approval path; a
human runs this by hand and sends the "you're in" email themselves.
"""

import httpx
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.clerk import set_public_metadata
from app.core.config import settings
from app.models import BetaApplication

_BASE_URL = "https://api.clerk.com/v1"


async def _create_organization(name: str, created_by: str) -> str:
    """Create a Clerk Organization with `created_by` as its admin. Returns org_id."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"{_BASE_URL}/organizations",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
            json={"name": name, "created_by": created_by},
        )
        resp.raise_for_status()
    return resp.json()["id"]


async def list_pending() -> list[dict]:
    engine = create_async_engine(settings.database_url, connect_args=settings.db_connect_args)
    session = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with session() as db:
            apps = list(
                await db.scalars(
                    sa.select(BetaApplication)
                    .where(BetaApplication.status == "pending")
                    .order_by(BetaApplication.created_at)
                )
            )
            return [
                {
                    "clerk_user_id": a.clerk_user_id,
                    "company_name": a.company_name,
                    "role": a.role,
                    "team_size": a.team_size,
                    "submitted_at": a.created_at.isoformat(),
                }
                for a in apps
            ]
    finally:
        await engine.dispose()


async def approve(clerk_user_id: str) -> dict:
    """Create the applicant's org and mark their application approved."""
    engine = create_async_engine(settings.database_url, connect_args=settings.db_connect_args)
    session = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with session() as db:
            app = (
                await db.execute(
                    sa.select(BetaApplication).where(
                        BetaApplication.clerk_user_id == clerk_user_id
                    )
                )
            ).scalar_one_or_none()
            if app is None:
                raise ValueError(f"No application on file for {clerk_user_id}")
            if app.status == "approved":
                raise ValueError(f"{clerk_user_id} is already approved (org {app.org_id})")

            org_id = await _create_organization(app.company_name, clerk_user_id)

            app.status = "approved"
            app.org_id = org_id
            await db.commit()
    finally:
        await engine.dispose()

    await set_public_metadata(clerk_user_id, {"status": "approved"})

    return {"clerk_user_id": clerk_user_id, "org_id": org_id}
