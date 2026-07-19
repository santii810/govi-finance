from __future__ import annotations

from datetime import date

from worker.bot.config import ImportResult, movement_to_record
from worker.models import ClassifiedMovement
from worker.nocodb import NocoDbClient


async def create_account_dump(
    client: NocoDbClient,
    dumps_table_id: str,
    *,
    nombre_fichero: str,
    account_nocodb_id: int,
    fecha_desde: date | None,
    fecha_hasta: date | None,
    num_registros: int,
) -> dict:
    return await client.create_record(
        dumps_table_id,
        {
            "NombreFichero": nombre_fichero[:255],
            "FechaPrimerRegistro": fecha_desde.isoformat() if fecha_desde else None,
            "FechaUltimoRegistro": fecha_hasta.isoformat() if fecha_hasta else None,
            "NumRegistros": num_registros,
            "NumInsertados": 0,
            "NumOmitidos": 0,
            "Account": {"Id": account_nocodb_id},
        },
    )


async def import_movements(
    client: NocoDbClient,
    table_id: str,
    movements: list[ClassifiedMovement],
    *,
    account_dump_id: int,
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
        await client.create_record(
            table_id,
            movement_to_record(movement, account_dump_id=account_dump_id),
        )
        seen.add(movement.idempotency_key)
        inserted += 1

    return ImportResult(
        inserted=inserted,
        skipped=skipped,
        total=len(movements),
    )


async def finalize_account_dump(
    client: NocoDbClient,
    dumps_table_id: str,
    dump_id: int,
    result: ImportResult,
) -> None:
    await client.update_record(
        dumps_table_id,
        dump_id,
        {
            "NumInsertados": result.inserted,
            "NumOmitidos": result.skipped,
        },
    )
