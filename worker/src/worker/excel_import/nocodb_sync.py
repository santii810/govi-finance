from __future__ import annotations

from typing import Any

from worker.excel_import.config import SELECT_COLORS
from worker.nocodb import NocoDbClient


def _column_by_title(meta: dict[str, Any], title: str) -> dict[str, Any] | None:
    for column in meta.get("columns", []):
        if column.get("title") == title:
            return column
    return None


def _select_values(records: list[dict[str, Any]], field: str) -> set[str]:
    values: set[str] = set()
    for record in records:
        value = record.get(field)
        if value not in (None, ""):
            values.add(str(value))
    return values


async def ensure_select_options(
    client: NocoDbClient,
    table_id: str,
    field: str,
    values: set[str],
) -> list[str]:
    if not values:
        return []

    meta = await client.get_table_meta(table_id)
    column = _column_by_title(meta, field)
    if not column or column.get("uidt") != "SingleSelect":
        return []

    existing_options = list(column.get("colOptions", {}).get("options", []))
    existing_titles = {str(option.get("title")) for option in existing_options if option.get("title")}
    missing = sorted(values - existing_titles)
    if not missing:
        return []

    start = len(existing_options)
    for index, title in enumerate(missing):
        existing_options.append(
            {
                "title": title,
                "color": SELECT_COLORS[(start + index) % len(SELECT_COLORS)],
            }
        )

    await client.patch_column(str(column["id"]), {"colOptions": {"options": existing_options}})
    return missing


async def ensure_table_selects(
    client: NocoDbClient,
    table_id: str,
    fields: tuple[str, ...],
    records: list[dict[str, Any]],
) -> dict[str, list[str]]:
    added: dict[str, list[str]] = {}
    for field in fields:
        created = await ensure_select_options(client, table_id, field, _select_values(records, field))
        if created:
            added[field] = created
    return added


async def bulk_insert(
    client: NocoDbClient,
    table_id: str,
    records: list[dict[str, Any]],
    *,
    chunk_size: int = 100,
) -> int:
    inserted = 0
    for index in range(0, len(records), chunk_size):
        chunk = records[index : index + chunk_size]
        await client.create_records(table_id, chunk)
        inserted += len(chunk)
    return inserted
