"""One-off job runner for Heroku Scheduler (no Celery/Redis broker), and the
manual private-beta approval commands (PRODUCT.md, "Gated private-beta
onboarding — approval is organization creation").

Usage:  uv run python -m app.cli <job-name> [arg]
"""

import asyncio
import sys

from app.services.beta_applications import approve, list_pending
from app.tasks import collect_all_instagram, collect_all_youtube, recompute_all_metrics

JOBS = {
    "snapshot": lambda: collect_all_instagram(),
    "youtube-snapshot": lambda: collect_all_youtube(),
    "recompute-metrics": lambda: recompute_all_metrics(),
    "list-pending": lambda: list_pending(),
}

# Commands that take a positional argument (e.g. `approve <clerk_user_id>`).
ARG_JOBS = {
    "approve": approve,
}


def main() -> None:
    argv = sys.argv[1:]
    usage = (
        f"usage: python -m app.cli <{'|'.join(JOBS)}>\n"
        f"       python -m app.cli approve <clerk_user_id>"
    )

    if len(argv) == 1 and argv[0] in JOBS:
        result = asyncio.run(JOBS[argv[0]]())
    elif len(argv) == 2 and argv[0] in ARG_JOBS:
        try:
            result = asyncio.run(ARG_JOBS[argv[0]](argv[1]))
        except ValueError as exc:
            sys.exit(str(exc))
    else:
        sys.exit(usage)

    print(result)


if __name__ == "__main__":
    main()
