from fastapi import APIRouter

from app.schemas.instagram import InstagramStatus
from app.services import instagram

router = APIRouter(prefix="/instagram", tags=["instagram"])


@router.get("/status", response_model=InstagramStatus)
async def instagram_status():
    return instagram.get_status()


@router.post("/collect-now")
async def collect_now():
    """Queue a snapshot of every influencer's Instagram stats (needs a worker)."""
    from app.worker import celery_app

    result = celery_app.send_task("app.tasks.collect_all_instagram")
    return {"task_id": result.id, "status": "queued"}
