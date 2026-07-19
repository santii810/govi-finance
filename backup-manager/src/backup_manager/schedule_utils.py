from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from croniter import croniter


def seconds_until_next_run(schedule: str, timezone: str) -> float:
    tz = ZoneInfo(timezone)
    now = datetime.now(tz)
    cron = croniter(schedule, now)
    next_run = cron.get_next(datetime)
    return max(0.0, (next_run - now).total_seconds())


def next_run_at(schedule: str, timezone: str) -> datetime:
    tz = ZoneInfo(timezone)
    now = datetime.now(tz)
    cron = croniter(schedule, now)
    return cron.get_next(datetime)
