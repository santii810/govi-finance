from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backup_manager.config import BackupConfig


def _config(**overrides: object) -> BackupConfig:
    base = dict(
        nocodb_url="http://nocodb:8080",
        nocodb_token="tok",
        base_id="base",
        staging_dir=Path("/tmp/backups-test"),
        provider="none",
        schedule="0 3 * * *",
        timezone="Europe/Madrid",
        local_retention=7,
        google_client_id="",
        google_client_secret="",
        google_refresh_token="",
        google_folder_id="",
        onedrive_client_id="",
        onedrive_client_secret="",
        onedrive_refresh_token="",
        onedrive_folder_path="/Finanzas/backups",
        trigger_secret="secret",
        trigger_port=8090,
        telegram_bot_token="BOT",
        telegram_owner_user_id=99,
    )
    base.update(overrides)
    return BackupConfig(**base)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_auto_backup_notifies_telegram(tmp_path: Path) -> None:
    archive = tmp_path / "auto.zip"
    archive.write_bytes(b"data")
    config = _config(staging_dir=tmp_path)

    notify = AsyncMock()
    with (
        patch("backup_manager.runner.export_base", new=AsyncMock(return_value=tmp_path / "export")),
        patch("backup_manager.runner.create_zip", return_value=archive),
        patch("backup_manager.runner.build_uploader", return_value=None),
        patch("backup_manager.runner.prune_local_backups"),
        patch("backup_manager.runner.compute_fingerprint", new=AsyncMock(return_value={})),
        patch("backup_manager.runner.save_fingerprint"),
        patch("backup_manager.runner.NocoDbClient"),
        patch("backup_manager.runner.notify_auto_backup", new=notify),
        patch("backup_manager.runner.is_telegram_configured", return_value=True),
    ):
        from backup_manager.runner import run_backup

        result = await run_backup(config, source="auto", upload=False)

    assert result == archive
    notify.assert_awaited_once()
    kwargs = notify.await_args.kwargs
    assert kwargs["token"] == "BOT"
    assert kwargs["owner_user_id"] == 99
    assert kwargs["archive_path"] == archive


@pytest.mark.asyncio
async def test_manual_backup_skips_telegram(tmp_path: Path) -> None:
    archive = tmp_path / "manual.zip"
    archive.write_bytes(b"data")
    config = _config(staging_dir=tmp_path)
    notify = AsyncMock()
    with (
        patch("backup_manager.runner.export_base", new=AsyncMock(return_value=tmp_path / "export")),
        patch("backup_manager.runner.create_zip", return_value=archive),
        patch("backup_manager.runner.build_uploader", return_value=None),
        patch("backup_manager.runner.prune_local_backups"),
        patch("backup_manager.runner.compute_fingerprint", new=AsyncMock(return_value={})),
        patch("backup_manager.runner.save_fingerprint"),
        patch("backup_manager.runner.NocoDbClient"),
        patch("backup_manager.runner.notify_auto_backup", new=notify),
    ):
        from backup_manager.runner import run_backup

        await run_backup(config, source="manual", upload=False)

    notify.assert_not_awaited()


@pytest.mark.asyncio
async def test_auto_backup_skips_when_not_configured(tmp_path: Path) -> None:
    archive = tmp_path / "auto.zip"
    archive.write_bytes(b"data")
    config = _config(
        staging_dir=tmp_path,
        telegram_bot_token="",
        telegram_owner_user_id=None,
    )
    notify = AsyncMock()
    with (
        patch("backup_manager.runner.export_base", new=AsyncMock(return_value=tmp_path / "export")),
        patch("backup_manager.runner.create_zip", return_value=archive),
        patch("backup_manager.runner.build_uploader", return_value=None),
        patch("backup_manager.runner.prune_local_backups"),
        patch("backup_manager.runner.compute_fingerprint", new=AsyncMock(return_value={})),
        patch("backup_manager.runner.save_fingerprint"),
        patch("backup_manager.runner.NocoDbClient"),
        patch("backup_manager.runner.notify_auto_backup", new=notify),
        patch("backup_manager.runner.is_telegram_configured", return_value=False),
    ):
        from backup_manager.runner import run_backup

        await run_backup(config, source="auto", upload=False)

    notify.assert_not_awaited()
