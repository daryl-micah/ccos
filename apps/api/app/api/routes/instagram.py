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
    """Connect Instagram by logging in; persists a session (not the password)."""
    try:
        result = await asyncio.to_thread(
            instagram.login, body.username.strip(), body.password
        )
    except instagram.InstagramError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return result


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def instagram_logout():
    await asyncio.to_thread(instagram.logout)
