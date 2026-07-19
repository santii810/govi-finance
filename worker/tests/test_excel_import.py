from datetime import date

from worker.excel_import.dates import excel_serial_to_date
from worker.excel_import.mappers import (
    map_gastos_row,
    map_inversion_row,
    map_patrimonio_row,
)


def test_excel_serial_to_date():
    assert excel_serial_to_date(44807) == "2022-09-01"
    assert excel_serial_to_date(date(2025, 1, 15)) == "2025-01-15"


def test_map_gastos_row_ignores_origen_and_fuente_for_persona():
    record = map_gastos_row(
        {
            "Fuente": "Abanca Sandra",
            "Día": 44807,
            "Destino": "Mercadona",
            "Cantidad": 40.0,
            "Categoría": "Supermercado",
            "Origen": "Común",
        },
        "Santi",
    )
    assert record is not None
    assert record["Persona"] == "Santi"
    assert record["Fuente"] == "Abanca Sandra"


def test_map_gastos_personales_row_builds_viaxes_categoria():
    from worker.excel_import.mappers import map_gastos_personales_row

    record = map_gastos_personales_row(
        {
            "Fuente": "Revolut Santi",
            "Día": 44807,
            "Destino": "Vuelo",
            "Cantidad": 120.0,
            "Categoría": "Viaxes",
            "Categoría2Viaxe": "Transporte",
            "CategoríaViaxe": "Vuelo",
            "UbicaciónViaxe": "Madeira",
        },
        "Santi",
    )
    assert record is not None
    assert record["Persona"] == "Santi"
    assert record["Categoría"] == "Viaxes_Transporte_Vuelo"
    assert record["Ubicación"] == "Madeira"


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
