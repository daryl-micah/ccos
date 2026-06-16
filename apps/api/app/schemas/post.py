import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import Platform
from app.schemas.common import IDTimestamps


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
