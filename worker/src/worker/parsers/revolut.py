from __future__ import annotations

from datetime import date
from decimal import Decimal
from pathlib import Path

from worker.models import RawMovement
from worker.parsers.common import (
    hash_fallback,
    is_excel_file,
    normalize_header,
    parse_date_flexible,
    parse_decimal,
    read_excel_matrix,
    split_csv_line,
)

_REVOLUT_HEADERS = {"tipo", "producto", "importe", "descripcion", "state"}


def parser_name() -> str:
    return "revolut"


def can_parse(path: Path, content: str | None = None) -> bool:
    if is_excel_file(path):
        rows = read_excel_matrix(path)
        if not rows or not rows[0]:
            return False
        return _headers_match(_embedded_header(rows[0]))
    text = content if content is not None else path.read_text(encoding="utf-8-sig")
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        return False
    return _headers_match(split_csv_line(lines[0]))


def parse_file(path: Path) -> list[RawMovement]:
    if is_excel_file(path):
        rows = _embedded_rows(read_excel_matrix(path))
    else:
        text = path.read_text(encoding="utf-8-sig")
        lines = [line for line in text.splitlines() if line.strip()]
        if not lines:
            return []
        headers = [normalize_header(part) for part in split_csv_line(lines[0])]
        rows = []
        for line in lines[1:]:
            values = split_csv_line(line)
            if len(values) < len(headers):
                values.extend([""] * (len(headers) - len(values)))
            rows.append(dict(zip(headers, values, strict=False)))

    movements: list[RawMovement] = []
    for row in rows:
        movement = _from_row(row)
        if movement is not None:
            movements.append(movement)
    return movements


def _embedded_rows(matrix: list[list[str]]) -> list[dict[str, str]]:
    if not matrix:
        return []
    header = _embedded_header(matrix[0])
    rows: list[dict[str, str]] = []
    for raw in matrix[1:]:
        if not raw or not raw[0].strip():
            continue
        values = split_csv_line(raw[0])
        if len(values) < len(header):
            values.extend([""] * (len(header) - len(values)))
        rows.append(dict(zip(header, values, strict=False)))
    return rows


def _embedded_header(first_row: list[str]) -> list[str]:
    if not first_row:
        return []
    return [normalize_header(part) for part in split_csv_line(first_row[0])]


def _headers_match(parts: list[str]) -> bool:
    normalized = {normalize_header(part) for part in parts}
    return _REVOLUT_HEADERS.issubset(normalized)


def _from_row(row: dict[str, str]) -> RawMovement | None:
    state = row.get("state", "").strip().upper()
    if state == "DEVUELTO":
        return None

    importe = parse_decimal(row.get("importe", "0"))
    if importe == 0:
        return None

    fecha = _pick_fecha(row)
    tipo = row.get("tipo", "").strip()
    descripcion = row.get("descripcion", "").strip()
    concepto = descripcion or tipo or "Movimiento"
    if tipo and descripcion and tipo not in descripcion:
        concepto = f"{tipo} — {descripcion}"

    metadata = {
        key: row[key].strip()
        for key in ("tipo", "producto", "state", "divisa", "comision", "saldo")
        if row.get(key, "").strip()
    }
    fecha_inicio = row.get("fecha_inicio", "").strip()
    fecha_fin = row.get("fecha_fin", "").strip()
    if fecha_inicio:
        metadata["fecha_inicio"] = fecha_inicio
    if fecha_fin:
        metadata["fecha_fin"] = fecha_fin

    referencia = hash_fallback(
        "|".join(
            part
            for part in (
                fecha_inicio,
                fecha_fin,
                tipo,
                descripcion,
                row.get("importe", "").strip(),
                row.get("saldo", "").strip(),
            )
            if part
        ),
        fecha,
        importe,
    )

    return RawMovement(
        fecha=fecha,
        importe=importe,
        concepto=concepto,
        referencia=referencia,
        metadata=metadata,
    )


def _pick_fecha(row: dict[str, str]) -> date:
    for key in ("fecha_fin", "fecha_inicio"):
        value = row.get(key, "").strip()
        if value:
            return parse_date_flexible(value)
    raise ValueError("Fila Revolut sin fecha")
