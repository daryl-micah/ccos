import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import Platform
from app.schemas.common import IDTimestamps
from app.schemas.metric import MetricOut


class PostBase(BaseModel):
    campaign_influencer_id: uuid.UUID
    deliverable_id: uuid.UUID | None = None
    url: str
    platform: Platform = Platform.INSTAGRAM
    posted_at: datetime | None = None
    notes: str | None = None


class PostCreate(PostBase):
    pass


class PostUpdate(BaseModel):
    deliverable_id: uuid.UUID | None = None
    url: str | None = None
    platform: Platform | None = None
    posted_at: datetime | None = None
    notes: str | None = None


class PostOut(PostBase, IDTimestamps):
    pass


class PostMetricsResult(BaseModel):
    likes: int
    comments: int
    views: int | None = None
    engagement_rate: float | None = None
    followers: int | None = None
    shares_available: bool = False  # Instagram doesn't expose shares/reposts
    metrics: list[MetricOut]
