from __future__ import annotations

from pathlib import Path
from urllib.parse import quote

import httpx

from backup_manager.config import BackupConfig
from backup_manager.upload.base import BackupUploader, UploadError


class OneDriveUploader(BackupUploader):
    TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    GRAPH_BASE = "https://graph.microsoft.com/v1.0"

    def __init__(self, config: BackupConfig) -> None:
        self._config = config
        self._validate_config()

    def _validate_config(self) -> None:
        missing = [
            name
            for name, value in {
                "ONEDRIVE_CLIENT_ID": self._config.onedrive_client_id,
                "ONEDRIVE_CLIENT_SECRET": self._config.onedrive_client_secret,
                "ONEDRIVE_REFRESH_TOKEN": self._config.onedrive_refresh_token,
            }.items()
            if not value
        ]
        if missing:
            raise UploadError(f"Faltan variables para OneDrive: {', '.join(missing)}")

    async def _access_token(self) -> str:
        payload = {
            "client_id": self._config.onedrive_client_id,
            "client_secret": self._config.onedrive_client_secret,
            "refresh_token": self._config.onedrive_refresh_token,
            "grant_type": "refresh_token",
            "scope": "https://graph.microsoft.com/.default offline_access",
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(self.TOKEN_URL, data=payload)
        if response.status_code >= 400:
            raise UploadError(f"No se pudo refrescar token OneDrive: {response.text}")
        return str(response.json()["access_token"])

    async def upload(self, archive_path: Path) -> str:
        token = await self._access_token()
        folder = self._config.onedrive_folder_path.strip("/")
        remote_path = f"{folder}/{archive_path.name}" if folder else archive_path.name
        url = (
            f"{self.GRAPH_BASE}/me/drive/root:/{quote(remote_path)}:/content"
        )

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/zip",
        }
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.put(
                url,
                headers=headers,
                content=archive_path.read_bytes(),
            )
        if response.status_code >= 400:
            raise UploadError(f"Error subiendo a OneDrive: {response.text}")

        item = response.json()
        web_url = item.get("webUrl", "")
        return web_url or f"onedrive://{remote_path}"
