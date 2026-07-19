#!/usr/bin/env python3
"""Crea la tabla GastosPlantillas en NocoDB e inserta datos iniciales. Idempotente."""

from __future__ import annotations

import os
import sys

import httpx

BASE_ID = os.environ.get("NOCODB_BASE_ID", "pnf173not1wvzg0")
TABLE_TITLE = "GastosPlantillas"

SEED_ROWS = [
    {
        "Plantilla": "piso-fijos",
        "Nombre": "Piso — gastos fijos",
        "Descripcion": "Seguro, comunidad e hipoteca (Unicaja Común)",
        "DiaMes": 1,
        "Cantidad": 63.54,
        "Destino": "Seguros",
        "Fuente": "Unicaja Común",
        "Persona": "Común",
        "Categoria": "Piso",
        "Orden": 1,
        "Activa": True,
    },
    {
        "Plantilla": "piso-fijos",
        "Nombre": "Piso — gastos fijos",
        "Descripcion": "Seguro, comunidad e hipoteca (Unicaja Común)",
        "DiaMes": 2,
        "Cantidad": 56,
        "Destino": "Comunidad",
        "Fuente": "Unicaja Común",
        "Persona": "Común",
        "Categoria": "Piso",
        "Orden": 2,
        "Activa": True,
    },
    {
        "Plantilla": "piso-fijos",
        "Nombre": "Piso — gastos fijos",
        "Descripcion": "Seguro, comunidad e hipoteca (Unicaja Común)",
        "DiaMes": 5,
        "Cantidad": 328.23,
        "Destino": "Hipoteca",
        "Fuente": "Unicaja Común",
        "Persona": "Común",
        "Categoria": "Piso",
        "Orden": 3,
        "Activa": True,
    },
]


def _client() -> httpx.Client:
    base = os.environ.get("NOCODB_URL", "http://localhost:23456").rstrip("/")
    token = os.environ.get("NOCODB_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("NOCODB_API_TOKEN es obligatorio")
    return httpx.Client(base_url=base, headers={"xc-token": token}, timeout=60.0)


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
    if body["title"] in columns:
        return
    _request(client, "POST", f"/api/v2/meta/tables/{table_id}/columns", json={**body, "parentId": table_id})


def _ensure_table(client: httpx.Client) -> str:
    table = _table_by_title(client, TABLE_TITLE)
    if not table:
        data = _request(
            client,
            "POST",
            f"/api/v2/meta/bases/{BASE_ID}/tables",
            json={
                "title": TABLE_TITLE,
                "columns": [
                    {
                        "column_name": "Plantilla",
                        "title": "Plantilla",
                        "uidt": "SingleLineText",
                    }
                ],
            },
        )
        table_id = data["id"]
    else:
        table_id = table["id"]

    persona_options = {
        "options": [
            {"title": "Santi", "color": "#cfdffe"},
            {"title": "Sandra", "color": "#d0f1fd"},
            {"title": "Común", "color": "#c2f5e8"},
        ]
    }

    for col in (
        {"column_name": "Nombre", "title": "Nombre", "uidt": "SingleLineText"},
        {"column_name": "Descripcion", "title": "Descripcion", "uidt": "LongText"},
        {"column_name": "DiaMes", "title": "DiaMes", "uidt": "Number"},
        {"column_name": "Cantidad", "title": "Cantidad", "uidt": "Decimal"},
        {"column_name": "Destino", "title": "Destino", "uidt": "SingleLineText"},
        {"column_name": "Fuente", "title": "Fuente", "uidt": "SingleLineText"},
        {
            "column_name": "Persona",
            "title": "Persona",
            "uidt": "SingleSelect",
            "colOptions": persona_options,
        },
        {"column_name": "Categoria", "title": "Categoria", "uidt": "SingleLineText"},
        {"column_name": "Orden", "title": "Orden", "uidt": "Number"},
        {"column_name": "Activa", "title": "Activa", "uidt": "Checkbox"},
    ):
        _ensure_column(client, table_id, col)

    return table_id


def _list_records(client: httpx.Client, table_id: str) -> list[dict]:
    records: list[dict] = []
    offset = 0
    while True:
        data = _request(client, "GET", f"/api/v2/tables/{table_id}/records?limit=500&offset={offset}")
        batch = list(data.get("list", []))
        records.extend(batch)
        if data.get("pageInfo", {}).get("isLastPage", True) or not batch:
            break
        offset += len(batch)
    return records


def _seed(client: httpx.Client, table_id: str) -> int:
    existing = _list_records(client, table_id)
    if existing:
        return 0
    for row in SEED_ROWS:
        _request(client, "POST", f"/api/v2/tables/{table_id}/records", json=row)
    return len(SEED_ROWS)


def main() -> None:
    with _client() as client:
        table_id = _ensure_table(client)
        seeded = _seed(client, table_id)
    print(f"GastosPlantillas table: {table_id}")
    print(f"Seeded rows: {seeded}")


if __name__ == "__main__":
    main()
