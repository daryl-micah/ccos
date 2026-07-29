"""Minimal Clerk Backend API client for writes auth.py doesn't need.

Server-side only — writes land in ``publicMetadata``, which Clerk exposes
read-only to the browser SDK and (once added to session-token claims in the
Clerk Dashboard) readable by ``proxy.ts`` without a network round-trip. Never
write gating state to ``unsafeMetadata``; that field is browser-writable and
would let a user self-approve. See PRODUCT.md Decisions Log ("Gated
private-beta onboarding — approval is organization creation").
"""

import httpx

from app.core.config import settings

_BASE_URL = "https://api.clerk.com/v1"


async def set_public_metadata(clerk_user_id: str, metadata: dict) -> None:
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.patch(
            f"{_BASE_URL}/users/{clerk_user_id}/metadata",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
            json={"public_metadata": metadata},
        )
        resp.raise_for_status()
