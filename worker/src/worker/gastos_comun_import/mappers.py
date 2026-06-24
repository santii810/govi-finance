from __future__ import annotations

from typing import Any

from worker.excel_import.dates import excel_serial_to_date
from worker.excel_import.mappers import _as_float, _as_text

GASTOS_COMUN_SHEET = "Gastos Común"


def _same_label(left: str | None, right: str | None) -> bool:
    if not left or not right:
        return False
    return left.strip().casefold() == right.strip().casefold()


def build_categoria(row: dict[str, Any]) -> str | None:
    base = _as_text(row.get("Categoría"))
    if not base:
        return None

    if base == "ReformaPiso":
        sub = _as_text(row.get("CategoríaReforma"))
        return f"ReformaPiso_{sub}" if sub else "ReformaPiso"

    if base == "Viaxes":
        cat2 = _as_text(row.get("Categoría2Viaxe"))
        cat1 = _as_text(row.get("CategoríaViaxe"))
        ubicacion = _as_text(row.get("UbicaciónViaxe"))

        if _same_label(cat1, ubicacion) or _same_label(cat1, cat2):
            cat1 = None

        if cat2 and cat1:
            return f"Viaxes_{cat2}_{cat1}"
        if cat2:
            return f"Viaxes_{cat2}"
        if cat1:
            return f"Viaxes_{cat1}"
        return "Viaxes"

    return base


def map_gastos_comun_row(row: dict[str, Any]) -> dict[str, Any] | None:
    cantidad = _as_float(row.get("Cantidad"))
    fecha = excel_serial_to_date(row.get("Día"))
    categoria = build_categoria(row)
    if cantidad is None or fecha is None or categoria is None:
        return None

    record: dict[str, Any] = {
        "Date": fecha,
        "Fuente": _as_text(row.get("Fuente")),
        "Destino": _as_text(row.get("Destino")),
        "Cantidad": cantidad,
        "Categoría": categoria,
        "Persona": "Común",
    }

    if categoria == "Viaxes" or categoria.startswith("Viaxes_"):
        ubicacion = _as_text(row.get("UbicaciónViaxe"))
        if ubicacion:
            record["Ubicación"] = ubicacion

    return record
