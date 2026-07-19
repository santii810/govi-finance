from __future__ import annotations

import re
import shutil
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

ArchiveSource = Literal["manual", "auto", "unknown"]
CreateSource = Literal["manual", "auto"]

_LEGACY_NAME = re.compile(r"^finanzas-nocodb-(\d{8})-(\d{6})\.zip$")
_SCHEDULED_TIMES = frozenset({"010000", "010001", "030000", "030001"})


def archive_source(name: str) -> ArchiveSource:
    if "-manual-" in name:
        return "manual"
    if "-auto-" in name:
        return "auto"
    match = _LEGACY_NAME.match(name)
    if match:
        time_part = match.group(2)
        if time_part in _SCHEDULED_TIMES:
            return "auto"
        return "manual"
    return "unknown"


def create_zip(export_dir: Path, staging_dir: Path, *, source: CreateSource) -> Path:
    timestamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    archive_path = staging_dir / f"finanzas-nocodb-{source}-{timestamp}.zip"
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


def list_archives(staging_dir: Path) -> list[dict[str, object]]:
    archives = sorted(
        staging_dir.glob("finanzas-nocodb-*.zip"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    items: list[dict[str, object]] = []
    for path in archives:
        stat = path.stat()
        items.append(
            {
                "name": path.name,
                "source": archive_source(path.name),
                "size_bytes": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime, UTC).isoformat(),
            }
        )
    return items


def delete_archive(staging_dir: Path, name: str) -> bool:
    path = resolve_archive(staging_dir, name)
    if path is None:
        return False
    path.unlink(missing_ok=True)
    return not path.exists()
