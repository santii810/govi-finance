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
    skipped = 0
    seen = set(existing)
    for movement in movements:
        if movement.idempotency_key in seen:
            skipped += 1
            continue
        await client.create_record(table_id, movement_to_record(movement))
        seen.add(movement.idempotency_key)
        inserted += 1

    return ImportResult(
        inserted=inserted,
        skipped=skipped,
        total=len(movements),
    )
