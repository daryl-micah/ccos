from enum import StrEnum


class CampaignStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"


class CampaignInfluencerStatus(StrEnum):
    PLANNED = "planned"
    NEGOTIATING = "negotiating"
    CONFIRMED = "confirmed"
    POSTED = "posted"
    COMPLETED = "completed"


class DeliverableType(StrEnum):
    REEL = "reel"
    STORY = "story"
    CAROUSEL = "carousel"
    YOUTUBE_SHORT = "youtube_short"
    YOUTUBE_VIDEO = "youtube_video"


class DeliverableStatus(StrEnum):
    PENDING = "pending"
    POSTED = "posted"
    COMPLETED = "completed"


class Platform(StrEnum):
    INSTAGRAM = "instagram"
    YOUTUBE = "youtube"
    OTHER = "other"


class MetricSource(StrEnum):
    MANUAL = "manual"
    INSTAGRAM = "instagram"
    YOUTUBE = "youtube"
    FIREBASE = "firebase"
    APPSFLYER = "appsflyer"
    BRANCH = "branch"
    CALCULATED = "calculated"
