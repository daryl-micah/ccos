from fastapi import APIRouter, Depends

from app.api.routes import (
    agencies,
    ai,
    analytics,
    campaign_influencers,
    campaigns,
    deliverables,
    influencers,
    insights,
    instagram,
    metrics,
    posts,
    reports,
)
from app.core.auth import get_tenant

# Every route below requires a verified Clerk session with an active org.
# Query results aren't yet filtered by org_id (Phase 4) — this only enforces
# the "no anonymous / no orgless access" boundary.
api_router = APIRouter(dependencies=[Depends(get_tenant)])
api_router.include_router(agencies.router)
api_router.include_router(campaigns.router)
api_router.include_router(influencers.router)
api_router.include_router(campaign_influencers.router)
api_router.include_router(deliverables.router)
api_router.include_router(posts.router)
api_router.include_router(insights.router)
api_router.include_router(metrics.router)
api_router.include_router(reports.router)
api_router.include_router(analytics.router)
api_router.include_router(instagram.router)
api_router.include_router(ai.router)
