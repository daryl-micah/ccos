from fastapi import APIRouter, BackgroundTasks

from app.schemas.instagram import InstagramStatus
from app.services import instagram
from app.tasks import collect_all_instagram

router = APIRouter(prefix="/instagram", tags=["instagram"])


@router.get("/status", response_model=InstagramStatus)
async def instagram_status():
    return instagram.get_status()


@router.post("/collect-now")
async def collect_now(background_tasks: BackgroundTasks):
    """Snapshot every influencer's Instagram stats in the background."""
    background_tasks.add_task(collect_all_instagram)
    return {"status": "started"}
