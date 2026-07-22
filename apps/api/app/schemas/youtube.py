from datetime import datetime

from pydantic import BaseModel

from app.schemas.metric import MetricOut


class YouTubeStatus(BaseModel):
    configured: bool


class YouTubeVideoOut(BaseModel):
    video_id: str
    title: str
    url: str
    published_at: datetime | None = None
    views: int | None = None
    likes: int | None = None
    comments: int | None = None


class YouTubeSyncResult(BaseModel):
    channel_id: str
    title: str
    handle: str | None = None
    subscribers: int | None = None
    total_views: int | None = None
    video_count: int | None = None
    avg_views: float
    avg_likes: float | None = None
    avg_comments: float | None = None
    engagement_rate: float | None = None
    engagement_rate_reach: float | None = None
    upload_frequency: float
    top_videos: list[YouTubeVideoOut]
    metrics: list[MetricOut]
