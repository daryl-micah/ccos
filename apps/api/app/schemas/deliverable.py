import uuid
from datetime import date

from pydantic import BaseModel

from app.models.enums import DeliverableStatus, DeliverableType
from app.schemas.common import IDTimestamps


class DeliverableBase(BaseModel):
    campaign_influencer_id: uuid.UUID
    type: DeliverableType
    quantity: int = 1
    due_date: date | None = None
    posted_date: date | None = None
    status: DeliverableStatus = DeliverableStatus.PENDING
    link: str | None = None


class DeliverableCreate(DeliverableBase):
    pass


class DeliverableUpdate(BaseModel):
    type: DeliverableType | None = None
    quantity: int | None = None
    due_date: date | None = None
    posted_date: date | None = None
    status: DeliverableStatus | None = None
    link: str | None = None


class DeliverableOut(DeliverableBase, IDTimestamps):
    pass
