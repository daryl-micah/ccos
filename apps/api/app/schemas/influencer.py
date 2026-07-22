from pydantic import BaseModel

from app.schemas.common import IDTimestamps


class InfluencerBase(BaseModel):
    name: str
    instagram_username: str | None = None
    youtube_channel: str | None = None
    youtube_channel_id: str | None = None
    city: str | None = None
    country: str | None = None
    category: str | None = None
    language: str | None = None
    manager_name: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None


class InfluencerCreate(InfluencerBase):
    pass


class InfluencerUpdate(BaseModel):
    name: str | None = None
    instagram_username: str | None = None
    youtube_channel: str | None = None
    youtube_channel_id: str | None = None
    city: str | None = None
    country: str | None = None
    category: str | None = None
    language: str | None = None
    manager_name: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None


class InfluencerOut(InfluencerBase, IDTimestamps):
    pass
