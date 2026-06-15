from __future__ import annotations

import csv
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from backup_manager.config import BackupConfig
from backup_manager.nocodb import NocoDbClient


def _safe_filename(name: str) -> str:
    cleaned = re.sub(r"[^\w\-]+", "_", name.strip(), flags=re.UNICODE)
    cleaned = cleaned.strip("_")
    return cleaned or "tabla"


def _cell_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return str(value)


def _column_names(meta: dict[str, Any], rows: list[dict[str, Any]]) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()

    for column in meta.get("columns", []):
        title = column.get("title")
        if isinstance(title, str) and title and title not in seen:
            ordered.append(title)
            seen.add(title)

    for row in rows:
        for key in row:
            if key not in seen:
                ordered.append(key)
                seen.add(key)

    return ordered


def _write_csv(path: Path, columns: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({column: _cell_value(row.get(column)) for column in columns})


async def export_base(client: NocoDbClient, config: BackupConfig) -> Path:
    timestamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    export_dir = config.staging_dir / f"export-{timestamp}"
    tables_dir = export_dir / "tables"
    meta_dir = export_dir / "meta"
    tables_dir.mkdir(parents=True)
    meta_dir.mkdir(parents=True)

    tables = await client.list_base_tables(config.base_id)
    manifest_tables: list[dict[str, Any]] = []

    for table in tables:
        table_id = str(table.get("id", ""))
        table_title = str(table.get("title") or table_id)
        if not table_id:
            continue

        meta = await client.get_table_meta(table_id)
        rows = await client.fetch_all_records(table_id)
        columns = _column_names(meta, rows)
        csv_name = f"{_safe_filename(table_title)}.csv"
        csv_path = tables_dir / csv_name
        _write_csv(csv_path, columns, rows)

        meta_path = meta_dir / f"{_safe_filename(table_title)}.json"
        meta_path.write_text(
            json.dumps(meta, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        manifest_tables.append(
            {
                "id": table_id,
                "title": table_title,
                "rows": len(rows),
                "columns": len(columns),
                "csv": f"tables/{csv_name}",
                "meta": f"meta/{meta_path.name}",
            }
        )

    manifest = {
        "exported_at": datetime.now(UTC).isoformat(),
        "base_id": config.base_id,
        "format": "csv-utf8-bom",
        "tables": manifest_tables,
    }
    (export_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (meta_dir / "tables.json").write_text(
        json.dumps(tables, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return export_dir
