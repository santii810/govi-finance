from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from worker.excel_import.config import TABLES
from worker.excel_import.loader import load_sheet_rows
from worker.excel_import.nocodb_sync import bulk_insert, ensure_table_selects
from worker.gastos_comun_import.mappers import GASTOS_COMUN_SHEET, map_gastos_comun_row
from worker.nocodb import NocoDbClient

GASTOS_TABLE_ID = TABLES["gastos"]
SELECT_FIELDS = ("Fuente", "Categoría", "Persona")
UBICACION_FIELD = "Ubicación"


@dataclass
class GastosComunImportReport:
    file: str
    sheet: str
    dry_run: bool
    excel_rows: int = 0
    mapped_rows: int = 0
    skipped_rows: int = 0
    inserted_rows: int = 0
    added_select_options: dict[str, list[str]] = field(default_factory=dict)
    created_fields: list[str] = field(default_factory=list)
    status: str = "ok"
    message: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "file": self.file,
            "sheet": self.sheet,
            "dry_run": self.dry_run,
            "excel_rows": self.excel_rows,
            "mapped_rows": self.mapped_rows,
            "skipped_rows": self.skipped_rows,
            "inserted_rows": self.inserted_rows,
            "added_select_options": self.added_select_options,
            "created_fields": self.created_fields,
            "status": self.status,
            "message": self.message,
        }


def _map_records(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    mapped: list[dict[str, Any]] = []
    skipped = 0
    for row in rows:
        record = map_gastos_comun_row(row)
        if record is None:
            skipped += 1
            continue
        mapped.append(record)
    return mapped, skipped


async def ensure_ubicacion_column(client: NocoDbClient, table_id: str) -> bool:
    meta = await client.get_table_meta(table_id)
    for column in meta.get("columns", []):
        if column.get("title") == UBICACION_FIELD:
            return False
    await client.create_column(
        table_id,
        {
            "title": UBICACION_FIELD,
            "uidt": "SingleLineText",
        },
    )
    return True


async def import_gastos_comun(
    client: NocoDbClient,
    path: Path,
    *,
    dry_run: bool = False,
) -> GastosComunImportReport:
    raw_rows = load_sheet_rows(path, GASTOS_COMUN_SHEET)
    mapped_rows, skipped_rows = _map_records(raw_rows)
    report = GastosComunImportReport(
        file=str(path),
        sheet=GASTOS_COMUN_SHEET,
        dry_run=dry_run,
        excel_rows=len(raw_rows),
        mapped_rows=len(mapped_rows),
        skipped_rows=skipped_rows,
    )

    if not mapped_rows:
        report.status = "empty"
        report.message = "No hay filas válidas para importar"
        return report

    if dry_run:
        report.status = "dry_run"
        report.message = f"Listo para insertar {len(mapped_rows)} filas (Persona = Común)"
        return report

    if await ensure_ubicacion_column(client, GASTOS_TABLE_ID):
        report.created_fields.append(UBICACION_FIELD)

    report.added_select_options = await ensure_table_selects(
        client,
        GASTOS_TABLE_ID,
        SELECT_FIELDS,
        mapped_rows,
    )
    report.inserted_rows = await bulk_insert(client, GASTOS_TABLE_ID, mapped_rows)
    report.status = "imported"
    report.message = f"Insertadas {report.inserted_rows} filas"
    return report
