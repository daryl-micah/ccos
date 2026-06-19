from pydantic import BaseModel

from app.schemas.common import IDTimestamps


class AgencyBase(BaseModel):
    name: str
    notes: str | None = None


class AgencyCreate(AgencyBase):
    pass


class AgencyUpdate(BaseModel):
    name: str | None = None
    notes: str | None = None


class AgencyOut(AgencyBase, IDTimestamps):
    pass
