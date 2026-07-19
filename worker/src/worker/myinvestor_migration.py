from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Literal

from worker.parsers.common import parse_date_flexible, parse_decimal
from worker.parsers.myinvestor import (
    build_canonical_idempotency_key,
    canonicalize_legacy_key,
)

Estado = Literal["pending", "accepted", "modified", "ignored"]

_ESTADO_PRIORITY: dict[str, int] = {
    "accepted": 0,
    "modified": 1,
    "ignored": 2,
    "pending": 3,
}


@dataclass(frozen=True)
class MyInvestorActionRow:
    id: int
    idempotency_key: str
    estado: str
    fecha: str | None
    importe: Decimal | float | int | str | None
    concepto: str
    metadatos: dict[str, Any] | None = None


@dataclass(frozen=True)
class MigrationPlan:
    delete_ids: list[int]
    updates: list[tuple[int, str]]  # (id, new_key)


def canonical_key_for_row(row: MyInvestorActionRow) -> str | None:
    """Deriva la key canónica desde la key legacy o, si falla, desde campos de la fila."""
    legacy = (row.idempotency_key or "").strip()
    if legacy:
        from_legacy = canonicalize_legacy_key(legacy)
        if from_legacy:
            return from_legacy

    if not row.fecha or row.importe is None or not row.concepto:
        return None
    try:
        fecha = parse_date_flexible(str(row.fecha))
        importe = parse_decimal(str(row.importe))
        fecha_valor = None
        meta = row.metadatos or {}
        raw_valor = str(meta.get("fecha_valor", "")).strip()
        if raw_valor:
            fecha_valor = parse_date_flexible(raw_valor)
    except ValueError:
        return None
    return build_canonical_idempotency_key(
        fecha=fecha,
        fecha_valor=fecha_valor,
        concepto=row.concepto,
        importe=importe,
    )


def plan_myinvestor_idempotency_migration(rows: list[MyInvestorActionRow]) -> MigrationPlan:
    """Agrupa por key canónica: conserva el mejor estado, borra el resto, renombra keys."""
    grouped: dict[str, list[MyInvestorActionRow]] = {}
    unparseable: list[MyInvestorActionRow] = []
    for row in rows:
        key = canonical_key_for_row(row)
        if key is None:
            unparseable.append(row)
            continue
        grouped.setdefault(key, []).append(row)

    delete_ids: list[int] = []
    updates: list[tuple[int, str]] = []

    for canonical, group in grouped.items():
        ordered = sorted(
            group,
            key=lambda item: (
                _ESTADO_PRIORITY.get(item.estado, 99),
                item.id,
            ),
        )
        keeper = ordered[0]
        for duplicate in ordered[1:]:
            delete_ids.append(duplicate.id)
        if keeper.idempotency_key != canonical:
            updates.append((keeper.id, canonical))

    return MigrationPlan(delete_ids=delete_ids, updates=updates)
