"""One-off job runner for Heroku Scheduler (no Celery/Redis broker).

Usage:  uv run python -m app.cli <job-name>
"""

import asyncio
import sys

from app.tasks import collect_all_instagram, collect_all_youtube, recompute_all_metrics

JOBS = {
    "snapshot": collect_all_instagram,
    "youtube-snapshot": collect_all_youtube,
    "recompute-metrics": recompute_all_metrics,
}


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in JOBS:
        sys.exit(f"usage: python -m app.cli <{'|'.join(JOBS)}>")
    result = asyncio.run(JOBS[sys.argv[1]]())
    print(result)


if __name__ == "__main__":
    main()
