#!/usr/bin/env python3
"""Migra IdempotencyKey de MyInvestor a forma canónica y elimina duplicados.

Uso:
  python -m worker.scripts.migrate_myinvestor_idempotency --dry-run
  python -m worker.scripts.migrate_myinvestor_idempotency --apply
"""

from __future__ import annotations

import argparse
import asyncio
import os

from worker.myinvestor_migration import (
    MyInvestorActionRow,
    plan_myinvestor_idempotency_migration,
)
from worker.nocodb import NocoDbClient


def _client() -> tuple[NocoDbClient, str]:
    url = os.environ.get("NOCODB_URL", "http://localhost:23456").rstrip("/")
    token = os.environ.get("NOCODB_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("NOCODB_API_TOKEN es obligatorio")
    table_id = os.environ.get("AUTOMATIC_ACTIONS_TABLE_ID", "mugm6tw1ail68rq")
    return NocoDbClient(url, token), table_id


async def _load_myinvestor_rows(client: NocoDbClient, table_id: str) -> list[MyInvestorActionRow]:
    rows: list[MyInvestorActionRow] = []
    offset = 0
    while True:
        batch = await client.list_records(
            table_id,
            where="(Banco,eq,MyInvestor)",
            limit=1000,
            offset=offset,
        )
        if not batch:
            break
        for item in batch:
            rows.append(
                MyInvestorActionRow(
                    id=int(item["Id"]),
                    idempotency_key=str(item.get("IdempotencyKey") or ""),
                    estado=str(item.get("Estado") or "pending"),
                    fecha=item.get("Fecha"),
                    importe=item.get("Importe"),
                    concepto=str(item.get("Concepto") or ""),
                    metadatos=item.get("Metadatos") if isinstance(item.get("Metadatos"), dict) else None,
                )
            )
        if len(batch) < 1000:
            break
        offset += 1000
    return rows


async def run(*, apply: bool) -> None:
    client, table_id = _client()
    rows = await _load_myinvestor_rows(client, table_id)
    plan = plan_myinvestor_idempotency_migration(rows)
    print(f"MyInvestor rows: {len(rows)}")
    print(f"To delete (duplicates): {len(plan.delete_ids)}")
    print(f"To update (canonicalize key): {len(plan.updates)}")
    if plan.delete_ids[:5]:
        print(f"  delete sample ids: {plan.delete_ids[:5]}")
    if plan.updates[:3]:
        print(f"  update sample: {plan.updates[:3]}")

    if not apply:
        print("Dry-run only. Re-run with --apply to write.")
        return

    # 1) Borrar duplicados primero (evita choques de unique al renombrar).
    chunk = 50
    for index in range(0, len(plan.delete_ids), chunk):
        batch = plan.delete_ids[index : index + chunk]
        await client.delete_records(table_id, batch)
        print(f"Deleted {len(batch)} records (offset {index})")

    # 2) Actualizar keys restantes.
    for record_id, new_key in plan.updates:
        await client.update_record(table_id, record_id, {"IdempotencyKey": new_key})
    print(f"Updated {len(plan.updates)} IdempotencyKey values.")
    print("Done.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true")
    group.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    asyncio.run(run(apply=args.apply))


if __name__ == "__main__":
    main()
