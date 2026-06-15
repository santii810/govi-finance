from __future__ import annotations

import json
import logging
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import TYPE_CHECKING

from backup_manager.runner import run_backup_sync

if TYPE_CHECKING:
    from backup_manager.config import BackupConfig

logger = logging.getLogger(__name__)

_backup_lock = threading.Lock()


class TriggerHandler(BaseHTTPRequestHandler):
    config: BackupConfig
    secret: str

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") != "/backup":
            self._respond(404, {"error": "not found"})
            return

        auth = self.headers.get("Authorization", "")
        if auth != f"Bearer {self.secret}":
            self._respond(401, {"error": "unauthorized"})
            return

        if not _backup_lock.acquire(blocking=False):
            self._respond(409, {"error": "backup already running"})
            return

        try:
            archive = run_backup_sync(self.config)
        except Exception as exc:
            logger.exception("Backup manual fallido")
            self._respond(500, {"error": str(exc)})
            return
        finally:
            _backup_lock.release()

        self._respond(
            200,
            {
                "ok": True,
                "archive": archive.name,
                "path": str(archive),
            },
        )

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
    logger.info("Trigger HTTP en :%s POST /backup", config.trigger_port)
    return server
