"""Celery tasks. Each wraps async service code with a fresh engine/session
so it runs safely inside a sync worker (its own event loop)."""

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models import CampaignInfluencer, Influencer
from app.services import instagram, youtube
from app.services.metric_engine import recompute_for_ci
from app.worker import celery_app


def _run(coro):
    return asyncio.run(coro)


def _normalize_handle(username: str | None) -> str:
    return (username or "").lstrip("@").strip("/").split("/")[-1]


async def _collect_all_instagram() -> dict:
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
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


async def _collect_all_youtube() -> dict:
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
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


async def _recompute_all_metrics() -> dict:
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
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


@celery_app.task(name="app.tasks.collect_all_instagram")
def collect_all_instagram() -> dict:
    """Daily: snapshot every influencer's Instagram stats."""
    return _run(_collect_all_instagram())


@celery_app.task(name="app.tasks.collect_all_youtube")
def collect_all_youtube() -> dict:
    """Daily: snapshot every influencer's YouTube stats."""
    return _run(_collect_all_youtube())


@celery_app.task(name="app.tasks.recompute_all_metrics")
def recompute_all_metrics() -> dict:
    """Recompute derived KPIs for every campaign-influencer."""
    return _run(_recompute_all_metrics())
