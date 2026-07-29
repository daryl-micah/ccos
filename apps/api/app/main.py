from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.routes import beta_applications
from app.core.config import settings

app = FastAPI(
    title="CCOS API",
    description="Creator Campaign Operating System — campaign-centric influencer CRM",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials="*" not in settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.env}


app.include_router(api_router, prefix=settings.api_v1_prefix)

# Outside api_router: an applicant has no org yet, so api_router's blanket
# get_tenant dependency would 403 every request before it reached here.
app.include_router(
    beta_applications.router, prefix=settings.api_v1_prefix, tags=["applications"]
)
