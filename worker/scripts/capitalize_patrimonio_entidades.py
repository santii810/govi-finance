#!/usr/bin/env python3
"""Capitalize Entidad values in the Patrimonio table. Idempotent.

Uses only the standard library so it can run with the host Python.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

PATRIMONIO_TABLE_ID = os.environ.get("PATRIMONIO_TABLE_ID", "mimdsus64el2tnl")

# Mapeo explícito (respeta la marca comercial). Comparación por minúsculas.
MAPPING = {
    "mediolanum": "Mediolanum",
    "mintos": "Mintos",
    "myinvestor": "MyInvestor",
    "revolut": "Revolut",
    "unicaja": "Unicaja",
    "trade republic": "Trade Republic",
    "blockchain": "Blockchain",
    "piso": "Piso",
}


def _base_and_token() -> tuple[str, str]:
    base = os.environ.get("NOCODB_URL", "http://localhost:23456").rstrip("/")
    token = os.environ.get("NOCODB_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("NOCODB_API_TOKEN es obligatorio")
    return base, token


def _request(base: str, token: str, method: str, path: str, payload=None):
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


def _list_all(base: str, token: str) -> list[dict]:
    records: list[dict] = []
    offset = 0
    while True:
        path = f"/api/v2/tables/{PATRIMONIO_TABLE_ID}/records?limit=500&offset={offset}&fields=Id,Entidad"
        data = _request(base, token, "GET", path)
        batch = list(data.get("list", []))
        records.extend(batch)
        page = data.get("pageInfo", {})
        if page.get("isLastPage", True) or not batch:
            break
        offset += len(batch)
    return records


def main() -> None:
    base, token = _base_and_token()
    records = _list_all(base, token)

    updates: list[dict] = []
    unmapped: set[str] = set()
    for rec in records:
        entidad = rec.get("Entidad")
        if not isinstance(entidad, str) or not entidad.strip():
            continue
        key = entidad.strip().lower()
        target = MAPPING.get(key)
        if target is None:
            unmapped.add(entidad)
            continue
        if entidad != target:
            updates.append({"Id": rec["Id"], "Entidad": target})

    if unmapped:
        print("Entidades sin mapear (revisar):", sorted(unmapped))

    if not updates:
        print("Nada que actualizar (ya capitalizadas).")
        return

    for i in range(0, len(updates), 50):
        chunk = updates[i : i + 50]
        _request(base, token, "PATCH", f"/api/v2/tables/{PATRIMONIO_TABLE_ID}/records", chunk)

    print(f"Entidades capitalizadas: {len(updates)} registros actualizados.")


if __name__ == "__main__":
    main()
