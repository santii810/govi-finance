from __future__ import annotations

from pathlib import Path

from backup_manager.config import BackupConfig
from backup_manager.upload.base import BackupUploader, UploadError


def build_uploader(config: BackupConfig) -> BackupUploader | None:
    if config.provider == "none":
        return None
    if config.provider == "google_drive":
        from backup_manager.upload.google_drive import GoogleDriveUploader

        return GoogleDriveUploader(config)
    if config.provider == "onedrive":
        from backup_manager.upload.onedrive import OneDriveUploader

        return OneDriveUploader(config)
    raise UploadError(f"Proveedor desconocido: {config.provider}")
