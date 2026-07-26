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


class CampaignInfluencerResults(BaseModel):
    """Creator-in-campaign conversion & revenue inputs (manual, CI-level).

    These feed the derived-metric engine so ROAS / CPA / CPM populate. Only
    fields that are present are touched; a present ``null`` clears that metric.
    """

    revenue: Decimal | None = None
    installs: Decimal | None = None
    leads: Decimal | None = None
    bookings: Decimal | None = None
    purchases: Decimal | None = None
    impressions: Decimal | None = None
