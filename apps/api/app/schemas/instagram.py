from datetime import datetime

from pydantic import BaseModel

from app.schemas.metric import MetricOut


class InstagramStatus(BaseModel):
    connected: bool
    username: str | None = None
    source: str | None = None


class InstagramLoginRequest(BaseModel):
    username: str
    password: str


class InstagramPostOut(BaseModel):
    shortcode: str
    likes: int
    comments: int
    timestamp: datetime
    caption: str
    url: str


class InstagramSyncResult(BaseModel):
    username: str
    is_private: bool
    followers: int
    following: int
    post_count: int
    avg_likes: float
    avg_comments: float
    engagement_rate: float
    posting_frequency: float
    top_posts: list[InstagramPostOut]
    metrics: list[MetricOut]
