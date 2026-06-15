from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from backup_manager.archive import create_zip, prune_local_backups
from backup_manager.config import BackupConfig
from backup_manager.export import export_base
from backup_manager.nocodb import NocoDbClient
from backup_manager.upload import build_uploader

logger = logging.getLogger(__name__)


async def run_backup(config: BackupConfig) -> Path:
    config.staging_dir.mkdir(parents=True, exist_ok=True)
    client = NocoDbClient(config.nocodb_url, config.nocodb_token)

    logger.info("Exportando base %s desde %s", config.base_id, config.nocodb_url)
    export_dir = await export_base(client, config)
    archive_path = create_zip(export_dir, config.staging_dir)
    logger.info("Backup comprimido: %s (%.2f MiB)", archive_path, archive_path.stat().st_size / (1024 * 1024))

    uploader = build_uploader(config)
    if uploader is None:
        logger.info("BACKUP_PROVIDER=none: archivo conservado solo en volumen local")
    else:
        remote_ref = await uploader.upload(archive_path)
        logger.info("Backup subido: %s", remote_ref)

    prune_local_backups(config.staging_dir, config.local_retention)
    return archive_path


def run_backup_sync(config: BackupConfig) -> Path:
    return asyncio.run(run_backup(config))
