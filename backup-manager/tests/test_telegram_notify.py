from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest
import respx

from backup_manager.telegram_notify import (
    TELEGRAM_MAX_DOCUMENT_BYTES,
    format_send_failure_message,
    format_success_caption,
    format_too_large_message,
    is_telegram_configured,
    notify_auto_backup,
)


def test_is_telegram_configured() -> None:
    assert is_telegram_configured("tok", 123) is True
    assert is_telegram_configured("", 123) is False
    assert is_telegram_configured("tok", None) is False


def test_format_messages_contain_size_and_name() -> None:
    caption = format_success_caption("gastos-auto-2026.zip", 1_500_000)
    assert "Backup automático listo" in caption
    assert "gastos-auto-2026.zip" in caption or "MB" in caption

    big = format_too_large_message("big.zip", TELEGRAM_MAX_DOCUMENT_BYTES + 1)
    assert "50 MB" in big
    assert "Telegram" in big

    fail = format_send_failure_message("x.zip")
    assert "no pude enviarte" in fail.lower() or "Telegram" in fail


@pytest.mark.asyncio
@respx.mock
async def test_notify_sends_document_when_under_limit(tmp_path: Path) -> None:
    archive = tmp_path / "small-auto.zip"
    archive.write_bytes(b"zip-bytes")
    route = respx.post(
        "https://api.telegram.org/botTOKEN/sendDocument"
    ).mock(return_value=httpx.Response(200, json={"ok": True}))

    await notify_auto_backup(
        token="TOKEN",
        owner_user_id=42,
        archive_path=archive,
    )

    assert route.called
    request = route.calls.last.request
    assert b"name=\"chat_id\"" in request.content
    assert b"\r\n\r\n42\r\n" in request.content or b"\r\n\r\n42\n" in request.content


@pytest.mark.asyncio
@respx.mock
async def test_notify_sends_message_when_over_limit(tmp_path: Path) -> None:
    archive = tmp_path / "huge-auto.zip"
    # No hace falta un archivo real de 50MB+: stub del tamaño vía monkeypatch en el test
    archive.write_bytes(b"x")

    class FakeStat:
        st_size = TELEGRAM_MAX_DOCUMENT_BYTES + 10

    original_stat = Path.stat

    def fake_stat(self: Path, *args: object, **kwargs: object):  # noqa: ANN001
        if self == archive:
            return FakeStat()  # type: ignore[return-value]
        return original_stat(self, *args, **kwargs)

    monkey = pytest.MonkeyPatch()
    monkey.setattr(Path, "stat", fake_stat)

    msg_route = respx.post(
        "https://api.telegram.org/botTOKEN/sendMessage"
    ).mock(return_value=httpx.Response(200, json={"ok": True}))
    doc_route = respx.post(
        "https://api.telegram.org/botTOKEN/sendDocument"
    ).mock(return_value=httpx.Response(200, json={"ok": True}))

    try:
        await notify_auto_backup(
            token="TOKEN",
            owner_user_id=42,
            archive_path=archive,
        )
    finally:
        monkey.undo()

    assert msg_route.called
    assert not doc_route.called
    payload = json.loads(msg_route.calls.last.request.content)
    assert payload["chat_id"] == 42


@pytest.mark.asyncio
@respx.mock
async def test_notify_document_failure_sends_fallback_message(tmp_path: Path) -> None:
    archive = tmp_path / "small-auto.zip"
    archive.write_bytes(b"zip")
    respx.post("https://api.telegram.org/botTOKEN/sendDocument").mock(
        return_value=httpx.Response(400, json={"ok": False, "description": "fail"})
    )
    msg_route = respx.post(
        "https://api.telegram.org/botTOKEN/sendMessage"
    ).mock(return_value=httpx.Response(200, json={"ok": True}))

    await notify_auto_backup(
        token="TOKEN",
        owner_user_id=42,
        archive_path=archive,
    )

    assert msg_route.called
    payload = json.loads(msg_route.calls.last.request.content)
    assert payload["chat_id"] == 42


@pytest.mark.asyncio
@respx.mock
async def test_notify_never_raises_when_stat_fails(tmp_path: Path) -> None:
    archive = tmp_path / "missing-auto.zip"
    original_stat = Path.stat

    def fake_stat(self: Path, *args: object, **kwargs: object):  # noqa: ANN001
        if self == archive:
            raise OSError("stat failed")
        return original_stat(self, *args, **kwargs)

    monkey = pytest.MonkeyPatch()
    monkey.setattr(Path, "stat", fake_stat)
    msg_route = respx.post(
        "https://api.telegram.org/botTOKEN/sendMessage"
    ).mock(return_value=httpx.Response(200, json={"ok": True}))

    try:
        await notify_auto_backup(
            token="TOKEN",
            owner_user_id=42,
            archive_path=archive,
        )
    finally:
        monkey.undo()

    assert msg_route.called
    payload = json.loads(msg_route.calls.last.request.content)
    assert payload["chat_id"] == 42


@pytest.mark.asyncio
@respx.mock
async def test_notify_never_raises_on_network_error(tmp_path: Path) -> None:
    archive = tmp_path / "small-auto.zip"
    archive.write_bytes(b"zip")
    respx.post("https://api.telegram.org/botTOKEN/sendDocument").mock(
        side_effect=httpx.ConnectError("down")
    )
    # fallback message also fails
    respx.post("https://api.telegram.org/botTOKEN/sendMessage").mock(
        side_effect=httpx.ConnectError("down")
    )

    await notify_auto_backup(
        token="TOKEN",
        owner_user_id=42,
        archive_path=archive,
    )
