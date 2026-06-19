import uuid
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import CRUD
from app.models import Influencer
from app.schemas.influencer import InfluencerCreate, InfluencerOut
from app.services.imports import parse_influencer_rows
from app.services.reports import (
    build_campaign_creators_report,
    build_campaign_posts_report,
    build_campaign_report,
    build_tracker_report,
)

router = APIRouter(tags=["reports"])

XLSX_MEDIA_TYPE = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)

influencer_crud = CRUD(Influencer)


def _xlsx_response(buf, filename: str) -> StreamingResponse:
    return StreamingResponse(
        buf,
        media_type=XLSX_MEDIA_TYPE,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"
        },
    )


@router.get("/export/campaigns/{campaign_id}")
async def export_campaign(
    campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    """Download a full Excel workbook (creators, deliverables, posts, metrics)."""
    result = await build_campaign_report(db, campaign_id)
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    return _xlsx_response(*result)


@router.get("/export/campaigns/{campaign_id}/creators")
async def export_campaign_creators(
    campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    """Campaign-wise creators Excel (one row per creator + metrics)."""
    result = await build_campaign_creators_report(db, campaign_id)
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    return _xlsx_response(*result)


@router.get("/export/campaigns/{campaign_id}/posts")
async def export_campaign_posts(
    campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    """Campaign-wise posts Excel (one row per live post + metrics)."""
    result = await build_campaign_posts_report(db, campaign_id)
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    return _xlsx_response(*result)


@router.get("/export/tracker")
async def export_tracker(db: AsyncSession = Depends(get_db)):
    """Overall campaigns tracker Excel (all campaigns, aggregated)."""
    buf, filename = await build_tracker_report(db)
    return _xlsx_response(buf, filename)


class ImportResult(BaseModel):
    created: int
    created_influencers: list[InfluencerOut]


@router.post("/import/influencers", response_model=ImportResult)
async def import_influencers(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
):
    """Bulk-create influencers from a CSV or Excel upload."""
    content = await file.read()
    try:
        rows = parse_influencer_rows(file.filename or "upload", content)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - surface parse failures to the client
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Could not read file: {exc}"
        ) from exc

    if not rows:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No rows with a name column were found.",
        )

    created = [
        await influencer_crud.create(db, InfluencerCreate(**row)) for row in rows
    ]
    return ImportResult(created=len(created), created_influencers=created)
