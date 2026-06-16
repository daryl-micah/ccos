from fastapi import APIRouter

from app.api.routes import (
    analytics,
    campaign_influencers,
    campaigns,
    deliverables,
    influencers,
    insights,
    metrics,
    posts,
    reports,
)

api_router = APIRouter()
api_router.include_router(campaigns.router)
api_router.include_router(influencers.router)
api_router.include_router(campaign_influencers.router)
api_router.include_router(deliverables.router)
api_router.include_router(posts.router)
api_router.include_router(insights.router)
api_router.include_router(metrics.router)
api_router.include_router(reports.router)
api_router.include_router(analytics.router)
