from __future__ import annotations

import asyncio
import logging
import time

from backup_manager.config import BackupConfig
from backup_manager.fingerprint import has_changes_since_last_backup
from backup_manager.nocodb import NocoDbClient
from backup_manager.runner import run_backup_sync
from backup_manager.schedule_utils import seconds_until_next_run
from backup_manager.trigger_server import start_trigger_server

logger = logging.getLogger(__name__)


def scheduler_loop(config: BackupConfig) -> None:
    start_trigger_server(config)
    logger.info(
        "Programador activo (%s, tz=%s). Proveedor=%s",
        config.schedule,
        config.timezone,
        config.provider,
    )
    while True:
        delay = seconds_until_next_run(config.schedule, config.timezone)
        logger.info("Próximo backup en %.0f segundos", delay)
        time.sleep(delay)
        try:
            client = NocoDbClient(config.nocodb_url, config.nocodb_token)
            changed = asyncio.run(
                has_changes_since_last_backup(client, config.base_id, config.staging_dir)
            )
            if not changed:
                logger.info("Sin cambios desde el último backup; se omite la copia programada")
                continue
            run_backup_sync(config)
        except Exception:
            logger.exception("Backup fallido; se reintentará en el siguiente ciclo")
