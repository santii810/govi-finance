from datetime import date

from worker.excel_import.dates import excel_serial_to_date
from worker.excel_import.mappers import (
    map_gastos_persona,
    map_gastos_row,
    map_inversion_row,
    map_patrimonio_row,
)


def test_excel_serial_to_date():
    assert excel_serial_to_date(44807) == "2022-09-01"
    assert excel_serial_to_date(date(2025, 1, 15)) == "2025-01-15"


def test_map_gastos_persona():
    assert map_gastos_persona("Común", "Abanca", "Santi") == "Común"
    assert map_gastos_persona("Personal", "Abanca Sandra", "Santi") == "Sandra"
    assert map_gastos_persona("Personal", "Revolut", "Santi") == "Santi"


def test_map_gastos_row():
    record = map_gastos_row(
        {
            "Fuente": "Revolut",
            "Día": 44807,
            "Destino": "Cascos",
            "Cantidad": 15.07,
            "Categoría": "Regalos",
            "Origen": "Personal",
        },
        "Santi",
    )
    assert record == {
        "Date": "2022-09-01",
        "Fuente": "Revolut",
        "Destino": "Cascos",
        "Cantidad": 15.07,
        "Categoría": "Regalos",
        "Persona": "Santi",
    }


def test_map_inversion_row_normalizes_tipo():
    record = map_inversion_row(
        {
            "Entidad": "Mediolanum",
            "Fecha": 43848,
            "Elemento": "PIAS",
            "Aportado": 1200,
            "Tipo": "Fondo Indexado",
        },
        "Santi",
    )
    assert record is not None
    assert record["Tipo"] == "Fondo indexado"
    assert record["Importe"] == 1200


def test_map_patrimonio_row():
    record = map_patrimonio_row(
        {
            "fecha": 45741,
            "entidad": "myinvestor",
            "tipo": "bolsa",
            "Nota": "Fondos indexados",
            "cantidad": 15088,
        },
        "Santi",
    )
    assert record is not None
    assert record["Tipo"] == "Renta variable"
    assert record["Valor"] == 15088
