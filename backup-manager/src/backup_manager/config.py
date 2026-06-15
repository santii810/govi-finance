from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class BackupConfig:
    nocodb_url: str
    nocodb_token: str
    base_id: str
    staging_dir: Path
    provider: str
    schedule: str
    timezone: str
    local_retention: int
    google_client_id: str
    google_client_secret: str
    google_refresh_token: str
    google_folder_id: str
    onedrive_client_id: str
    onedrive_client_secret: str
    onedrive_refresh_token: str
    onedrive_folder_path: str
    trigger_secret: str
    trigger_port: int

    @classmethod
    def from_env(cls) -> BackupConfig:
        token = os.environ.get("NOCODB_API_TOKEN", "").strip()
        if not token:
            raise RuntimeError("NOCODB_API_TOKEN es obligatorio")

        provider = os.environ.get("BACKUP_PROVIDER", "none").strip().lower()
        if provider not in {"none", "google_drive", "onedrive"}:
            raise RuntimeError(
                "BACKUP_PROVIDER debe ser none, google_drive u onedrive"
            )

        retention_raw = os.environ.get("BACKUP_LOCAL_RETENTION", "7").strip()
        try:
            local_retention = max(1, int(retention_raw))
        except ValueError as exc:
            raise RuntimeError("BACKUP_LOCAL_RETENTION debe ser un entero") from exc

        port_raw = os.environ.get("BACKUP_TRIGGER_PORT", "8090").strip()
        try:
            trigger_port = int(port_raw)
        except ValueError as exc:
            raise RuntimeError("BACKUP_TRIGGER_PORT debe ser un entero") from exc

        return cls(
            nocodb_url=os.environ.get("NOCODB_URL", "http://nocodb:8080").rstrip("/"),
            nocodb_token=token,
            base_id=os.environ.get("NOCODB_BASE_ID", "pnf173not1wvzg0").strip(),
            staging_dir=Path(os.environ.get("BACKUP_STAGING_DIR", "/data/backups")),
            provider=provider,
            schedule=os.environ.get("BACKUP_SCHEDULE", "0 3 * * *").strip(),
            timezone=os.environ.get("BACKUP_TIMEZONE", os.environ.get("TIMEZONE", "Europe/Madrid")),
            local_retention=local_retention,
            google_client_id=os.environ.get("GOOGLE_DRIVE_CLIENT_ID", "").strip(),
            google_client_secret=os.environ.get("GOOGLE_DRIVE_CLIENT_SECRET", "").strip(),
            google_refresh_token=os.environ.get("GOOGLE_DRIVE_REFRESH_TOKEN", "").strip(),
            google_folder_id=os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "").strip(),
            onedrive_client_id=os.environ.get("ONEDRIVE_CLIENT_ID", "").strip(),
            onedrive_client_secret=os.environ.get("ONEDRIVE_CLIENT_SECRET", "").strip(),
            onedrive_refresh_token=os.environ.get("ONEDRIVE_REFRESH_TOKEN", "").strip(),
            onedrive_folder_path=os.environ.get("ONEDRIVE_FOLDER_PATH", "/Finanzas/backups").strip(),
            trigger_secret=os.environ.get("BACKUP_TRIGGER_SECRET", "").strip(),
            trigger_port=trigger_port,
        )
