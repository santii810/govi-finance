from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path


class UploadError(Exception):
    pass


class BackupUploader(ABC):
    @abstractmethod
    async def upload(self, archive_path: Path) -> str:
        """Sube el archivo y devuelve una referencia legible (URL o ruta remota)."""
