"""Instagram collector (PRODUCT.md Phase 3).

Uses instagrapi (private API wrapper) for reliable authenticated access —
Instagram blocks anonymous scraping, so a login is required. A single shared
account is configured via env (``INSTAGRAM_USERNAME``/``INSTAGRAM_PASSWORD``,
falling back to ``INSTAGRAM_SESSIONID``); the resulting session is persisted
(never the password) and reused across calls.

Fetched aggregates are stored as influencer-scoped metrics
(``source=instagram``); each sync is a timestamped snapshot, which doubles
as the Phase 5 history. Manual overrides always win.
"""

import json
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CampaignInfluencer, Influencer, Metric, Post
from app.models.enums import MetricSource

# Average over a wider window so per-post averages are stable and closer to
# what tools like HypeAuditor report (they sample ~30 posts).
DEFAULT_MAX_POSTS = 30

# The feed listing returns no view counts, so reach-ER needs a per-video
# media_info call. Cap how many we make per profile sync to bound latency and
# rate-limit exposure.
MAX_VIEW_FETCHES = 8


class InstagramError(Exception):
    """Raised when a profile can't be fetched (private, missing, blocked)."""


class NotConnectedError(InstagramError):
    """Raised when an Instagram action is attempted without a login session."""


@dataclass
class IgPost:
    shortcode: str
    likes: int
    comments: int
    timestamp: datetime
    caption: str
    url: str
    views: int | None = None  # video/reel plays; None for photos


@dataclass
class IgProfile:
    username: str
    followers: int
    following: int
    media_count: int
    is_private: bool
    posts: list[IgPost]


@dataclass
class PostStats:
    likes: int
    comments: int
    views: int | None  # video/reel plays; None for photos
    is_video: bool
    posted_at: datetime | None = None  # the post's real publish time
    # Instagram's API does not expose share or repost counts.
    shares: int | None = None
    reposts: int | None = None


# --- Pure aggregation (testable without network) ----------------------------


def compute_profile_metrics(profile: IgProfile) -> dict[str, float]:
    posts = profile.posts
    n = len(posts)
    avg_likes = sum(p.likes for p in posts) / n if n else 0.0
    avg_comments = sum(p.comments for p in posts) / n if n else 0.0
    avg_shares = sum(p.shares or 0 for p in posts) / n if n else 0.0

    engagement_rate = (
        round((avg_likes + avg_comments + avg_shares) / profile.followers * 100, 4)
        if profile.followers
        else 0.0
    )

    # ER by reach: mean of (likes + comments + shares) / views over posts that have a
    # view count (reels/videos). Matches how tools like HypeAuditor report ER.
    reach_ers = [
        (p.likes + p.comments + (p.shares or 0)) / p.views * 100 for p in posts if p.views
    ]
    engagement_rate_reach = (
        round(sum(reach_ers) / len(reach_ers), 4) if reach_ers else None
    )

    posting_frequency = 0.0
    if n >= 2:
        times = sorted(p.timestamp for p in posts)
        span_days = (times[-1] - times[0]).total_seconds() / 86400
        if span_days > 0:
            posting_frequency = round(n / (span_days / 7), 4)  # posts per week

    result = {
        "followers": float(profile.followers),
        "following": float(profile.following),
        "post_count": float(profile.media_count),
        "avg_likes": round(avg_likes, 4),
        "avg_comments": round(avg_comments, 4),
        "engagement_rate": engagement_rate,
        "posting_frequency": posting_frequency,
    }
    if engagement_rate_reach is not None:
        result["engagement_rate_reach"] = engagement_rate_reach
    return result


def top_posts(profile: IgProfile, limit: int = 3) -> list[IgPost]:
    return sorted(profile.posts, key=lambda p: p.likes, reverse=True)[:limit]


# --- Session management (env-authenticated) ----------------------------------


def _session_dir() -> Path:
    from app.core.config import settings

    p = Path(settings.instagram_session_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p


def _state_file() -> Path:
    return _session_dir() / "state.json"


def _settings_file(username: str) -> Path:
    return _session_dir() / f"{username}.json"


def _connected_username() -> str | None:
    sf = _state_file()
    if sf.exists():
        try:
            username = json.loads(sf.read_text()).get("username")
        except Exception:  # noqa: BLE001
            return None
        if username and _settings_file(username).exists():
            return username
    return None


def get_status() -> dict:
    username = _connected_username()
    if username:
        return {"connected": True, "username": username, "source": "session"}

    from app.core.config import settings

    if settings.instagram_username and settings.instagram_password:
        return {
            "connected": True,
            "username": settings.instagram_username,
            "source": "env",
        }
    if settings.instagram_sessionid:
        return {"connected": True, "username": None, "source": "env"}
    return {"connected": False, "username": None, "source": None}


def _persist(client, username: str) -> None:
    client.dump_settings(str(_settings_file(username)))
    _state_file().write_text(json.dumps({"username": username}))


def _login_from_env(client) -> str:
    """Authenticate ``client`` from env credentials; returns the username.

    Username/password is tried first; on any failure (2FA, challenge, block) it
    falls back to the ``INSTAGRAM_SESSIONID`` cookie, which is more reliable.
    """
    from app.core.config import settings

    password_error: Exception | None = None
    if settings.instagram_username and settings.instagram_password:
        try:
            client.login(settings.instagram_username, settings.instagram_password)
            return settings.instagram_username
        except Exception as exc:  # noqa: BLE001 - fall back to the sessionid
            password_error = exc

    if settings.instagram_sessionid:
        client.login_by_sessionid(settings.instagram_sessionid.strip())
        return client.username or client.account_info().username

    if password_error is not None:
        raise NotConnectedError(
            f"Instagram username/password login failed ({password_error}) and no "
            "INSTAGRAM_SESSIONID fallback is set."
        )
    raise NotConnectedError(
        "Set INSTAGRAM_USERNAME/INSTAGRAM_PASSWORD or INSTAGRAM_SESSIONID."
    )


def _authenticated_client():
    """Build a client from the persisted session, or authenticate from env.

    The first env login is persisted under ``instagram_session_dir`` and reused
    on later calls, so we don't re-login on every fetch.
    """
    from instagrapi import Client

    username = _connected_username()
    if username:
        client = Client()
        client.load_settings(str(_settings_file(username)))
        return client

    client = Client()
    try:
        username = _login_from_env(client)
    except NotConnectedError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise NotConnectedError(f"Instagram login failed: {exc}") from exc
    _persist(client, username)
    return client


def fetch_profile(username: str, max_posts: int = DEFAULT_MAX_POSTS) -> IgProfile:
    """Fetch a profile + recent posts via an authenticated instagrapi session."""
    from instagrapi.exceptions import LoginRequired, UserNotFound

    client = _authenticated_client()  # raises NotConnectedError if not logged in

    try:
        user = client.user_info_by_username(username)
    except UserNotFound as exc:
        raise InstagramError(f"Instagram profile '@{username}' was not found.") from exc
    except LoginRequired as exc:
        raise NotConnectedError(
            "Instagram session expired. Reconnect Instagram."
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise InstagramError(f"Could not load '@{username}': {exc}") from exc

    posts: list[IgPost] = []
    if not user.is_private:
        try:
            medias = client.user_medias(user.pk, max_posts)
        except Exception:  # noqa: BLE001 - keep profile stats even if posts fail
            medias = []

        view_fetches = 0
        for media in medias:
            views: int | None = None
            if media.media_type == 2:  # video / reel
                views = media.view_count or media.play_count or None
                # The feed listing reports 0 views; fetch the real play count
                # via media_info (bounded by MAX_VIEW_FETCHES).
                if not views and view_fetches < MAX_VIEW_FETCHES:
                    view_fetches += 1
                    try:
                        full = client.media_info(media.pk)
                        views = full.view_count or full.play_count or None
                    except Exception:  # noqa: BLE001 - skip view on failure
                        views = None
            posts.append(
                IgPost(
                    shortcode=media.code,
                    likes=media.like_count or 0,
                    comments=media.comment_count or 0,
                    timestamp=media.taken_at,
                    caption=(media.caption_text or "")[:280],
                    url=f"https://www.instagram.com/p/{media.code}/",
                    views=views,
                )
            )

    return IgProfile(
        username=user.username,
        followers=user.follower_count or 0,
        following=user.following_count or 0,
        media_count=user.media_count or 0,
        is_private=user.is_private,
        posts=posts,
    )


async def store_profile_metrics(
    db: AsyncSession, influencer: Influencer, profile: IgProfile
) -> list[Metric]:
    """Append a timestamped Instagram snapshot as influencer-scoped metrics."""
    computed = compute_profile_metrics(profile)
    rows: list[Metric] = []
    for name, value in computed.items():
        row = Metric(
            influencer_id=influencer.id,
            metric_name=name,
            metric_value=Decimal(str(value)),
            source=MetricSource.INSTAGRAM,
            org_id=influencer.org_id,
        )
        db.add(row)
        rows.append(row)
    await db.flush()
    for row in rows:
        await db.refresh(row)
    return rows


# --- Per-post insights ------------------------------------------------------


def fetch_post(url: str) -> PostStats:
    """Fetch a single post's stats by URL (likes, comments, views)."""
    from instagrapi.exceptions import LoginRequired, MediaNotFound

    client = _authenticated_client()  # raises NotConnectedError if not logged in

    try:
        media_pk = client.media_pk_from_url(url)
        media = client.media_info(media_pk)
    except MediaNotFound as exc:
        raise InstagramError("That post was not found or is private.") from exc
    except LoginRequired as exc:
        raise NotConnectedError(
            "Instagram session expired. Reconnect Instagram."
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise InstagramError(f"Could not load the post: {exc}") from exc

    is_video = media.media_type == 2
    views = (media.view_count or media.play_count) if is_video else None
    return PostStats(
        likes=media.like_count or 0,
        comments=media.comment_count or 0,
        views=views,
        is_video=is_video,
        posted_at=media.taken_at,
    )


async def _latest_followers(db: AsyncSession, influencer_id, org_id: str) -> float | None:
    row = await db.scalar(
        select(Metric)
        .where(
            Metric.influencer_id == influencer_id,
            Metric.org_id == org_id,
            Metric.metric_name == "followers",
            Metric.deleted_at.is_(None),
        )
        .order_by(Metric.captured_at.desc())
        .limit(1)
    )
    return float(row.metric_value) if row else None


async def store_post_metrics(
    db: AsyncSession, post: Post, stats: PostStats
) -> tuple[list[Metric], float | None]:
    """Store post-scoped raw metrics; returns (rows, followers).

    Stores likes, comments and views. Both engagement rates are derived
    separately (``metric_engine.recompute_post_engagement``) so they fold in
    manually-entered shares, which Instagram's API omits.

    Looks up the influencer's most recent followers snapshot (returned for the
    response). Replaces any prior Instagram-sourced metrics for this post
    (idempotent re-sync); manual entries always win and are left untouched.
    """
    ci = await db.get(CampaignInfluencer, post.campaign_influencer_id)
    followers = (
        await _latest_followers(db, ci.influencer_id, post.org_id) if ci else None
    )

    values: dict[str, float] = {
        "likes": float(stats.likes),
        "comments": float(stats.comments),
    }
    if stats.views is not None:
        values["views"] = float(stats.views)

    # Replace previous Instagram-sourced metrics for this post (idempotent
    # re-sync); manual entries always win and are left untouched.
    existing = await db.scalars(
        select(Metric).where(
            Metric.post_id == post.id,
            Metric.org_id == post.org_id,
            Metric.source == MetricSource.INSTAGRAM,
            Metric.deleted_at.is_(None),
        )
    )
    for old in existing.all():
        old.deleted_at = func.now()

    rows: list[Metric] = []
    for name, value in values.items():
        row = Metric(
            campaign_influencer_id=post.campaign_influencer_id,
            post_id=post.id,
            metric_name=name,
            metric_value=Decimal(str(value)),
            source=MetricSource.INSTAGRAM,
            org_id=post.org_id,
        )
        db.add(row)
        rows.append(row)
    await db.flush()
    for row in rows:
        await db.refresh(row)
    return rows, followers
