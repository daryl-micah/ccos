"""Background jobs: Instagram/YouTube snapshot sync and derived-metric
recompute.

No task queue — these run in-process. ``collect_all_instagram`` is invoked via
FastAPI ``BackgroundTasks`` from the "Sync Now" button
(app/api/routes/instagram.py) and all jobs are invocable from the command
line (app/cli.py) for Heroku Scheduler's daily run.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models import CampaignInfluencer, Influencer
from app.services import instagram, youtube
from app.services.metric_engine import recompute_for_ci


def _normalize_handle(username: str | None) -> str:
    return (username or "").lstrip("@").strip("/").split("/")[-1]


async def collect_all_instagram() -> dict:
    """Snapshot every influencer's Instagram stats."""
    engine = create_async_engine(
        settings.database_url, pool_pre_ping=True, connect_args=settings.db_connect_args
    )
    session = async_sessionmaker(engine, expire_on_commit=False)
    synced = failed = 0
    try:
        async with session() as db:
            influencers = list(
                await db.scalars(
                    select(Influencer).where(
                        Influencer.instagram_username.is_not(None),
                        Influencer.deleted_at.is_(None),
                    )
                )
            )
            for inf in influencers:
                handle = _normalize_handle(inf.instagram_username)
                if not handle:
                    continue
                try:
                    profile = instagram.fetch_profile(handle)
                    await instagram.store_profile_metrics(db, inf, profile)
                    await db.commit()
                    synced += 1
                except instagram.InstagramError:
                    await db.rollback()
                    failed += 1
    finally:
        await engine.dispose()
    return {"synced": synced, "failed": failed}


async def collect_all_youtube() -> dict:
    """Snapshot every influencer's YouTube stats."""
    engine = create_async_engine(
        settings.database_url, pool_pre_ping=True, connect_args=settings.db_connect_args
    )
    session = async_sessionmaker(engine, expire_on_commit=False)
    synced = failed = 0
    try:
        async with session() as db:
            influencers = list(
                await db.scalars(
                    select(Influencer).where(
                        Influencer.deleted_at.is_(None),
                        (
                            Influencer.youtube_channel_id.is_not(None)
                            | Influencer.youtube_channel.is_not(None)
                        ),
                    )
                )
            )
            for inf in influencers:
                identifier = inf.youtube_channel_id or inf.youtube_channel
                if not identifier:
                    continue
                try:
                    channel = await youtube.fetch_channel(
                        identifier, settings.youtube_recent_video_limit
                    )
                    await youtube.store_channel_metrics(db, inf, channel)
                    await db.commit()
                    synced += 1
                except youtube.YouTubeError:
                    await db.rollback()
                    failed += 1
    finally:
        await engine.dispose()
    return {"synced": synced, "failed": failed}


async def recompute_all_metrics() -> dict:
    """Recompute derived KPIs for every campaign-influencer."""
    engine = create_async_engine(
        settings.database_url, pool_pre_ping=True, connect_args=settings.db_connect_args
    )
    session = async_sessionmaker(engine, expire_on_commit=False)
    updated = 0
    try:
        async with session() as db:
            cis = list(
                await db.scalars(
                    select(CampaignInfluencer).where(
                        CampaignInfluencer.deleted_at.is_(None)
                    )
                )
            )
            for ci in cis:
                updated += len(await recompute_for_ci(db, ci))
            await db.commit()
    finally:
        await engine.dispose()
    return {"updated": updated}
