from fastapi import APIRouter

from app.schemas.youtube import YouTubeStatus
from app.services import youtube

router = APIRouter(prefix="/youtube", tags=["youtube"])


@router.get("/status", response_model=YouTubeStatus)
async def youtube_status():
    return youtube.get_status()
