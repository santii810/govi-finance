from __future__ import annotations

from worker.bot.config import ImportResult, movement_to_record
from worker.models import ClassifiedMovement
from worker.nocodb import NocoDbClient


async def import_movements(
    client: NocoDbClient,
    table_id: str,
    movements: list[ClassifiedMovement],
) -> ImportResult:
    keys = [movement.idempotency_key for movement in movements]
    existing = await client.existing_idempotency_keys(table_id, keys)

    inserted = 0
    for movement in movements:
        if movement.idempotency_key in existing:
            continue
        await client.create_record(table_id, movement_to_record(movement))
        inserted += 1

    return ImportResult(
        inserted=inserted,
        skipped=len(existing),
        total=len(movements),
    )
