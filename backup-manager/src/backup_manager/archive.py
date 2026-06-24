from __future__ import annotations

import shutil
import zipfile
from datetime import UTC, datetime
from pathlib import Path


def create_zip(export_dir: Path, staging_dir: Path) -> Path:
    timestamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    archive_path = staging_dir / f"finanzas-nocodb-{timestamp}.zip"
    staging_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(
        archive_path,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        for path in sorted(export_dir.rglob("*")):
            if path.is_file():
                archive.write(path, arcname=path.relative_to(export_dir))

    shutil.rmtree(export_dir)
    return archive_path


def resolve_archive(staging_dir: Path, name: str) -> Path | None:
    if not name or "/" in name or "\\" in name or ".." in name:
        return None
    if not name.startswith("finanzas-nocodb-") or not name.endswith(".zip"):
        return None
    path = staging_dir / name
    if path.is_file():
        return path
    return None


def prune_local_backups(staging_dir: Path, keep: int) -> None:
    archives = sorted(
        staging_dir.glob("finanzas-nocodb-*.zip"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    for stale in archives[keep:]:
        stale.unlink(missing_ok=True)
