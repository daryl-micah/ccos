import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import MetricSource
from app.schemas.common import IDTimestamps


class MetricBase(BaseModel):
    campaign_influencer_id: uuid.UUID | None = None
    influencer_id: uuid.UUID | None = None
    post_id: uuid.UUID | None = None
    metric_name: str
    metric_value: Decimal
    source: MetricSource = MetricSource.MANUAL
    captured_at: datetime | None = None


class MetricCreate(MetricBase):
    pass


class MetricUpdate(BaseModel):
    metric_name: str | None = None
    metric_value: Decimal | None = None
    source: MetricSource | None = None
    captured_at: datetime | None = None


class MetricOut(MetricBase, IDTimestamps):
    captured_at: datetime
