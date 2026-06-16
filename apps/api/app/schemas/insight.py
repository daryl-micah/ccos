import uuid

from pydantic import BaseModel

from app.schemas.common import IDTimestamps


class InsightBase(BaseModel):
    campaign_influencer_id: uuid.UUID
    note: str
    created_by: str | None = None


class InsightCreate(InsightBase):
    pass


class InsightUpdate(BaseModel):
    note: str | None = None
    created_by: str | None = None


class InsightOut(InsightBase, IDTimestamps):
    pass
