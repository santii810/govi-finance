from __future__ import annotations

import json
from typing import Any

# Columnas que NocoDB genera o calcula; no se pueden enviar en POST/PATCH.
NON_RESTORABLE_UIDTS = frozenset(
    {
        "ID",
        "CreatedTime",
        "LastModifiedTime",
        "CreatedBy",
        "LastModifiedBy",
        "Order",
        "Deleted",
        "Meta",
        "Formula",
        "Rollup",
        "Lookup",
        "Count",
        "AutoNumber",
        "QrCode",
        "Barcode",
        "Button",
    }
)

NUMERIC_UIDTS = frozenset({"Number", "Decimal", "Currency", "Percent", "Rating"})
BOOLEAN_UIDTS = frozenset({"Checkbox"})


def column_uidt_map(meta: dict[str, Any]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for column in meta.get("columns", []):
        title = column.get("title")
        uidt = column.get("uidt")
        if isinstance(title, str) and title and isinstance(uidt, str):
            mapping[title] = uidt
    return mapping


def restorable_columns(meta: dict[str, Any]) -> set[str]:
    allowed: set[str] = set()
    for title, uidt in column_uidt_map(meta).items():
        if uidt not in NON_RESTORABLE_UIDTS:
            allowed.add(title)
    return allowed


def _coerce_value(value: Any, uidt: str) -> Any:
    if value is None:
        return None
    if uidt in BOOLEAN_UIDTS:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {"1", "true", "yes", "si", "sí"}:
                return True
            if lowered in {"0", "false", "no", ""}:
                return False
        return bool(value)
    if uidt in NUMERIC_UIDTS:
        if isinstance(value, (int, float)):
            return value
        if isinstance(value, str):
            cleaned = value.strip().replace(",", ".")
            if cleaned == "":
                return None
            parsed = float(cleaned)
            if parsed.is_integer():
                return int(parsed)
            return parsed
    if uidt in {"Date", "DateTime", "Time"}:
        return str(value) if value != "" else None
    if uidt in {"MultiSelect", "User", "Collaborator"} and isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("[") or stripped.startswith("{"):
            try:
                return json.loads(stripped)
            except json.JSONDecodeError:
                return value
    return value


def sanitize_row(row: dict[str, Any], meta: dict[str, Any]) -> dict[str, Any]:
    uidts = column_uidt_map(meta)
    allowed = restorable_columns(meta)
    sanitized: dict[str, Any] = {}

    for key, value in row.items():
        if key not in allowed:
            continue
        if value is None:
            continue
        uidt = uidts.get(key, "")
        coerced = _coerce_value(value, uidt)
        if coerced is None:
            continue
        sanitized[key] = coerced

    return sanitized
