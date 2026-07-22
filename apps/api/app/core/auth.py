"""Clerk session-token verification.

Verifies the RS256 session JWT Clerk issues per request against Clerk's
Backend API JWKS endpoint (authenticated with the secret key), so we never
need to know the instance's frontend-api/custom domain to validate
signatures — the same code works in dev and prod. See PRODUCT.md Decisions
Log ("Team-workspace isolation via Clerk Organizations").
"""

import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWK

from app.core.config import settings

_JWKS_TTL_SECONDS = 3600

_jwks_cache: dict[str, PyJWK] = {}
_jwks_fetched_at: float = 0.0


async def _refresh_jwks() -> None:
    global _jwks_fetched_at

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(
            settings.clerk_jwks_url,
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
        )
        resp.raise_for_status()

    _jwks_cache.clear()
    for key in resp.json()["keys"]:
        _jwks_cache[key["kid"]] = PyJWK.from_dict(key)
    _jwks_fetched_at = time.monotonic()


async def _get_signing_key(kid: str) -> PyJWK:
    """Return the JWK for ``kid``, refreshing the cache on a miss or TTL expiry."""
    if kid not in _jwks_cache or time.monotonic() - _jwks_fetched_at > _JWKS_TTL_SECONDS:
        await _refresh_jwks()

    if kid not in _jwks_cache:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown signing key")

    return _jwks_cache[kid]


async def get_current_claims(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """FastAPI dependency: verify the bearer token and return its claims."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")

    token = authorization.removeprefix("Bearer ")

    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed token") from exc

    kid = header.get("kid")
    if not kid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed token")

    signing_key = await _get_signing_key(kid)

    try:
        claims = jwt.decode(
            token,
            key=signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc

    return claims


@dataclass
class Tenant:
    """Identity extracted from a verified Clerk session token."""

    user_id: str
    org_id: str
    org_role: str


async def get_tenant(claims: dict[str, Any] = Depends(get_current_claims)) -> Tenant:
    """FastAPI dependency: the caller's user id and active organization.

    Users are forced into an org right after sign-up (no personal ungrouped
    mode — see PRODUCT.md), so a verified session without an active org means
    the frontend let a request through before onboarding finished. Reject
    rather than silently proceeding without a tenant.

    Clerk's default session token (v2, since April 2025) nests organization
    data under a short "o" claim (``o.id``/``o.rol``) instead of the old
    top-level ``org_id``/``org_role``; fall back to the old shape too in case
    a JWT template overrides this.
    """
    org = claims.get("o") or {}
    org_id = org.get("id") or claims.get("org_id")
    if not org_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No active organization")

    return Tenant(
        user_id=claims["sub"],
        org_id=org_id,
        org_role=org.get("rol") or claims.get("org_role", ""),
    )
