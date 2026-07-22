"""YouTube Data API v3 collector (PRODUCT.md Phase 4).

Stores public channel snapshots and live-video stats as generic metrics with
``source=youtube``. V1 uses a server-side API key only, so it deliberately
collects public statistics, not private YouTube Analytics data.
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from urllib.parse import parse_qs, urlparse

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import CampaignInfluencer, Influencer, Metric, Post
from app.models.enums import MetricSource

API_BASE = "https://www.googleapis.com/youtube/v3"
DEFAULT_MAX_VIDEOS = 30


class YouTubeError(Exception):
    """Raised when YouTube data cannot be fetched or normalized."""


class NotConfiguredError(YouTubeError):
    """Raised when a YouTube API call is attempted without an API key."""


@dataclass
class YouTubeVideo:
    video_id: str
    title: str
    url: str
    published_at: datetime | None
    views: int | None
    likes: int | None
    comments: int | None


@dataclass
class YouTubeChannel:
    channel_id: str
    title: str
    handle: str | None
    subscribers: int | None
    total_views: int | None
    video_count: int | None
    uploads_playlist_id: str
    videos: list[YouTubeVideo]


@dataclass
class YouTubePostStats:
    video_id: str
    title: str
    url: str
    published_at: datetime | None
    views: int | None
    likes: int | None
    comments: int | None


def get_status() -> dict[str, bool]:
    return {"configured": bool(settings.youtube_api_key)}


def _require_key() -> str:
    if not settings.youtube_api_key:
        raise NotConfiguredError("Set YOUTUBE_API_KEY to enable YouTube collection.")
    return settings.youtube_api_key


def _int_or_none(value) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def normalize_channel_identifier(raw: str) -> tuple[str, str]:
    value = raw.strip()
    if not value:
        raise YouTubeError("Add a YouTube handle, channel URL, or channel ID.")

    if value.startswith("UC") and len(value) >= 20:
        return "id", value
    if value.startswith("@"):
        return "handle", value[1:].strip("/")

    parsed = urlparse(value if "://" in value else f"https://{value}")
    host = parsed.netloc.lower().removeprefix("www.")
    parts = [p for p in parsed.path.split("/") if p]
    if host in {"youtube.com", "m.youtube.com", "music.youtube.com"}:
        if parts and parts[0] == "channel" and len(parts) >= 2:
            return "id", parts[1]
        if parts and parts[0].startswith("@"):
            return "handle", parts[0][1:]
        raise YouTubeError(
            "Use a YouTube @handle, /channel/UC... URL, or channel ID. "
            "Custom /c/ URLs are not resolved in v1."
        )

    if "/" not in value and " " not in value:
        return "handle", value.removeprefix("@")
    raise YouTubeError("Use a YouTube @handle, channel URL, or channel ID.")


def extract_video_id(raw: str) -> str:
    parsed = urlparse(raw.strip() if "://" in raw else f"https://{raw.strip()}")
    host = parsed.netloc.lower().removeprefix("www.")
    parts = [p for p in parsed.path.split("/") if p]

    if host in {"youtu.be"} and parts:
        return parts[0]
    if host in {"youtube.com", "m.youtube.com", "music.youtube.com"}:
        if parts and parts[0] in {"shorts", "embed", "live"} and len(parts) >= 2:
            return parts[1]
        query_id = parse_qs(parsed.query).get("v", [None])[0]
        if query_id:
            return query_id
    raise YouTubeError("Use a valid YouTube watch, Shorts, live, embed, or youtu.be URL.")


async def _get(client: httpx.AsyncClient, path: str, params: dict) -> dict:
    params = {**params, "key": _require_key()}
    try:
        res = await client.get(f"{API_BASE}/{path}", params=params)
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:300]
        raise YouTubeError(f"YouTube API returned {exc.response.status_code}: {detail}") from exc
    except httpx.HTTPError as exc:
        raise YouTubeError(f"Could not reach YouTube API: {exc}") from exc
    return res.json()


def _video_from_item(item: dict) -> YouTubeVideo:
    snippet = item.get("snippet") or {}
    stats = item.get("statistics") or {}
    video_id = item["id"]
    return YouTubeVideo(
        video_id=video_id,
        title=snippet.get("title") or video_id,
        url=f"https://www.youtube.com/watch?v={video_id}",
        published_at=_parse_dt(snippet.get("publishedAt")),
        views=_int_or_none(stats.get("viewCount")),
        likes=_int_or_none(stats.get("likeCount")),
        comments=_int_or_none(stats.get("commentCount")),
    )


async def fetch_video(video_url: str) -> YouTubePostStats:
    video_id = extract_video_id(video_url)
    async with httpx.AsyncClient(timeout=20) as client:
        data = await _get(
            client,
            "videos",
            {"part": "snippet,statistics", "id": video_id, "maxResults": 1},
        )
    items = data.get("items") or []
    if not items:
        raise YouTubeError("That YouTube video was not found or is not public.")
    video = _video_from_item(items[0])
    return YouTubePostStats(
        video_id=video.video_id,
        title=video.title,
        url=video.url,
        published_at=video.published_at,
        views=video.views,
        likes=video.likes,
        comments=video.comments,
    )


async def fetch_channel(
    raw_identifier: str, max_videos: int = DEFAULT_MAX_VIDEOS
) -> YouTubeChannel:
    kind, identifier = normalize_channel_identifier(raw_identifier)
    channel_params = {
        "part": "snippet,statistics,contentDetails",
        "maxResults": 1,
    }
    channel_params["id" if kind == "id" else "forHandle"] = identifier

    async with httpx.AsyncClient(timeout=25) as client:
        data = await _get(client, "channels", channel_params)
        items = data.get("items") or []
        if not items:
            raise YouTubeError("That YouTube channel was not found or is not public.")

        channel = items[0]
        snippet = channel.get("snippet") or {}
        stats = channel.get("statistics") or {}
        content = channel.get("contentDetails") or {}
        related = content.get("relatedPlaylists") or {}
        uploads = related.get("uploads")
        if not uploads:
            raise YouTubeError("Could not find the channel uploads playlist.")

        video_ids: list[str] = []
        next_token: str | None = None
        while len(video_ids) < max_videos:
            playlist_data = await _get(
                client,
                "playlistItems",
                {
                    "part": "snippet,contentDetails",
                    "playlistId": uploads,
                    "maxResults": min(50, max_videos - len(video_ids)),
                    **({"pageToken": next_token} if next_token else {}),
                },
            )
            for item in playlist_data.get("items") or []:
                video_id = (
                    (item.get("contentDetails") or {}).get("videoId")
                    or ((item.get("snippet") or {}).get("resourceId") or {}).get("videoId")
                )
                if video_id:
                    video_ids.append(video_id)
            next_token = playlist_data.get("nextPageToken")
            if not next_token:
                break

        videos: list[YouTubeVideo] = []
        for start in range(0, len(video_ids), 50):
            batch = video_ids[start : start + 50]
            video_data = await _get(
                client,
                "videos",
                {"part": "snippet,statistics", "id": ",".join(batch), "maxResults": 50},
            )
            videos.extend(_video_from_item(item) for item in video_data.get("items") or [])

    hidden_subscribers = bool(stats.get("hiddenSubscriberCount"))
    return YouTubeChannel(
        channel_id=channel["id"],
        title=snippet.get("title") or channel["id"],
        handle=snippet.get("customUrl"),
        subscribers=None if hidden_subscribers else _int_or_none(stats.get("subscriberCount")),
        total_views=_int_or_none(stats.get("viewCount")),
        video_count=_int_or_none(stats.get("videoCount")),
        uploads_playlist_id=uploads,
        videos=videos,
    )


def compute_channel_metrics(channel: YouTubeChannel) -> dict[str, float]:
    videos = channel.videos
    views = [v.views for v in videos if v.views is not None]
    likes = [v.likes for v in videos if v.likes is not None]
    comments = [v.comments for v in videos if v.comments is not None]

    avg_views = sum(views) / len(views) if views else 0.0
    avg_likes = sum(likes) / len(likes) if likes else None
    avg_comments = sum(comments) / len(comments) if comments else None

    result: dict[str, float] = {
        "avg_views": round(avg_views, 4),
        "upload_frequency": upload_frequency(videos),
    }
    if channel.subscribers is not None:
        result["subscribers"] = float(channel.subscribers)
    if channel.total_views is not None:
        result["total_views"] = float(channel.total_views)
    if channel.video_count is not None:
        result["video_count"] = float(channel.video_count)
    if avg_likes is not None:
        result["avg_likes"] = round(avg_likes, 4)
    if avg_comments is not None:
        result["avg_comments"] = round(avg_comments, 4)
    if channel.subscribers and (avg_likes is not None or avg_comments is not None):
        result["engagement_rate"] = round(
            ((avg_likes or 0) + (avg_comments or 0)) / channel.subscribers * 100,
            4,
        )
    reach_ers = [
        ((v.likes or 0) + (v.comments or 0)) / v.views * 100
        for v in videos
        if v.views and (v.likes is not None or v.comments is not None)
    ]
    if reach_ers:
        result["engagement_rate_reach"] = round(sum(reach_ers) / len(reach_ers), 4)
    return result


def upload_frequency(videos: list[YouTubeVideo]) -> float:
    dated = sorted(v.published_at for v in videos if v.published_at is not None)
    if len(dated) < 2:
        return 0.0
    span_days = (dated[-1] - dated[0]).total_seconds() / 86400
    return round(len(dated) / (span_days / 7), 4) if span_days > 0 else 0.0


def top_videos(channel: YouTubeChannel, limit: int = 3) -> list[YouTubeVideo]:
    return sorted(channel.videos, key=lambda v: v.views or 0, reverse=True)[:limit]


async def store_channel_metrics(
    db: AsyncSession, influencer: Influencer, channel: YouTubeChannel
) -> tuple[list[Metric], dict[str, float]]:
    computed = compute_channel_metrics(channel)
    influencer.youtube_channel_id = channel.channel_id
    rows: list[Metric] = []
    for name, value in computed.items():
        row = Metric(
            influencer_id=influencer.id,
            metric_name=name,
            metric_value=Decimal(str(value)),
            source=MetricSource.YOUTUBE,
            org_id=influencer.org_id,
        )
        db.add(row)
        rows.append(row)
    await db.flush()
    for row in rows:
        await db.refresh(row)
    return rows, computed


async def _latest_subscribers(db: AsyncSession, influencer_id, org_id: str) -> float | None:
    row = await db.scalar(
        select(Metric)
        .where(
            Metric.influencer_id == influencer_id,
            Metric.org_id == org_id,
            Metric.metric_name == "subscribers",
            Metric.source == MetricSource.YOUTUBE,
            Metric.deleted_at.is_(None),
        )
        .order_by(Metric.captured_at.desc())
        .limit(1)
    )
    return float(row.metric_value) if row else None


async def store_post_metrics(
    db: AsyncSession, post: Post, stats: YouTubePostStats
) -> tuple[list[Metric], float | None]:
    ci = await db.get(CampaignInfluencer, post.campaign_influencer_id)
    subscribers = (
        await _latest_subscribers(db, ci.influencer_id, post.org_id) if ci else None
    )

    values: dict[str, float] = {}
    if stats.likes is not None:
        values["likes"] = float(stats.likes)
    if stats.comments is not None:
        values["comments"] = float(stats.comments)
    if stats.views is not None:
        values["views"] = float(stats.views)

    existing = await db.scalars(
        select(Metric).where(
            Metric.post_id == post.id,
            Metric.org_id == post.org_id,
            Metric.source == MetricSource.YOUTUBE,
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
            source=MetricSource.YOUTUBE,
            org_id=post.org_id,
        )
        db.add(row)
        rows.append(row)
    await db.flush()
    for row in rows:
        await db.refresh(row)
    return rows, subscribers
