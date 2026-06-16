from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import CampaignStatus
from app.schemas.common import IDTimestamps


class CampaignBase(BaseModel):
    name: str
    brand: str | None = None
    objective: str | None = None
    budget: Decimal | None = None
    status: CampaignStatus = CampaignStatus.DRAFT
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: str | None = None
    brand: str | None = None
    objective: str | None = None
    budget: Decimal | None = None
    status: CampaignStatus | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None


class CampaignOut(CampaignBase, IDTimestamps):
    pass
