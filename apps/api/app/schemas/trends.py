from datetime import datetime

from pydantic import BaseModel


class TrendPoint(BaseModel):
    captured_at: datetime
    value: float
