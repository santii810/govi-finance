from __future__ import annotations

import csv
import json
import logging
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from backup_manager.config import BackupConfig
from backup_manager.fingerprint import compute_fingerprint, save_fingerprint
from backup_manager.nocodb import NocoDbClient
from backup_manager.progress import BackupProgress
from backup_manager.sanitize import sanitize_row

logger = logging.getLogger(__name__)

BATCH_SIZE = 100


def _parse_cell(value: str) -> Any:
    if value == "":
        return None
    if value.startswith("{") or value.startswith("["):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    if value.isdigit() or (value.startswith("-") and value[1:].isdigit()):
        return int(value)
    try:
        if "." in value:
            parsed = float(value)
            if parsed.is_integer():
                return int(parsed)
            return parsed
    except ValueError:
        pass
    return value


def _row_from_csv(record: dict[str, str]) -> dict[str, Any]:
    parsed: dict[str, Any] = {}
    for key, value in record.items():
        if not key:
            continue
        cell = _parse_cell(value)
        if cell is not None:
            parsed[key] = cell
    return parsed


def _read_csv_rows(csv_path: Path) -> list[dict[str, Any]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return [_row_from_csv(row) for row in reader]


async def restore_base(
    client: NocoDbClient,
    config: BackupConfig,
    archive_name: str,
    *,
    progress: BackupProgress | None = None,
) -> None:
    from backup_manager.archive import resolve_archive

    tracker = progress
    archive_path = resolve_archive(config.staging_dir, archive_name)
    if archive_path is None:
        raise FileNotFoundError(f"Archivo no encontrado: {archive_name}")

    if tracker:
        tracker.start_restore(archive_name)

    with tempfile.TemporaryDirectory(prefix="restore-") as temp_dir:
        extract_dir = Path(temp_dir)
        if tracker:
            tracker.update(5, "restore", "Extrayendo backup…")

        with zipfile.ZipFile(archive_path, mode="r") as archive:
            archive.extractall(extract_dir)

        manifest_path = extract_dir / "manifest.json"
        if not manifest_path.is_file():
            raise RuntimeError("El backup no contiene manifest.json")

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        tables = list(manifest.get("tables", []))
        total_tables = len(tables)

        for index, table in enumerate(tables):
            table_id = str(table.get("id", ""))
            table_title = str(table.get("title") or table_id)
            csv_rel = str(table.get("csv", ""))
            if not table_id or not csv_rel:
                continue

            csv_path = extract_dir / csv_rel
            if not csv_path.is_file():
                logger.warning("CSV ausente para %s: %s", table_title, csv_rel)
                continue

            meta_rel = str(table.get("meta", ""))
            meta: dict[str, Any] = {}
            if meta_rel:
                meta_path = extract_dir / meta_rel
                if meta_path.is_file():
                    meta = json.loads(meta_path.read_text(encoding="utf-8"))

            if tracker and total_tables > 0:
                percent = 8 + int(82 * index / total_tables)
                tracker.update(
                    percent,
                    "restore",
                    f"Restaurando {table_title} ({index + 1}/{total_tables})…",
                )

            raw_rows = _read_csv_rows(csv_path)
            rows = [sanitize_row(raw, meta) for raw in raw_rows]
            rows = [row for row in rows if row]
            existing_ids = await client.fetch_all_record_ids(table_id)

            for offset in range(0, len(existing_ids), BATCH_SIZE):
                batch = existing_ids[offset : offset + BATCH_SIZE]
                await client.delete_records(table_id, batch)

            for offset in range(0, len(rows), BATCH_SIZE):
                batch = rows[offset : offset + BATCH_SIZE]
                await client.create_records(table_id, batch)

            logger.info("Restaurada %s: %d filas", table_title, len(rows))

            if tracker and total_tables > 0:
                percent = 8 + int(82 * (index + 1) / total_tables)
                tracker.update(
                    percent,
                    "restore",
                    f"Restaurado {table_title} ({len(rows)} filas)",
                )

    fingerprint = await compute_fingerprint(client, config.base_id)
    save_fingerprint(config.staging_dir, fingerprint)

    if tracker:
        tracker.complete_restore(archive_name)
