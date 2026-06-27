"""AI insights layer (PRODUCT.md Phase 8) — powered by Groq.

Feeds the cross-campaign analytics into a Groq LLM and asks for
natural-language insights + recommendations. Disabled (clear error) when
no GROQ_API_KEY is configured.
"""

import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services import analytics

PROVIDER = "groq"


class AINotConfiguredError(Exception):
    """Raised when the Groq API key is not set."""


def get_status() -> dict:
    return {
        "configured": bool(settings.groq_api_key),
        "provider": PROVIDER,
        "model": settings.groq_model,
    }


SYSTEM_PROMPT = (
    "You are a sharp influencer-marketing analyst for a campaign management "
    "platform. You are given aggregated, anonymised campaign performance data "
    "as JSON. Analyse it and respond with a single JSON object — no prose "
    "outside the JSON — using exactly this shape:\n"
    "{\n"
    '  "summary": "2-3 sentence executive summary",\n'
    '  "insights": ["punchy data-grounded observation", ...],\n'
    '  "recommendations": [{"question": "...", "answer": "..."}, ...]\n'
    "}\n"
    "Ground every claim in the numbers provided (ROAS, CPV, spend, revenue, "
    "engagement). Answer these questions in recommendations: which creators to "
    "retain, which underperformed, which campaign delivered the best ROI, and "
    "which city deserves more budget. If data is sparse, say so honestly. "
    "Currency is INR (₹). Keep it concise and actionable."
)


async def generate_insights(db: AsyncSession) -> dict:
    if not settings.groq_api_key:
        raise AINotConfiguredError(
            "AI insights are not configured. Set GROQ_API_KEY to enable."
        )

    creators, cities, categories, campaigns = (
        await analytics.creator_rankings(db),
        await analytics.city_rankings(db),
        await analytics.category_rankings(db),
        await analytics.campaign_rankings(db),
    )
    data = {
        "creators": creators[:25],
        "cities": cities[:25],
        "categories": categories[:25],
        "campaigns": campaigns[:25],
    }

    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.groq_api_key, timeout=30.0)
    completion = await client.chat.completions.create(
        model=settings.groq_model,
        temperature=0.4,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": "Here is the campaign analytics data as JSON:\n"
                + json.dumps(data, default=str),
            },
        ],
    )

    content = completion.choices[0].message.content or "{}"
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        parsed = {"summary": content, "insights": [], "recommendations": []}

    return {
        "summary": parsed.get("summary", ""),
        "insights": parsed.get("insights", []),
        "recommendations": parsed.get("recommendations", []),
        "model": settings.groq_model,
    }
