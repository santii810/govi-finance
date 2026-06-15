from __future__ import annotations

import logging
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from croniter import croniter

from backup_manager.config import BackupConfig
from backup_manager.runner import run_backup_sync
from backup_manager.trigger_server import start_trigger_server

logger = logging.getLogger(__name__)


def _seconds_until_next_run(schedule: str, timezone: str) -> float:
    tz = ZoneInfo(timezone)
    now = datetime.now(tz)
    cron = croniter(schedule, now)
    next_run = cron.get_next(datetime)
    return max(0.0, (next_run - now).total_seconds())


def scheduler_loop(config: BackupConfig) -> None:
    start_trigger_server(config)
    logger.info(
        "Programador activo (%s, tz=%s). Proveedor=%s",
        config.schedule,
        config.timezone,
        config.provider,
    )
    while True:
        delay = _seconds_until_next_run(config.schedule, config.timezone)
        logger.info("Próximo backup en %.0f segundos", delay)
        time.sleep(delay)
        try:
            run_backup_sync(config)
        except Exception:
            logger.exception("Backup fallido; se reintentará en el siguiente ciclo")
