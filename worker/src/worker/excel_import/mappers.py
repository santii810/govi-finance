from __future__ import annotations

from typing import Any

from worker.excel_import.config import INVERSION_TIPO_MAP, PATRIMONIO_TIPO_MAP
from worker.excel_import.dates import excel_serial_to_date


def _as_float(value: object) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def map_inversion_tipo(value: str | None) -> str | None:
    if not value:
        return None
    mapped = INVERSION_TIPO_MAP.get(value.strip().lower())
    return mapped or value.strip()


def map_patrimonio_tipo(value: str | None) -> str | None:
    if not value:
        return None
    mapped = PATRIMONIO_TIPO_MAP.get(value.strip().lower())
    return mapped or value.strip().title()


def map_gastos_personales_row(row: dict[str, Any], default_persona: str) -> dict[str, Any] | None:
    from worker.gastos_comun_import.mappers import build_categoria

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
        "Persona": default_persona,
    }

    if categoria == "Viaxes" or categoria.startswith("Viaxes_"):
        ubicacion = _as_text(row.get("UbicaciónViaxe"))
        if ubicacion:
            record["Ubicación"] = ubicacion

    return record


def map_gastos_row(row: dict[str, Any], default_persona: str) -> dict[str, Any] | None:
    cantidad = _as_float(row.get("Cantidad"))
    fecha = excel_serial_to_date(row.get("Día"))
    if cantidad is None or fecha is None:
        return None
    return {
        "Date": fecha,
        "Fuente": _as_text(row.get("Fuente")),
        "Destino": _as_text(row.get("Destino")),
        "Cantidad": cantidad,
        "Categoría": _as_text(row.get("Categoría")),
        "Persona": default_persona,
    }


def map_ingresos_row(row: dict[str, Any], default_persona: str) -> dict[str, Any] | None:
    ingreso = _as_float(row.get("Ingreso"))
    fecha = excel_serial_to_date(row.get("Fecha"))
    if ingreso is None or fecha is None:
        return None
    return {
        "Fecha": fecha,
        "Origen": _as_text(row.get("Origen")),
        "Ingreso": ingreso,
        "Categoría": _as_text(row.get("Categoría")),
        "Notas": _as_text(row.get("Notas")),
        "Persona": default_persona,
    }


def map_inversion_row(row: dict[str, Any], default_persona: str) -> dict[str, Any] | None:
    importe = _as_float(row.get("Aportado"))
    fecha = excel_serial_to_date(row.get("Fecha"))
    if importe is None or fecha is None:
        return None
    return {
        "Entidad": _as_text(row.get("Entidad")),
        "Fecha": fecha,
        "Nombre": _as_text(row.get("Elemento")),
        "Importe": importe,
        "Tipo": map_inversion_tipo(_as_text(row.get("Tipo"))),
        "Persona": default_persona,
    }


def map_patrimonio_row(row: dict[str, Any], default_persona: str) -> dict[str, Any] | None:
    valor = _as_float(row.get("cantidad"))
    fecha = excel_serial_to_date(row.get("fecha"))
    if valor is None or fecha is None:
        return None
    return {
        "Entidad": _as_text(row.get("entidad")),
        "Fecha": fecha,
        "Nombre": _as_text(row.get("Nota")),
        "Valor": valor,
        "Tipo": map_patrimonio_tipo(_as_text(row.get("tipo"))),
        "Persona": default_persona,
    }


MAPPERS = {
    "gastos": map_gastos_row,
    "gastos_personales": map_gastos_personales_row,
    "ingresos": map_ingresos_row,
    "inversiones": map_inversion_row,
    "patrimonio": map_patrimonio_row,
}

SELECT_FIELDS = {
    "gastos": ("Fuente", "Categoría", "Persona"),
    "gastos_personales": ("Fuente", "Categoría", "Persona"),
    "ingresos": ("Origen", "Categoría", "Persona"),
    "inversiones": ("Tipo", "Persona"),
    "patrimonio": ("Tipo", "Persona"),
}
