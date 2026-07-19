from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from worker.excel_import.config import ENTITY_TABLE, SHEETS, TABLES
from worker.excel_import.loader import load_workbook_sheets
from worker.excel_import.mappers import MAPPERS, SELECT_FIELDS
from worker.excel_import.nocodb_sync import bulk_insert, ensure_table_selects
from worker.gastos_comun_import.service import ensure_ubicacion_column
from worker.nocodb import NocoDbClient


@dataclass
class EntityImportResult:
    entity: str
    sheet: str
    excel_rows: int
    mapped_rows: int
    skipped_rows: int
    existing_rows: int
    inserted_rows: int
    added_select_options: dict[str, list[str]] = field(default_factory=dict)
    status: str = "ok"
    message: str = ""


@dataclass
class ImportReport:
    file: str
    dry_run: bool
    results: list[EntityImportResult] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "file": self.file,
            "dry_run": self.dry_run,
            "results": [
                {
                    "entity": result.entity,
                    "sheet": result.sheet,
                    "excel_rows": result.excel_rows,
                    "mapped_rows": result.mapped_rows,
                    "skipped_rows": result.skipped_rows,
                    "existing_rows": result.existing_rows,
                    "inserted_rows": result.inserted_rows,
                    "added_select_options": result.added_select_options,
                    "status": result.status,
                    "message": result.message,
                }
                for result in self.results
            ],
        }


def _map_records(entity: str, rows: list[dict[str, Any]], default_persona: str) -> tuple[list[dict[str, Any]], int]:
    mapper = MAPPERS[entity]
    mapped: list[dict[str, Any]] = []
    skipped = 0
    for row in rows:
        record = mapper(row, default_persona)
        if record is None:
            skipped += 1
            continue
        mapped.append(record)
    return mapped, skipped


async def import_excel(
    client: NocoDbClient,
    path: Path,
    *,
    entities: list[str] | None = None,
    default_persona: str = "Santi",
    dry_run: bool = False,
    skip_existing: bool = True,
) -> ImportReport:
    selected = entities or list(SHEETS.keys())
    unknown = [entity for entity in selected if entity not in SHEETS]
    if unknown:
        raise ValueError(f"Entidades desconocidas: {', '.join(unknown)}")

    sheets = load_workbook_sheets(path, selected)
    report = ImportReport(file=str(path), dry_run=dry_run)

    for entity in selected:
        sheet_name = SHEETS[entity]
        table_id = TABLES[ENTITY_TABLE[entity]]
        raw_rows = sheets[entity]
        mapped_rows, skipped_rows = _map_records(entity, raw_rows, default_persona)
        existing_rows = await client.count_records(table_id)

        result = EntityImportResult(
            entity=entity,
            sheet=sheet_name,
            excel_rows=len(raw_rows),
            mapped_rows=len(mapped_rows),
            skipped_rows=skipped_rows,
            existing_rows=existing_rows,
            inserted_rows=0,
        )

        if skip_existing and existing_rows >= len(mapped_rows) and len(mapped_rows) > 0:
            result.status = "skipped"
            result.message = (
                f"Ya hay {existing_rows} filas en NocoDB (Excel mapea {len(mapped_rows)}); "
                "usa --force para reimportar"
            )
            report.results.append(result)
            continue

        if not mapped_rows:
            result.status = "empty"
            result.message = "No hay filas válidas para importar"
            report.results.append(result)
            continue

        result.added_select_options = await ensure_table_selects(
            client,
            table_id,
            SELECT_FIELDS[entity],
            mapped_rows,
        )

        if dry_run:
            result.status = "dry_run"
            result.message = f"Listo para insertar {len(mapped_rows)} filas"
            report.results.append(result)
            continue

        if entity == "gastos_personales":
            await ensure_ubicacion_column(client, table_id)

        result.inserted_rows = await bulk_insert(client, table_id, mapped_rows)
        result.status = "imported"
        result.message = f"Insertadas {result.inserted_rows} filas"
        report.results.append(result)

    return report
