from __future__ import annotations

from worker.accounts import Account, load_accounts
from worker.nocodb import NocoDbClient


def account_from_record(row: dict) -> Account:
    return Account(
        id=str(row.get("Slug", "")).strip(),
        label=str(row.get("Label", "")).strip(),
        banco=str(row.get("Banco", "")).strip(),
        tipo=row.get("Tipo") or "personal",
        persona=row.get("Persona") or "Santi",
        parser=row.get("Parser") or "",
        detection={},
        nocodb_id=int(row["Id"]),
    )


async def load_accounts_from_nocodb(
    client: NocoDbClient,
    table_id: str,
    *,
    active_only: bool = True,
) -> list[Account]:
    where = "(Estado,eq,Active)" if active_only else None
    rows = await client.list_records(table_id, where=where)
    accounts = [account_from_record(row) for row in rows if row.get("Slug")]
    accounts.sort(key=lambda item: item.label)
    if accounts:
        return accounts
    return load_accounts()


async def find_account_by_slug(
    client: NocoDbClient,
    table_id: str,
    slug: str,
) -> Account | None:
    rows = await client.list_records(table_id, where=f"(Slug,eq,{slug})")
    if not rows:
        return None
    return account_from_record(rows[0])
