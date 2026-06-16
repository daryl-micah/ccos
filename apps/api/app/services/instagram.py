"""Instagram collector (REQUIREMENT_DOC Phase 3).

Uses Instaloader to scrape a public profile — no Facebook Graph API
credentials required (Instagram may still anonymously rate-limit). Fetched
aggregates are stored as influencer-scoped metrics with ``source=instagram``;
each sync is a timestamped snapshot, which doubles as the Phase 5 history.

Manual overrides always win — these collected values never delete or
overwrite manually-entered metrics.
"""

import json
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Influencer, Metric
from app.models.enums import MetricSource

DEFAULT_MAX_POSTS = 12


class InstagramError(Exception):
    """Raised when a profile can't be fetched (private, missing, blocked)."""


class NotConnectedError(InstagramError):
    """Raised when an Instagram action is attempted without a login session."""


# --- Session management (Connect Instagram) ----------------------------------


def _session_dir() -> Path:
    from app.core.config import settings

    p = Path(settings.instagram_session_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p


def _state_file() -> Path:
    return _session_dir() / "state.json"


def _session_file(username: str) -> Path:
    return _session_dir() / f"{username}.session"


def _connected_username() -> str | None:
    sf = _state_file()
    if sf.exists():
        try:
            username = json.loads(sf.read_text()).get("username")
        except Exception:  # noqa: BLE001
            return None
        if username and _session_file(username).exists():
            return username
    return None


def get_status() -> dict:
    """Return {connected, username, source}."""
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


def _new_loader():
    import instaloader

    return instaloader.Instaloader(
        quiet=True,
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
    )


def login(username: str, password: str) -> dict:
    """Log in to Instagram and persist the session (not the password)."""
    import instaloader

    loader = _new_loader()
    try:
        loader.login(username, password)
    except instaloader.exceptions.TwoFactorAuthRequiredException as exc:
        raise InstagramError(
            "This account uses two-factor auth, which isn't supported yet. "
            "Use an account without 2FA."
        ) from exc
    except instaloader.exceptions.BadCredentialsException as exc:
        raise InstagramError("Incorrect Instagram username or password.") from exc
    except instaloader.exceptions.ConnectionException as exc:
        raise InstagramError(
            f"Instagram blocked the login (likely a checkpoint/challenge): {exc}"
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise InstagramError(f"Login failed: {exc}") from exc

    loader.save_session_to_file(str(_session_file(username)))
    _state_file().write_text(json.dumps({"username": username}))
    return {"connected": True, "username": username, "source": "session"}


def logout() -> None:
    username = _connected_username()
    if username:
        _session_file(username).unlink(missing_ok=True)
    _state_file().unlink(missing_ok=True)


def _authenticated_loader():
    """Build a loader with the saved session or env credentials."""
    from app.core.config import settings

    loader = _new_loader()
    username = _connected_username()
    if username:
        loader.load_session_from_file(username, str(_session_file(username)))
        return loader
    if settings.instagram_username and settings.instagram_password:
        loader.login(settings.instagram_username, settings.instagram_password)
        return loader
    raise NotConnectedError("Connect Instagram before collecting profile data.")


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


def compute_profile_metrics(profile: IgProfile) -> dict[str, float]:
    """Pure aggregation over a fetched profile (testable without network)."""
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


def fetch_profile(username: str, max_posts: int = DEFAULT_MAX_POSTS) -> IgProfile:
    """Fetch a profile + recent posts via an authenticated Instaloader session."""
    import instaloader

    loader = _authenticated_loader()  # raises NotConnectedError if not logged in

    try:
        profile = instaloader.Profile.from_username(loader.context, username)
    except instaloader.exceptions.ProfileNotExistsException as exc:
        raise InstagramError(f"Instagram profile '@{username}' does not exist.") from exc
    except instaloader.exceptions.ConnectionException as exc:
        raise InstagramError(
            "Instagram blocked or rate-limited the request. Try again later."
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise InstagramError(f"Could not load '@{username}': {exc}") from exc

    posts: list[IgPost] = []
    if not profile.is_private:
        try:
            for i, post in enumerate(profile.get_posts()):
                if i >= max_posts:
                    break
                posts.append(
                    IgPost(
                        shortcode=post.shortcode,
                        likes=post.likes,
                        comments=post.comments,
                        timestamp=post.date_utc,
                        caption=(post.caption or "")[:280],
                        url=f"https://www.instagram.com/p/{post.shortcode}/",
                    )
                )
        except Exception as exc:  # noqa: BLE001
            raise InstagramError(
                f"Loaded the profile but could not read posts: {exc}"
            ) from exc

    return IgProfile(
        username=profile.username,
        followers=profile.followers,
        following=profile.followees,
        media_count=profile.mediacount,
        is_private=profile.is_private,
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
