#!/usr/bin/env python3
"""Provision Accounts, AccountDumps and links in NocoDB. Idempotent."""

from __future__ import annotations

import argparse
import os
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

import httpx
import yaml

BASE_ID = os.environ.get("NOCODB_BASE_ID", "pnf173not1wvzg0")
AA_TABLE_ID = os.environ.get("AUTOMATIC_ACTIONS_TABLE_ID", "mugm6tw1ail68rq")

ACCOUNTS_TABLE_TITLE = "Accounts"
DUMPS_TABLE_TITLE = "AccountDumps"


def _client() -> tuple[str, str, httpx.Client]:
    base = os.environ.get("NOCODB_URL", "http://localhost:23456").rstrip("/")
    token = os.environ.get("NOCODB_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("NOCODB_API_TOKEN es obligatorio")
    return base, token, httpx.Client(base_url=base, headers={"xc-token": token}, timeout=60.0)


def _request(client: httpx.Client, method: str, path: str, **kwargs):
    response = client.request(method, path, **kwargs)
    if response.status_code >= 400:
        raise RuntimeError(f"{method} {path} -> {response.status_code}: {response.text}")
    return response.json() if response.content else {}


def _table_by_title(client: httpx.Client, title: str) -> dict | None:
    data = _request(client, "GET", f"/api/v2/meta/bases/{BASE_ID}/tables")
    return next((t for t in data.get("list", []) if t.get("title") == title), None)


def _column_map(client: httpx.Client, table_id: str) -> dict[str, dict]:
    meta = _request(client, "GET", f"/api/v2/meta/tables/{table_id}")
    return {c["title"]: c for c in meta.get("columns", [])}


def _ensure_column(client: httpx.Client, table_id: str, body: dict) -> None:
    columns = _column_map(client, table_id)
    title = body["title"]
    if title in columns:
        return
    payload = {**body, "parentId": table_id}
    _request(client, "POST", f"/api/v2/meta/tables/{table_id}/columns", json=payload)


def _ensure_link(
    client: httpx.Client,
    *,
    parent_table_id: str,
    child_table_id: str,
    parent_title: str,
    relation: str,
) -> None:
    columns = _column_map(client, parent_table_id)
    if parent_title in columns:
        return
    _request(
        client,
        "POST",
        f"/api/v2/meta/tables/{parent_table_id}/columns",
        json={
            "parentId": parent_table_id,
            "childId": child_table_id,
            "column_name": parent_title,
            "title": parent_title,
            "uidt": "LinkToAnotherRecord",
            "type": relation,
        },
    )


def _ensure_accounts_table(client: httpx.Client) -> str:
    table = _table_by_title(client, ACCOUNTS_TABLE_TITLE)
    if not table:
        data = _request(
            client,
            "POST",
            f"/api/v2/meta/bases/{BASE_ID}/tables",
            json={
                "title": ACCOUNTS_TABLE_TITLE,
                "columns": [
                    {
                        "column_name": "Slug",
                        "title": "Slug",
                        "uidt": "SingleLineText",
                        "unique": True,
                    }
                ],
            },
        )
        table_id = data["id"]
    else:
        table_id = table["id"]

    for col in (
        {"column_name": "Label", "title": "Label", "uidt": "SingleLineText"},
        {"column_name": "Banco", "title": "Banco", "uidt": "SingleLineText"},
        {
            "column_name": "Tipo",
            "title": "Tipo",
            "uidt": "SingleSelect",
            "colOptions": {
                "options": [
                    {"title": "personal", "color": "#cfdffe"},
                    {"title": "conjunta", "color": "#c2f5e8"},
                ]
            },
        },
        {
            "column_name": "Persona",
            "title": "Persona",
            "uidt": "SingleSelect",
            "colOptions": {
                "options": [
                    {"title": "Santi", "color": "#cfdffe"},
                    {"title": "Sandra", "color": "#d0f1fd"},
                    {"title": "Común", "color": "#c2f5e8"},
                ]
            },
        },
        {"column_name": "Parser", "title": "Parser", "uidt": "SingleLineText"},
        {
            "column_name": "Estado",
            "title": "Estado",
            "uidt": "SingleSelect",
            "colOptions": {
                "options": [
                    {"title": "Active", "color": "#c2f5e8"},
                    {"title": "Deprecated", "color": "#ffdce5"},
                ]
            },
        },
    ):
        _ensure_column(client, table_id, col)

    return table_id


def _ensure_dumps_table(client: httpx.Client, accounts_table_id: str) -> str:
    table = _table_by_title(client, DUMPS_TABLE_TITLE)
    if not table:
        data = _request(
            client,
            "POST",
            f"/api/v2/meta/bases/{BASE_ID}/tables",
            json={
                "title": DUMPS_TABLE_TITLE,
                "columns": [
                    {
                        "column_name": "NombreFichero",
                        "title": "NombreFichero",
                        "uidt": "SingleLineText",
                    }
                ],
            },
        )
        table_id = data["id"]
    else:
        table_id = table["id"]

    _ensure_link(
        client,
        parent_table_id=accounts_table_id,
        child_table_id=table_id,
        parent_title="AccountDumps",
        relation="hm",
    )

    columns = _column_map(client, table_id)
    if "Accounts" in columns and "Account" not in columns:
        _request(
            client,
            "PATCH",
            f"/api/v2/meta/columns/{columns['Accounts']['id']}",
            json={"title": "Account"},
        )

    for col in (
        {"column_name": "FechaPrimerRegistro", "title": "FechaPrimerRegistro", "uidt": "Date"},
        {"column_name": "FechaUltimoRegistro", "title": "FechaUltimoRegistro", "uidt": "Date"},
        {"column_name": "NumRegistros", "title": "NumRegistros", "uidt": "Number"},
        {"column_name": "NumInsertados", "title": "NumInsertados", "uidt": "Number"},
        {"column_name": "NumOmitidos", "title": "NumOmitidos", "uidt": "Number"},
    ):
        _ensure_column(client, table_id, col)

    _ensure_link(
        client,
        parent_table_id=table_id,
        child_table_id=AA_TABLE_ID,
        parent_title="AutomaticActions",
        relation="hm",
    )

    return table_id


def _remove_fichero_column(client: httpx.Client) -> None:
    aa_columns = _column_map(client, AA_TABLE_ID)
    if "Fichero" in aa_columns:
        _request(client, "DELETE", f"/api/v2/meta/columns/{aa_columns['Fichero']['id']}")


def _list_records(client: httpx.Client, table_id: str, *, where: str | None = None) -> list[dict]:
    records: list[dict] = []
    offset = 0
    while True:
        params = f"limit=500&offset={offset}"
        if where:
            params += f"&where={where}"
        data = _request(client, "GET", f"/api/v2/tables/{table_id}/records?{params}")
        batch = list(data.get("list", []))
        records.extend(batch)
        if data.get("pageInfo", {}).get("isLastPage", True) or not batch:
            break
        offset += len(batch)
    return records


def _seed_accounts(client: httpx.Client, accounts_table_id: str, yaml_path: Path) -> dict[str, int]:
    data = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
    slug_to_id: dict[str, int] = {}
    existing = _list_records(client, accounts_table_id)
    by_slug = {str(r.get("Slug", "")): r for r in existing}

    for row in data.get("accounts", []):
        slug = row["id"]
        fields = {
            "Slug": slug,
            "Label": row["label"],
            "Banco": row["banco"],
            "Tipo": row["tipo"],
            "Persona": row["persona"],
            "Parser": row["parser"],
            "Estado": "Active",
        }
        current = by_slug.get(slug)
        if current:
            slug_to_id[slug] = int(current["Id"])
            patch = {k: v for k, v in fields.items() if current.get(k) != v}
            if patch:
                _request(
                    client,
                    "PATCH",
                    f"/api/v2/tables/{accounts_table_id}/records",
                    json={"Id": current["Id"], **patch},
                )
        else:
            created = _request(
                client,
                "POST",
                f"/api/v2/tables/{accounts_table_id}/records",
                json=fields,
            )
            slug_to_id[slug] = int(created["Id"])
    return slug_to_id


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(str(value)[:10])


def _migrate_fichero(
    client: httpx.Client,
    *,
    accounts_table_id: str,
    dumps_table_id: str,
    slug_to_id: dict[str, int],
) -> int:
    rows = _list_records(client, AA_TABLE_ID, where="(Fichero,isnot,null)")
    if not rows:
        rows = [r for r in _list_records(client, AA_TABLE_ID) if r.get("Fichero")]
    if not rows:
        return 0

    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in rows:
        fichero = str(row.get("Fichero", "")).strip()
        if not fichero:
            continue
        meta = row.get("Metadatos") or {}
        if isinstance(meta, str):
            import json

            try:
                meta = json.loads(meta)
            except json.JSONDecodeError:
                meta = {}
        account_slug = str(meta.get("account_id", "")).strip() or "__unknown__"
        groups[(account_slug, fichero)].append(row)

    created = 0
    for (account_slug, fichero), items in groups.items():
        if any(item.get("AccountDumps") for item in items):
            continue
        account_id = slug_to_id.get(account_slug)
        fechas = [_parse_date(str(item.get("Fecha", ""))) for item in items]
        fechas = [f for f in fechas if f]
        dump = _request(
            client,
            "POST",
            f"/api/v2/tables/{dumps_table_id}/records",
            json={
                "NombreFichero": fichero[:255],
                "FechaPrimerRegistro": min(fechas).isoformat() if fechas else None,
                "FechaUltimoRegistro": max(fechas).isoformat() if fechas else None,
                "NumRegistros": len(items),
                "NumInsertados": len(items),
                "NumOmitidos": 0,
                **({"Account": {"Id": account_id}} if account_id else {}),
            },
        )
        dump_id = int(dump["Id"])
        for item in items:
            _request(
                client,
                "PATCH",
                f"/api/v2/tables/{AA_TABLE_ID}/records",
                json={"Id": item["Id"], "AccountDumps": {"Id": dump_id}},
            )
        created += 1
    return created


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--accounts-yaml",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "config" / "accounts.yaml",
    )
    parser.add_argument("--skip-migrate", action="store_true")
    args = parser.parse_args()

    _, _, client = _client()
    with client:
        accounts_id = _ensure_accounts_table(client)
        dumps_id = _ensure_dumps_table(client, accounts_id)
        slug_to_id = _seed_accounts(client, accounts_id, args.accounts_yaml)
        migrated = 0
        if not args.skip_migrate:
            migrated = _migrate_fichero(
                client,
                accounts_table_id=accounts_id,
                dumps_table_id=dumps_id,
                slug_to_id=slug_to_id,
            )
        _remove_fichero_column(client)

    print(f"Accounts table: {accounts_id}")
    print(f"AccountDumps table: {dumps_id}")
    print(f"Seeded accounts: {len(slug_to_id)}")
    print(f"Migrated dumps from Fichero: {migrated}")


if __name__ == "__main__":
    main()
