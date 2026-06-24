from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from backup_manager.archive import create_zip, prune_local_backups
from backup_manager.config import BackupConfig
from backup_manager.export import export_base
from backup_manager.nocodb import NocoDbClient
from backup_manager.progress import BackupProgress, backup_progress
from backup_manager.upload import build_uploader

logger = logging.getLogger(__name__)


async def run_backup(config: BackupConfig, progress: BackupProgress | None = None) -> Path:
    tracker = progress or backup_progress
    tracker.start()
    config.staging_dir.mkdir(parents=True, exist_ok=True)
    client = NocoDbClient(config.nocodb_url, config.nocodb_token)

    try:
        logger.info("Exportando base %s desde %s", config.base_id, config.nocodb_url)
        tracker.update(2, "prepare", "Conectando con NocoDB…")
        export_dir = await export_base(client, config, progress=tracker)

        tracker.update(72, "compress", "Comprimiendo archivos…")
        archive_path = create_zip(export_dir, config.staging_dir)
        size_mib = archive_path.stat().st_size / (1024 * 1024)
        logger.info("Backup comprimido: %s (%.2f MiB)", archive_path, size_mib)
        tracker.update(82, "compress", f"Comprimido ({size_mib:.2f} MiB)")

        uploader = build_uploader(config)
        if uploader is None:
            logger.info("BACKUP_PROVIDER=none: archivo conservado solo en volumen local")
            tracker.update(90, "local", "Guardando copia local…")
        else:
            tracker.update(88, "upload", "Subiendo a Google Drive…")
            remote_ref = await uploader.upload(archive_path)
            logger.info("Backup subido: %s", remote_ref)

        tracker.update(96, "finish", "Limpiando copias antiguas…")
        prune_local_backups(config.staging_dir, config.local_retention)
        tracker.complete(archive_path.name)
        return archive_path
    except Exception as exc:
        tracker.fail(str(exc))
        raise


def run_backup_sync(config: BackupConfig, progress: BackupProgress | None = None) -> Path:
    return asyncio.run(run_backup(config, progress))
