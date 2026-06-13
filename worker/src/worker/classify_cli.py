from __future__ import annotations

import os

from worker.classify_service import (
    classify_pending_record,
    classification_to_fields,
    load_rules_from_records,
)
from worker.nocodb import NocoDbClient


async def classify_all_pending(
    client: NocoDbClient,
    *,
    automatic_actions_table_id: str,
    import_rules_table_id: str,
    dry_run: bool = False,
) -> tuple[int, int]:
    rule_rows = await client.list_records(import_rules_table_id, where="(Activa,eq,true)")
    rules = load_rules_from_records(rule_rows)

    pending_rows = await client.list_records(
        automatic_actions_table_id,
        where="(Estado,eq,pending)",
    )

    updated = 0
    for row in pending_rows:
        classified = classify_pending_record(row, rules)
        if dry_run:
            updated += 1
            continue
        await client.update_record(
            automatic_actions_table_id,
            row["Id"],
            classification_to_fields(classified),
        )
        updated += 1

    return len(pending_rows), updated


async def run_classify(*, dry_run: bool = False) -> tuple[int, int]:
    nocodb_url = os.environ.get("NOCODB_URL", "http://nocodb:8080").rstrip("/")
    nocodb_token = os.environ.get("NOCODB_API_TOKEN", "").strip()
    if not nocodb_token:
        raise RuntimeError("NOCODB_API_TOKEN es obligatorio")

    automatic_actions_table_id = os.environ.get("AUTOMATIC_ACTIONS_TABLE_ID", "mugm6tw1ail68rq")
    import_rules_table_id = os.environ.get("IMPORT_RULES_TABLE_ID", "mo7uf7o396lxp59")

    client = NocoDbClient(nocodb_url, nocodb_token)
    return await classify_all_pending(
        client,
        automatic_actions_table_id=automatic_actions_table_id,
        import_rules_table_id=import_rules_table_id,
        dry_run=dry_run,
    )
