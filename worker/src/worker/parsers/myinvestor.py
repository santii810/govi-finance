from __future__ import annotations

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

_MYINVESTOR_HEADERS = {"fecha_operacion", "concepto", "importe"}


def parser_name() -> str:
    return "myinvestor"


def can_parse(path: Path, content: str | None = None) -> bool:
    if is_excel_file(path):
        rows = read_excel_matrix(path)
        if not rows:
            return False
        return _headers_match([normalize_header(cell) for cell in rows[0]])
    text = content if content is not None else path.read_text(encoding="utf-8-sig")
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        return False
    return _headers_match([normalize_header(part) for part in split_csv_line(lines[0])])


def parse_file(path: Path) -> list[RawMovement]:
    if is_excel_file(path):
        matrix = read_excel_matrix(path)
        if not matrix:
            return []
        headers = [normalize_header(cell) for cell in matrix[0]]
        data_rows = matrix[1:]
    else:
        text = path.read_text(encoding="utf-8-sig")
        lines = [line for line in text.splitlines() if line.strip()]
        if not lines:
            return []
        headers = [normalize_header(part) for part in split_csv_line(lines[0])]
        data_rows = [split_csv_line(line) for line in lines[1:]]

    movements: list[RawMovement] = []
    for raw in data_rows:
        if not any(cell.strip() for cell in raw):
            continue
        if len(raw) < len(headers):
            raw = [*raw, *([""] * (len(headers) - len(raw)))]
        row = dict(zip(headers, raw, strict=False))
        movement = _from_row(row)
        if movement is not None:
            movements.append(movement)
    return movements


def _headers_match(headers: list[str]) -> bool:
    return _MYINVESTOR_HEADERS.issubset(set(headers))


def _from_row(row: dict[str, str]) -> RawMovement | None:
    importe = parse_decimal(row.get("importe", "0"))
    if importe == 0:
        return None

    fecha = parse_date_flexible(row.get("fecha_operacion", ""))
    concepto = row.get("concepto", "").strip() or "Movimiento"
    fecha_valor = row.get("fecha_valor", "").strip()
    metadata = {
        key: row[key].strip()
        for key in ("fecha_valor", "divisa")
        if row.get(key, "").strip()
    }
    referencia = "|".join(
        part for part in (row.get("fecha_operacion", "").strip(), fecha_valor, concepto, row.get("importe", "").strip()) if part
    )

    return RawMovement(
        fecha=fecha,
        importe=importe,
        concepto=concepto,
        referencia=referencia or hash_fallback(concepto, fecha, importe),
        metadata=metadata,
    )
