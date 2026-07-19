from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backup_manager.nocodb import NocoDbClient


def fingerprint_path(staging_dir: Path) -> Path:
    return staging_dir / ".last-backup-fingerprint.json"


async def compute_fingerprint(client: NocoDbClient, base_id: str) -> dict[str, Any]:
    tables = await client.list_base_tables(base_id)
    snapshot: dict[str, Any] = {"tables": {}}

    for table in tables:
        table_id = str(table.get("id", ""))
        if not table_id:
            continue
        marker = await client.get_change_marker(table_id)
        snapshot["tables"][table_id] = marker

    return snapshot


def load_fingerprint(staging_dir: Path) -> dict[str, Any] | None:
    path = fingerprint_path(staging_dir)
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def save_fingerprint(staging_dir: Path, fingerprint: dict[str, Any]) -> None:
    staging_dir.mkdir(parents=True, exist_ok=True)
    fingerprint_path(staging_dir).write_text(
        json.dumps(fingerprint, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def fingerprints_equal(left: dict[str, Any] | None, right: dict[str, Any] | None) -> bool:
    return left == right


async def has_changes_since_last_backup(
    client: NocoDbClient,
    base_id: str,
    staging_dir: Path,
) -> bool:
    current = await compute_fingerprint(client, base_id)
    previous = load_fingerprint(staging_dir)
    return not fingerprints_equal(current, previous)
