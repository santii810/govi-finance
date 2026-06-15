from __future__ import annotations

import json
from pathlib import Path

import httpx

from backup_manager.config import BackupConfig
from backup_manager.upload.base import BackupUploader, UploadError


class GoogleDriveUploader(BackupUploader):
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"

    def __init__(self, config: BackupConfig) -> None:
        self._config = config
        self._validate_config()

    def _validate_config(self) -> None:
        missing = [
            name
            for name, value in {
                "GOOGLE_DRIVE_CLIENT_ID": self._config.google_client_id,
                "GOOGLE_DRIVE_CLIENT_SECRET": self._config.google_client_secret,
                "GOOGLE_DRIVE_REFRESH_TOKEN": self._config.google_refresh_token,
                "GOOGLE_DRIVE_FOLDER_ID": self._config.google_folder_id,
            }.items()
            if not value
        ]
        if missing:
            raise UploadError(f"Faltan variables para Google Drive: {', '.join(missing)}")

    async def _access_token(self) -> str:
        payload = {
            "client_id": self._config.google_client_id,
            "client_secret": self._config.google_client_secret,
            "refresh_token": self._config.google_refresh_token,
            "grant_type": "refresh_token",
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(self.TOKEN_URL, data=payload)
        if response.status_code >= 400:
            raise UploadError(f"No se pudo refrescar token Google Drive: {response.text}")
        return str(response.json()["access_token"])

    def _multipart_body(self, metadata: dict[str, object], file_bytes: bytes) -> tuple[bytes, str]:
        boundary = "finanzasBackupBoundary"
        meta_json = json.dumps(metadata).encode("utf-8")
        body = b"".join(
            [
                f"--{boundary}\r\n".encode(),
                b"Content-Type: application/json; charset=UTF-8\r\n\r\n",
                meta_json,
                f"\r\n--{boundary}\r\n".encode(),
                b"Content-Type: application/zip\r\n\r\n",
                file_bytes,
                f"\r\n--{boundary}--\r\n".encode(),
            ]
        )
        return body, boundary

    async def upload(self, archive_path: Path) -> str:
        token = await self._access_token()
        metadata = {
            "name": archive_path.name,
            "parents": [self._config.google_folder_id],
        }
        body, boundary = self._multipart_body(metadata, archive_path.read_bytes())
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/related; boundary={boundary}",
        }
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(self.UPLOAD_URL, headers=headers, content=body)
        if response.status_code >= 400:
            raise UploadError(f"Error subiendo a Google Drive: {response.text}")

        file_id = response.json().get("id", "")
        return f"drive://{file_id}"
