from __future__ import annotations

import logging
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

TELEGRAM_MAX_DOCUMENT_BYTES = 50 * 1024 * 1024
_API = "https://api.telegram.org"


def is_telegram_configured(token: str, owner_user_id: int | None) -> bool:
    return bool(token.strip()) and owner_user_id is not None


def _format_size(size_bytes: int) -> str:
    mib = size_bytes / (1024 * 1024)
    if mib < 0.1:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{mib:.2f} MB"


def format_success_caption(archive_name: str, size_bytes: int) -> str:
    return (
        "Backup automático listo.\n"
        f"{archive_name} · {_format_size(size_bytes)}"
    )


def format_too_large_message(archive_name: str, size_bytes: int) -> str:
    return (
        f"Backup automático listo, pero el ZIP supera 50 MB "
        f"({_format_size(size_bytes)}).\n"
        "No se puede enviar por Telegram. Descárgalo desde la web "
        "(o Drive/OneDrive si está configurado).\n"
        f"Archivo: {archive_name}"
    )


def format_send_failure_message(archive_name: str) -> str:
    return (
        "Backup automático generado, pero no pude enviarte el archivo "
        "por Telegram.\n"
        f"Está disponible en la web.\nArchivo: {archive_name}"
    )


def _telegram_api_error(operation: str, response: httpx.Response) -> RuntimeError:
    detail = ""
    try:
        payload = response.json()
        if isinstance(payload, dict):
            description = payload.get("description")
            if isinstance(description, str) and description:
                detail = f": {description[:200]}"
    except Exception:
        pass
    return RuntimeError(f"{operation} falló: HTTP {response.status_code}{detail}")


async def _send_message(token: str, chat_id: int, text: str) -> None:
    url = f"{_API}/bot{token}/sendMessage"
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            json={"chat_id": chat_id, "text": text},
        )
    if response.status_code >= 400 or not response.json().get("ok", False):
        raise _telegram_api_error("sendMessage", response)


async def _send_document(
    token: str,
    chat_id: int,
    archive_path: Path,
    caption: str,
) -> None:
    url = f"{_API}/bot{token}/sendDocument"
    async with httpx.AsyncClient(timeout=120.0) as client:
        with archive_path.open("rb") as handle:
            response = await client.post(
                url,
                data={"chat_id": str(chat_id), "caption": caption},
                files={
                    "document": (
                        archive_path.name,
                        handle,
                        "application/zip",
                    )
                },
            )
    if response.status_code >= 400 or not response.json().get("ok", False):
        raise _telegram_api_error("sendDocument", response)


async def notify_auto_backup(
    *,
    token: str,
    owner_user_id: int,
    archive_path: Path,
) -> None:
    try:
        size = archive_path.stat().st_size
        if size > TELEGRAM_MAX_DOCUMENT_BYTES:
            await _send_message(
                token,
                owner_user_id,
                format_too_large_message(archive_path.name, size),
            )
            return
        await _send_document(
            token,
            owner_user_id,
            archive_path,
            format_success_caption(archive_path.name, size),
        )
    except Exception:
        logger.exception("Fallo al notificar backup por Telegram")
        try:
            await _send_message(
                token,
                owner_user_id,
                format_send_failure_message(archive_path.name),
            )
        except Exception:
            logger.exception("Tampoco se pudo enviar el aviso de fallo por Telegram")
