from __future__ import annotations

import hashlib
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from worker.models import RawMovement

_TR_FORMAT_ID = {"id", "timestamp", "type", "debit", "credit"}
_TR_FORMAT_OFFICIAL = {"transaction_id", "date", "amount", "type", "category"}
_TR_FORMAT_SIMPLE = {"date", "description", "amount"}

_TYPE_LABELS = {
    "BUY": "Compra",
    "SELL": "Venta",
    "CARD_TRANSACTION": "Tarjeta",
    "CUSTOMER_INPAYMENT": "Ingreso",
    "CUSTOMER_OUTBOUND_REQUEST": "Retirada",
    "TRANSFER_INSTANT_INBOUND": "Transferencia recibida",
    "TRANSFER_INSTANT_OUTBOUND": "Transferencia enviada",
    "INTEREST_PAYMENT": "Interés",
    "DIVIDEND": "Dividendo",
    "STOCKPERK": "Stock perk",
    "SAVINGS_PLAN": "Plan de ahorro",
    "MIGRATION": "Migración",
}


def can_parse(path: Path, content: str | None = None) -> bool:
    text = content if content is not None else path.read_text(encoding="utf-8-sig")
    headers = _read_headers(text)
    if _TR_FORMAT_ID.issubset(headers):
        return True
    if _TR_FORMAT_OFFICIAL.issubset(headers):
        return True
    if _TR_FORMAT_SIMPLE.issubset(headers):
        return True
    return _looks_like_spanish_export(headers)


def parse_file(path: Path) -> list[RawMovement]:
    text = path.read_text(encoding="utf-8-sig")
    headers = _read_headers(text)
    rows = _read_rows(text)

    if _TR_FORMAT_OFFICIAL.issubset(headers):
        return [_from_official_export(row) for row in rows]
    if _TR_FORMAT_ID.issubset(headers):
        return [_from_id_format(row) for row in rows]
    if _TR_FORMAT_SIMPLE.issubset(headers):
        return [_from_simple_format(row) for row in rows]
    if _looks_like_spanish_export(headers):
        return [_from_spanish_export(row, headers) for row in rows]

    raise ValueError(f"Formato Trade Republic no reconocido. Cabeceras: {sorted(headers)}")


def parser_name() -> str:
    return "trade_republic"


def _read_headers(text: str) -> set[str]:
    first = text.splitlines()[0] if text.splitlines() else ""
    return {_normalize_header(part) for part in _split_csv_line(first)}


def _read_rows(text: str) -> list[dict[str, str]]:
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        return []
    headers = [_normalize_header(part) for part in _split_csv_line(lines[0])]
    rows: list[dict[str, str]] = []
    for line in lines[1:]:
        values = _split_csv_line(line)
        if len(values) < len(headers):
            values.extend([""] * (len(headers) - len(values)))
        rows.append(dict(zip(headers, values, strict=False)))
    return rows


def _split_csv_line(line: str) -> list[str]:
    parts: list[str] = []
    current: list[str] = []
    in_quotes = False
    for char in line:
        if char == '"':
            in_quotes = not in_quotes
            continue
        if char == "," and not in_quotes:
            parts.append("".join(current).strip())
            current = []
            continue
        current.append(char)
    parts.append("".join(current).strip())
    return parts


def _normalize_header(value: str) -> str:
    normalized = value.strip().lower()
    replacements = {
        "fecha": "date",
        "descripción": "description",
        "descripcion": "description",
        "importe": "amount",
        "tipo": "type",
        "estado": "status",
        "nombre": "name",
        "id": "id",
    }
    return replacements.get(normalized, normalized)


def _looks_like_spanish_export(headers: set[str]) -> bool:
    raw = headers | {_reverse_header(h) for h in headers}
    return bool({"fecha", "importe"} & raw or {"date", "amount"} & headers)


def _reverse_header(normalized: str) -> str:
    mapping = {
        "date": "fecha",
        "description": "descripcion",
        "amount": "importe",
        "type": "tipo",
        "status": "estado",
        "name": "nombre",
    }
    return mapping.get(normalized, normalized)


def _from_official_export(row: dict[str, str]) -> RawMovement:
    tx_type = row.get("type", "").strip()
    category = row.get("category", "").strip()
    name = row.get("name", "").strip()
    description = row.get("description", "").strip()
    amount = _parse_decimal(row.get("amount", "0"))
    fecha = _parse_date_flexible(row.get("date", ""))
    tx_id = row.get("transaction_id", "").strip() or None

    metadata = _official_metadata(row)
    concepto = _build_concepto_official(tx_type, category, name, description)

    return RawMovement(
        fecha=fecha,
        importe=amount,
        concepto=concepto,
        referencia=tx_id,
        metadata=metadata,
    )


def _official_metadata(row: dict[str, str]) -> dict[str, str]:
    fields = (
        "datetime",
        "account_type",
        "category",
        "type",
        "asset_class",
        "name",
        "symbol",
        "shares",
        "price",
        "fee",
        "tax",
        "currency",
        "original_amount",
        "original_currency",
        "fx_rate",
        "description",
        "counterparty_name",
        "counterparty_iban",
        "payment_reference",
        "mcc_code",
    )
    return {key: row.get(key, "").strip() for key in fields if row.get(key, "").strip()}


def _build_concepto_official(
    tx_type: str,
    category: str,
    name: str,
    description: str,
) -> str:
    if tx_type == "CARD_TRANSACTION" and name:
        return name

    if description and not description.startswith("Customer "):
        if name and name not in description:
            label = _TYPE_LABELS.get(tx_type, tx_type)
            if label and category == "TRADING":
                return f"{label} — {name}"
        return description

    label = _TYPE_LABELS.get(tx_type, tx_type)
    if name:
        return f"{label} — {name}" if label else name
    if label:
        return label
    return "Movimiento"


def _from_id_format(row: dict[str, str]) -> RawMovement:
    tx_id = row.get("id", "").strip()
    tx_type = row.get("type", "").strip()
    name = row.get("name", "").strip()
    debit = _parse_decimal(row.get("debit", "0"))
    credit = _parse_decimal(row.get("credit", "0"))
    importe = credit - debit
    concepto = " — ".join(part for part in [tx_type, name] if part)
    fecha = _parse_timestamp(row.get("timestamp", ""))
    return RawMovement(
        fecha=fecha,
        importe=importe,
        concepto=concepto or tx_type or "Movimiento",
        referencia=tx_id or None,
        metadata={"type": tx_type, "name": name} if tx_type or name else {},
    )


def _from_simple_format(row: dict[str, str]) -> RawMovement:
    amount = _parse_decimal(row.get("amount", "0"))
    description = row.get("description", "").strip() or "Movimiento"
    status = row.get("status", "").strip().lower()
    if status in {"cancelled", "canceled", "cancelado"}:
        amount = Decimal("0")
    fecha = _parse_date_flexible(row.get("date", ""))
    return RawMovement(
        fecha=fecha,
        importe=amount,
        concepto=description,
        referencia=_hash_fallback(description, row.get("date", ""), amount),
        metadata={"status": status} if status else {},
    )


def _from_spanish_export(row: dict[str, str], headers: set[str]) -> RawMovement:
    date_key = "date" if "date" in row else "fecha"
    amount_key = "amount" if "amount" in row else "importe"
    desc_key = next(
        (k for k in ("description", "descripcion", "descripción", "name", "nombre", "type", "tipo") if k in row),
        None,
    )
    amount = _parse_decimal(row.get(amount_key, "0"))
    concepto = row.get(desc_key, "").strip() if desc_key else "Movimiento"
    tx_id = row.get("id", "").strip() or None
    fecha = _parse_date_flexible(row.get(date_key, ""))
    tx_type = row.get("type") or row.get("tipo", "")
    return RawMovement(
        fecha=fecha,
        importe=amount,
        concepto=concepto or "Movimiento",
        referencia=tx_id,
        metadata={"type": tx_type.strip()} if tx_type else {},
    )


def _parse_timestamp(value: str) -> datetime.date:
    value = value.strip()
    for fmt in (
        "%d %b %y %H:%M %z",
        "%d %b %y %H:%M %Z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            parsed = datetime.strptime(value, fmt)
            return parsed.date()
        except ValueError:
            continue
    return _parse_date_flexible(value)


def _parse_date_flexible(value: str) -> datetime.date:
    value = value.strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Fecha no reconocida: {value!r}")


def _parse_decimal(value: str) -> Decimal:
    cleaned = value.strip().replace("€", "").replace("EUR", "").strip()
    cleaned = cleaned.replace("\u00a0", "").replace(" ", "")
    if cleaned.count(",") == 1 and cleaned.count(".") == 0:
        cleaned = cleaned.replace(",", ".")
    elif cleaned.count(".") > 1 and cleaned.count(",") == 1:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    try:
        return Decimal(cleaned or "0")
    except InvalidOperation as exc:
        raise ValueError(f"Importe no reconocido: {value!r}") from exc


def _hash_fallback(concepto: str, fecha: str, importe: Decimal) -> str:
    payload = f"{fecha}|{importe}|{concepto}"
    return hashlib.sha256(payload.encode()).hexdigest()[:32]
