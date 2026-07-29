from pydantic import BaseModel

from app.schemas.common import IDTimestamps


class BetaApplicationCreate(BaseModel):
    company_name: str
    role: str | None = None
    team_size: str | None = None
    current_workflow: str | None = None
    creators_managed: str | None = None
    goal: str | None = None
    referrer: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None


class BetaApplicationOut(IDTimestamps):
    status: str
