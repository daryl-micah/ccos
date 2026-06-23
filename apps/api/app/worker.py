"""Celery application (PRODUCT.md Phase 5 — background jobs).

Runs collectors and snapshots asynchronously so user requests never block.
Start a worker with:  uv run celery -A app.worker.celery_app worker --beat
"""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "ccos",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks"],
)

celery_app.conf.update(
    timezone="UTC",
    task_track_started=True,
    task_acks_late=True,
    worker_max_tasks_per_child=50,
)

# Daily historical snapshot of every influencer's Instagram stats.
celery_app.conf.beat_schedule = {
    "daily-instagram-snapshot": {
        "task": "app.tasks.collect_all_instagram",
        "schedule": crontab(hour=3, minute=0),
    },
}
