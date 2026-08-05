from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from backup_manager.archive import create_zip, prune_local_backups, resolve_archive
from backup_manager.config import BackupConfig
from backup_manager.export import export_base
from backup_manager.fingerprint import compute_fingerprint, save_fingerprint
from backup_manager.nocodb import NocoDbClient
from backup_manager.progress import BackupProgress, backup_progress
from backup_manager.restore import restore_base
from backup_manager.telegram_notify import is_telegram_configured, notify_auto_backup
from backup_manager.upload import build_uploader

logger = logging.getLogger(__name__)


async def run_backup(
    config: BackupConfig,
    progress: BackupProgress | None = None,
    *,
    upload: bool = True,
    source: str = "auto",
) -> Path:
    tracker = progress or backup_progress
    tracker.start()
    config.staging_dir.mkdir(parents=True, exist_ok=True)
    client = NocoDbClient(config.nocodb_url, config.nocodb_token)

    try:
        logger.info("Exportando base %s desde %s", config.base_id, config.nocodb_url)
        tracker.update(2, "prepare", "Conectando con NocoDB…")
        export_dir = await export_base(client, config, progress=tracker)

        tracker.update(72, "compress", "Comprimiendo archivos…")
        archive_path = create_zip(export_dir, config.staging_dir, source=source)
        size_mib = archive_path.stat().st_size / (1024 * 1024)
        logger.info("Backup comprimido: %s (%.2f MiB)", archive_path, size_mib)
        tracker.update(82, "compress", f"Comprimido ({size_mib:.2f} MiB)")

        if upload:
            uploader = build_uploader(config)
            if uploader is None:
                logger.info("BACKUP_PROVIDER=none: archivo conservado solo en volumen local")
                tracker.update(90, "local", "Guardando copia local…")
            else:
                tracker.update(88, "upload", "Subiendo a la nube…")
                remote_ref = await uploader.upload(archive_path)
                logger.info("Backup subido: %s", remote_ref)
        else:
            tracker.update(95, "local", "Backup listo")

        tracker.update(96, "finish", "Limpiando copias antiguas…")
        prune_local_backups(config.staging_dir, config.local_retention)
        fingerprint = await compute_fingerprint(client, config.base_id)
        save_fingerprint(config.staging_dir, fingerprint)
        tracker.complete(archive_path.name)

        if source == "auto":
            if is_telegram_configured(
                config.telegram_bot_token,
                config.telegram_owner_user_id,
            ):
                await notify_auto_backup(
                    token=config.telegram_bot_token,
                    owner_user_id=config.telegram_owner_user_id,  # type: ignore[arg-type]
                    archive_path=archive_path,
                )
            else:
                logger.info("Telegram no configurado: se omite el envío del backup")

        return archive_path
    except Exception as exc:
        tracker.fail(str(exc))
        raise


async def upload_backup(
    config: BackupConfig,
    archive_name: str,
    progress: BackupProgress | None = None,
) -> str:
    tracker = progress or backup_progress
    archive_path = resolve_archive(config.staging_dir, archive_name)
    if archive_path is None:
        raise FileNotFoundError(f"Archivo no encontrado: {archive_name}")

    uploader = build_uploader(config)
    if uploader is None:
        raise RuntimeError("No hay proveedor de backup configurado")

    tracker.start_upload(archive_name)
    try:
        remote_ref = await uploader.upload(archive_path)
        logger.info("Backup subido: %s", remote_ref)
        tracker.complete_upload(archive_name, "Subido a Google Drive")
        return remote_ref
    except Exception as exc:
        tracker.fail(str(exc))
        raise


def run_backup_sync(
    config: BackupConfig,
    progress: BackupProgress | None = None,
    *,
    upload: bool = True,
    source: str = "auto",
) -> Path:
    return asyncio.run(run_backup(config, progress, upload=upload, source=source))


def upload_backup_sync(
    config: BackupConfig,
    archive_name: str,
    progress: BackupProgress | None = None,
) -> str:
    return asyncio.run(upload_backup(config, archive_name, progress))


def restore_backup_sync(
    config: BackupConfig,
    archive_name: str,
    progress: BackupProgress | None = None,
) -> None:
    return asyncio.run(restore_backup(config, archive_name, progress))


async def restore_backup(
    config: BackupConfig,
    archive_name: str,
    progress: BackupProgress | None = None,
) -> None:
    client = NocoDbClient(config.nocodb_url, config.nocodb_token)
    await restore_base(client, config, archive_name, progress=progress)
