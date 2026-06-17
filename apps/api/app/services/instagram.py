"""Instagram collector (REQUIREMENT_DOC Phase 3).

Uses instagrapi (private API wrapper) for reliable authenticated access —
Instagram blocks anonymous scraping, so a login is required. We persist
instagrapi's session settings (never the password) and support both a
username/password login and a browser ``sessionid`` cookie.

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

DEFAULT_MAX_POSTS = 12


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
    # Instagram's API does not expose share or repost counts.
    shares: int | None = None
    reposts: int | None = None


# --- Pure aggregation (testable without network) ----------------------------


def compute_profile_metrics(profile: IgProfile) -> dict[str, float]:
    posts = profile.posts
    n = len(posts)
    avg_likes = sum(p.likes for p in posts) / n if n else 0.0
    avg_comments = sum(p.comments for p in posts) / n if n else 0.0

    engagement_rate = (
        round((avg_likes + avg_comments) / profile.followers * 100, 4)
        if profile.followers
        else 0.0
    )

    posting_frequency = 0.0
    if n >= 2:
        times = sorted(p.timestamp for p in posts)
        span_days = (times[-1] - times[0]).total_seconds() / 86400
        if span_days > 0:
            posting_frequency = round(n / (span_days / 7), 4)  # posts per week

    return {
        "followers": float(profile.followers),
        "following": float(profile.following),
        "post_count": float(profile.media_count),
        "avg_likes": round(avg_likes, 4),
        "avg_comments": round(avg_comments, 4),
        "engagement_rate": engagement_rate,
        "posting_frequency": posting_frequency,
    }


def top_posts(profile: IgProfile, limit: int = 3) -> list[IgPost]:
    return sorted(profile.posts, key=lambda p: p.likes, reverse=True)[:limit]


# --- Session management (Connect Instagram) ----------------------------------


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
    return {"connected": False, "username": None, "source": None}


def _persist(client, username: str) -> dict:
    client.dump_settings(str(_settings_file(username)))
    _state_file().write_text(json.dumps({"username": username}))
    return {"connected": True, "username": username, "source": "session"}


def login(username: str, password: str) -> dict:
    """Username/password login (handles challenges where possible)."""
    from instagrapi import Client
    from instagrapi.exceptions import (
        BadPassword,
        ChallengeRequired,
        TwoFactorRequired,
    )

    client = Client()
    try:
        client.login(username, password)
    except TwoFactorRequired as exc:
        raise InstagramError(
            "This account uses two-factor auth. Use the sessionid method instead."
        ) from exc
    except BadPassword as exc:
        raise InstagramError("Incorrect Instagram username or password.") from exc
    except ChallengeRequired as exc:
        raise InstagramError(
            "Instagram requires verification for this login. Open Instagram, "
            "approve the login, then use the sessionid method."
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise InstagramError(f"Login failed: {exc}") from exc

    return _persist(client, username)


def login_with_sessionid(sessionid: str) -> dict:
    """Connect using a browser ``sessionid`` cookie (most reliable method)."""
    from instagrapi import Client

    client = Client()
    try:
        client.login_by_sessionid(sessionid.strip())
    except Exception as exc:  # noqa: BLE001
        raise InstagramError(
            f"That sessionid didn't authenticate ({exc}). Make sure you're logged "
            "in to Instagram and copied a fresh sessionid cookie."
        ) from exc

    username = client.username
    if not username:
        try:
            username = client.account_info().username
        except Exception as exc:  # noqa: BLE001
            raise InstagramError(f"Could not read the session account: {exc}") from exc

    return _persist(client, username)


def logout() -> None:
    username = _connected_username()
    if username:
        _settings_file(username).unlink(missing_ok=True)
    _state_file().unlink(missing_ok=True)


def _authenticated_client():
    """Build a client from the saved session or env credentials."""
    from instagrapi import Client

    from app.core.config import settings

    username = _connected_username()
    if username:
        client = Client()
        client.load_settings(str(_settings_file(username)))
        return client
    if settings.instagram_username and settings.instagram_password:
        client = Client()
        client.login(settings.instagram_username, settings.instagram_password)
        return client
    raise NotConnectedError("Connect Instagram before collecting profile data.")


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
            for media in client.user_medias(user.pk, max_posts):
                posts.append(
                    IgPost(
                        shortcode=media.code,
                        likes=media.like_count or 0,
                        comments=media.comment_count or 0,
                        timestamp=media.taken_at,
                        caption=(media.caption_text or "")[:280],
                        url=f"https://www.instagram.com/p/{media.code}/",
                    )
                )
        except Exception:  # noqa: BLE001 - keep profile stats even if posts fail
            posts = []

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
    )


async def _latest_followers(db: AsyncSession, influencer_id) -> float | None:
    row = await db.scalar(
        select(Metric)
        .where(
            Metric.influencer_id == influencer_id,
            Metric.metric_name == "followers",
            Metric.deleted_at.is_(None),
        )
        .order_by(Metric.captured_at.desc())
        .limit(1)
    )
    return float(row.metric_value) if row else None


async def store_post_metrics(
    db: AsyncSession, post: Post, stats: PostStats
) -> tuple[list[Metric], float | None, float | None]:
    """Store post-scoped metrics; returns (rows, engagement_rate, followers).

    Engagement rate = (likes + comments) / followers * 100, using the
    influencer's most recent followers snapshot. Replaces any prior
    Instagram-sourced metrics for this post (manual entries are kept).
    """
    ci = await db.get(CampaignInfluencer, post.campaign_influencer_id)
    followers = await _latest_followers(db, ci.influencer_id) if ci else None

    engagement_rate = (
        round((stats.likes + stats.comments) / followers * 100, 4)
        if followers
        else None
    )

    values: dict[str, float] = {
        "likes": float(stats.likes),
        "comments": float(stats.comments),
    }
    if stats.views is not None:
        values["views"] = float(stats.views)
    if engagement_rate is not None:
        values["engagement_rate"] = engagement_rate

    # Replace previous Instagram-sourced metrics for this post (idempotent
    # re-sync); manual entries always win and are left untouched.
    existing = await db.scalars(
        select(Metric).where(
            Metric.post_id == post.id,
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
        )
        db.add(row)
        rows.append(row)
    await db.flush()
    for row in rows:
        await db.refresh(row)
    return rows, engagement_rate, followers
