import asyncio

from fastapi import APIRouter, HTTPException, status

from app.schemas.instagram import (
    InstagramLoginRequest,
    InstagramStatus,
)
from app.services import instagram

router = APIRouter(prefix="/instagram", tags=["instagram"])


@router.get("/status", response_model=InstagramStatus)
async def instagram_status():
    return instagram.get_status()


@router.post("/login", response_model=InstagramStatus)
async def instagram_login(body: InstagramLoginRequest):
    """Connect Instagram. Prefer a browser ``sessionid`` (Instagram blocks
    Instaloader's username/password login); persists only the session."""
    try:
        if body.sessionid:
            result = await asyncio.to_thread(
                instagram.login_with_sessionid, body.sessionid
            )
        elif body.username and body.password:
            result = await asyncio.to_thread(
                instagram.login, body.username.strip(), body.password
            )
        else:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Provide a sessionid, or both username and password.",
            )
    except instagram.InstagramError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return result


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def instagram_logout():
    await asyncio.to_thread(instagram.logout)


@router.post("/collect-now")
async def collect_now():
    """Queue a snapshot of every influencer's Instagram stats (needs a worker)."""
    from app.worker import celery_app

    result = celery_app.send_task("app.tasks.collect_all_instagram")
    return {"task_id": result.id, "status": "queued"}
