from __future__ import annotations

import json
import logging
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import TYPE_CHECKING
from urllib.parse import urlparse

from backup_manager.progress import backup_progress
from backup_manager.runner import run_backup_sync

if TYPE_CHECKING:
    from backup_manager.config import BackupConfig

logger = logging.getLogger(__name__)

_backup_lock = threading.Lock()


class TriggerHandler(BaseHTTPRequestHandler):
    config: BackupConfig
    secret: str

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.rstrip("/")
        if path != "/backup/status":
            self._respond(404, {"error": "not found"})
            return
        if not self._authorized():
            self._respond(401, {"error": "unauthorized"})
            return
        self._respond(200, backup_progress.snapshot().to_dict())

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.rstrip("/")
        if path != "/backup":
            self._respond(404, {"error": "not found"})
            return
        if not self._authorized():
            self._respond(401, {"error": "unauthorized"})
            return

        if not _backup_lock.acquire(blocking=False):
            self._respond(409, {"error": "backup already running"})
            return

        snapshot = backup_progress.snapshot()
        if snapshot.running:
            _backup_lock.release()
            self._respond(409, {"error": "backup already running"})
            return

        thread = threading.Thread(
            target=self._run_backup,
            args=(self.config,),
            daemon=True,
            name="backup-manual",
        )
        thread.start()
        self._respond(202, {"ok": True, "started": True})

    def _authorized(self) -> bool:
        auth = self.headers.get("Authorization", "")
        return auth == f"Bearer {self.secret}"

    def _run_backup(self, config: BackupConfig) -> None:
        try:
            run_backup_sync(config)
        except Exception:
            logger.exception("Backup manual fallido")
        finally:
            _backup_lock.release()

    def _respond(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        logger.debug("trigger %s", format % args)


def start_trigger_server(config: BackupConfig) -> ThreadingHTTPServer | None:
    secret = config.trigger_secret.strip()
    if not secret:
        logger.info("BACKUP_TRIGGER_SECRET vacio: trigger HTTP desactivado")
        return None

    TriggerHandler.config = config
    TriggerHandler.secret = secret
    server = ThreadingHTTPServer(("0.0.0.0", config.trigger_port), TriggerHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True, name="backup-trigger")
    thread.start()
    logger.info(
        "Trigger HTTP en :%s (POST /backup, GET /backup/status)",
        config.trigger_port,
    )
    return server
