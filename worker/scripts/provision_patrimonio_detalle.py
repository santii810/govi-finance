#!/usr/bin/env python3
"""Add the JSON `Detalle` column to the Patrimonio table in NocoDB. Idempotent.

Uses only the standard library so it can run with the host Python.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

PATRIMONIO_TABLE_ID = os.environ.get("PATRIMONIO_TABLE_ID", "mimdsus64el2tnl")
COLUMN_TITLE = "Detalle"


def _base_and_token() -> tuple[str, str]:
    base = os.environ.get("NOCODB_URL", "http://localhost:23456").rstrip("/")
    token = os.environ.get("NOCODB_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("NOCODB_API_TOKEN es obligatorio")
    return base, token


def _request(base: str, token: str, method: str, path: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        f"{base}{path}",
        data=data,
        method=method,
        headers={"xc-token": token, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:  # pragma: no cover
        raise RuntimeError(f"{method} {path} -> {exc.code}: {exc.read().decode()}") from exc


def main() -> None:
    base, token = _base_and_token()
    meta = _request(base, token, "GET", f"/api/v2/meta/tables/{PATRIMONIO_TABLE_ID}")
    columns = {c["title"]: c for c in meta.get("columns", [])}
    if COLUMN_TITLE in columns:
        print(f"Columna '{COLUMN_TITLE}' ya existe (id {columns[COLUMN_TITLE]['id']})")
        return
    _request(
        base,
        token,
        "POST",
        f"/api/v2/meta/tables/{PATRIMONIO_TABLE_ID}/columns",
        {
            "parentId": PATRIMONIO_TABLE_ID,
            "column_name": COLUMN_TITLE,
            "title": COLUMN_TITLE,
            "uidt": "JSON",
        },
    )
    print(f"Columna '{COLUMN_TITLE}' (JSON) creada en Patrimonio {PATRIMONIO_TABLE_ID}")


if __name__ == "__main__":
    main()
