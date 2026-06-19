import uuid
from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import CampaignInfluencerStatus
from app.schemas.common import IDTimestamps


class CampaignInfluencerBase(BaseModel):
    campaign_id: uuid.UUID
    influencer_id: uuid.UUID
    agency_id: uuid.UUID | None = None  # null = in-house ("closed by")
    cost: Decimal | None = None
    deliverables: str | None = None
    status: CampaignInfluencerStatus = CampaignInfluencerStatus.PLANNED
    remarks: str | None = None


class CampaignInfluencerCreate(CampaignInfluencerBase):
    pass


class CampaignInfluencerUpdate(BaseModel):
    agency_id: uuid.UUID | None = None
    cost: Decimal | None = None
    deliverables: str | None = None
    status: CampaignInfluencerStatus | None = None
    remarks: str | None = None


class CampaignInfluencerOut(CampaignInfluencerBase, IDTimestamps):
    pass
