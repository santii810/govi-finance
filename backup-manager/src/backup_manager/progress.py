from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Any


@dataclass
class BackupProgressSnapshot:
    running: bool
    percent: int
    phase: str
    message: str
    archive: str | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "running": self.running,
            "percent": self.percent,
            "phase": self.phase,
            "message": self.message,
            "archive": self.archive,
            "error": self.error,
        }


class BackupProgress:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._running = False
        self._percent = 0
        self._phase = "idle"
        self._message = ""
        self._archive: str | None = None
        self._error: str | None = None

    def snapshot(self) -> BackupProgressSnapshot:
        with self._lock:
            return BackupProgressSnapshot(
                running=self._running,
                percent=self._percent,
                phase=self._phase,
                message=self._message,
                archive=self._archive,
                error=self._error,
            )

    def start(self) -> None:
        with self._lock:
            self._running = True
            self._percent = 0
            self._phase = "prepare"
            self._message = "Iniciando backup…"
            self._archive = None
            self._error = None

    def update(self, percent: int, phase: str, message: str) -> None:
        with self._lock:
            self._percent = max(0, min(100, percent))
            self._phase = phase
            self._message = message

    def complete(self, archive_name: str) -> None:
        with self._lock:
            self._running = False
            self._percent = 100
            self._phase = "done"
            self._message = "Backup completado"
            self._archive = archive_name
            self._error = None

    def start_upload(self, archive_name: str) -> None:
        with self._lock:
            self._running = True
            self._percent = 10
            self._phase = "upload"
            self._message = "Subiendo a Google Drive…"
            self._archive = archive_name
            self._error = None

    def complete_upload(self, archive_name: str, message: str) -> None:
        with self._lock:
            self._running = False
            self._percent = 100
            self._phase = "uploaded"
            self._message = message
            self._archive = archive_name
            self._error = None

    def fail(self, error: str) -> None:
        with self._lock:
            self._running = False
            self._phase = "error"
            self._message = error
            self._error = error


backup_progress = BackupProgress()
