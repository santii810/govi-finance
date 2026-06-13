from __future__ import annotations

import json
from typing import Any

from worker.models import ClassifiedMovement
from worker.rules.engine import NocoDbRule, apply_rules_to_pending


def load_rules_from_records(records: list[dict[str, Any]]) -> list[NocoDbRule]:
    rules: list[NocoDbRule] = []
    for row in records:
        if row.get("Activa") is False:
            continue
        rules.append(
            NocoDbRule(
                id=str(row.get("Id", "")),
                scope=str(row.get("Alcance", "global")),
                account_id=row.get("Cuenta") or None,
                priority=int(row.get("Prioridad") or 0),
                condition=_parse_json_field(row.get("Condición") or row.get("Condicion")),
                actions=_parse_json_field(row.get("Acciones")),
                active=True,
            )
        )
    return rules


def pending_record_to_movement(record: dict[str, Any]) -> ClassifiedMovement:
    metadata = _parse_json_field(record.get("Metadatos"))
    if not isinstance(metadata, dict):
        metadata = {}
    metadata = {str(k): str(v) for k, v in metadata.items() if v is not None}

    persona = record.get("Persona", "Santi")
    if persona not in ("Santi", "Sandra", "Común"):
        persona = "Santi"

    importe = record.get("Importe", 0)
    try:
        importe_decimal = __import__("decimal").Decimal(str(importe))
    except Exception:
        importe_decimal = __import__("decimal").Decimal("0")

    from datetime import date

    fecha_raw = record.get("Fecha", "")
    fecha = date.fromisoformat(str(fecha_raw)[:10]) if fecha_raw else date.today()

    return ClassifiedMovement(
        fecha=fecha,
        importe=importe_decimal,
        concepto=str(record.get("Concepto") or ""),
        banco=str(record.get("Banco") or ""),
        persona=persona,  # type: ignore[arg-type]
        tabla_destino="Ingresos" if importe_decimal > 0 else "Gastos",
        categoria=None,
        idempotency_key=str(record.get("IdempotencyKey") or ""),
        referencia=None,
        metadata=metadata,
    )


def classify_pending_record(
    record: dict[str, Any],
    rules: list[NocoDbRule],
) -> ClassifiedMovement:
    pending = pending_record_to_movement(record)
    account_id = pending.metadata.get("account_id", "")
    return apply_rules_to_pending(pending, account_id=account_id, nocodb_rules=rules)


def classification_to_fields(classified: ClassifiedMovement) -> dict[str, Any]:
    fields: dict[str, Any] = {
        "TablaDestino": classified.tabla_destino,
        "Persona": classified.persona,
        "Importe": float(classified.importe),
    }
    if classified.categoria:
        fields["Categoría"] = classified.categoria
    return fields


def _parse_json_field(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}
