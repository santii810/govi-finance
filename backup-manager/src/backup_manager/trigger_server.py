from __future__ import annotations

import json
import logging
import shutil
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import TYPE_CHECKING
from urllib.parse import parse_qs, urlparse

from backup_manager.archive import delete_archive, list_archives, resolve_archive
from backup_manager.fingerprint import load_fingerprint
from backup_manager.progress import backup_progress
from backup_manager.runner import restore_backup_sync, run_backup_sync, upload_backup_sync
from backup_manager.schedule_utils import next_run_at

if TYPE_CHECKING:
    from backup_manager.config import BackupConfig

logger = logging.getLogger(__name__)

_backup_lock = threading.Lock()


class TriggerHandler(BaseHTTPRequestHandler):
    config: BackupConfig
    secret: str

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.rstrip("/")
        if path == "/backup/status":
            if not self._authorized():
                self._respond(401, {"error": "unauthorized"})
                return
            self._respond(200, backup_progress.snapshot().to_dict())
            return
        if path == "/backup/list":
            if not self._authorized():
                self._respond(401, {"error": "unauthorized"})
                return
            self._handle_list()
            return
        if path == "/backup/schedule":
            if not self._authorized():
                self._respond(401, {"error": "unauthorized"})
                return
            self._handle_schedule()
            return
        if path == "/backup/download":
            if not self._authorized():
                self._respond(401, {"error": "unauthorized"})
                return
            self._handle_download()
            return
        self._respond(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.rstrip("/")
        if path == "/backup":
            self._handle_run_backup()
            return
        if path == "/backup/upload":
            self._handle_upload()
            return
        if path == "/backup/restore":
            self._handle_restore()
            return
        if path == "/backup/delete":
            self._handle_delete()
            return
        self._respond(404, {"error": "not found"})

    def _handle_list(self) -> None:
        archives = list_archives(self.config.staging_dir)
        self._respond(200, {"archives": archives})

    def _handle_schedule(self) -> None:
        next_run = next_run_at(self.config.schedule, self.config.timezone)
        archives = list_archives(self.config.staging_dir)
        last_backup = archives[0]["created_at"] if archives else None
        self._respond(
            200,
            {
                "schedule": self.config.schedule,
                "timezone": self.config.timezone,
                "skip_if_unchanged": True,
                "next_run_at": next_run.isoformat(),
                "last_backup_at": last_backup,
                "has_fingerprint": load_fingerprint(self.config.staging_dir) is not None,
            },
        )

    def _handle_run_backup(self) -> None:
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

    def _handle_restore(self) -> None:
        if not self._authorized():
            self._respond(401, {"error": "unauthorized"})
            return

        if not _backup_lock.acquire(blocking=False):
            self._respond(409, {"error": "operation already running"})
            return

        snapshot = backup_progress.snapshot()
        if snapshot.running:
            _backup_lock.release()
            self._respond(409, {"error": "operation already running"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length) if length > 0 else b"{}"
            payload = json.loads(body.decode("utf-8"))
            archive = str(payload.get("archive", "")).strip()
        except (ValueError, json.JSONDecodeError):
            _backup_lock.release()
            self._respond(400, {"error": "cuerpo JSON inválido"})
            return

        if not archive:
            _backup_lock.release()
            self._respond(400, {"error": "falta archive"})
            return

        if resolve_archive(self.config.staging_dir, archive) is None:
            _backup_lock.release()
            self._respond(404, {"error": "archivo no encontrado"})
            return

        thread = threading.Thread(
            target=self._run_restore,
            args=(self.config, archive),
            daemon=True,
            name="backup-restore",
        )
        thread.start()
        self._respond(202, {"ok": True, "started": True})

    def _handle_delete(self) -> None:
        if not self._authorized():
            self._respond(401, {"error": "unauthorized"})
            return

        snapshot = backup_progress.snapshot()
        if snapshot.running:
            self._respond(409, {"error": "hay una operación en curso"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length) if length > 0 else b"{}"
            payload = json.loads(body.decode("utf-8"))
            archive = str(payload.get("archive", "")).strip()
        except (ValueError, json.JSONDecodeError):
            self._respond(400, {"error": "cuerpo JSON inválido"})
            return

        if not archive:
            self._respond(400, {"error": "falta archive"})
            return

        if not delete_archive(self.config.staging_dir, archive):
            self._respond(404, {"error": "archivo no encontrado"})
            return

        self._respond(200, {"ok": True, "deleted": archive})

    def _handle_upload(self) -> None:
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

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length) if length > 0 else b"{}"
            payload = json.loads(body.decode("utf-8"))
            archive = str(payload.get("archive", "")).strip()
        except (ValueError, json.JSONDecodeError):
            _backup_lock.release()
            self._respond(400, {"error": "cuerpo JSON inválido"})
            return

        if not archive:
            _backup_lock.release()
            self._respond(400, {"error": "falta archive"})
            return

        if resolve_archive(self.config.staging_dir, archive) is None:
            _backup_lock.release()
            self._respond(404, {"error": "archivo no encontrado"})
            return

        thread = threading.Thread(
            target=self._run_upload,
            args=(self.config, archive),
            daemon=True,
            name="backup-upload",
        )
        thread.start()
        self._respond(202, {"ok": True, "started": True})

    def _handle_download(self) -> None:
        query = parse_qs(urlparse(self.path).query)
        archive = query.get("archive", [""])[0].strip()
        archive_path = resolve_archive(self.config.staging_dir, archive)
        if archive_path is None:
            self._respond(404, {"error": "archivo no encontrado"})
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/zip")
        self.send_header(
            "Content-Disposition",
            f'attachment; filename="{archive_path.name}"',
        )
        self.send_header("Content-Length", str(archive_path.stat().st_size))
        self.end_headers()
        with archive_path.open("rb") as handle:
            shutil.copyfileobj(handle, self.wfile)

    def _authorized(self) -> bool:
        auth = self.headers.get("Authorization", "")
        return auth == f"Bearer {self.secret}"

    def _run_backup(self, config: BackupConfig) -> None:
        try:
            run_backup_sync(config, upload=False, source="manual")
        except Exception:
            logger.exception("Backup manual fallido")
        finally:
            _backup_lock.release()

    def _run_restore(self, config: BackupConfig, archive: str) -> None:
        try:
            restore_backup_sync(config, archive)
        except Exception:
            logger.exception("Restauración fallida")
        finally:
            _backup_lock.release()

    def _run_upload(self, config: BackupConfig, archive: str) -> None:
        try:
            upload_backup_sync(config, archive)
        except Exception:
            logger.exception("Subida manual fallida")
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
        "Trigger HTTP en :%s (POST /backup, POST /backup/restore, GET /backup/list, …)",
        config.trigger_port,
    )
    return server
