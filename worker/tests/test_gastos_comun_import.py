from worker.gastos_comun_import.mappers import build_categoria, map_gastos_comun_row


def test_build_categoria_reforma():
    assert (
        build_categoria(
            {
                "Categoría": "ReformaPiso",
                "CategoríaReforma": "Electricidad",
            }
        )
        == "ReformaPiso_Electricidad"
    )


def test_build_categoria_viaxes_doble_nivel():
    assert (
        build_categoria(
            {
                "Categoría": "Viaxes",
                "Categoría2Viaxe": "Transporte",
                "CategoríaViaxe": "Vuelo",
                "UbicaciónViaxe": "Madeira",
            }
        )
        == "Viaxes_Transporte_Vuelo"
    )


def test_build_categoria_viaxes_ignora_ubicacion_como_subcategoria():
    assert (
        build_categoria(
            {
                "Categoría": "Viaxes",
                "Categoría2Viaxe": "Hotel",
                "CategoríaViaxe": "Burdeos",
                "UbicaciónViaxe": "Burdeos",
            }
        )
        == "Viaxes_Hotel"
    )


def test_build_categoria_viaxes_misma_subcategoria():
    assert (
        build_categoria(
            {
                "Categoría": "Viaxes",
                "Categoría2Viaxe": "Restauración",
                "CategoríaViaxe": "Restauración",
            }
        )
        == "Viaxes_Restauración"
    )


def test_map_gastos_comun_row():
    record = map_gastos_comun_row(
        {
            "Fuente": "Abanca Santi",
            "Día": "2024-08-24",
            "Destino": "Obramat enchufes trasteiro",
            "Cantidad": 33.22,
            "Categoría": "ReformaPiso",
            "CategoríaReforma": "Electricidad",
        }
    )
    assert record == {
        "Date": "2024-08-24",
        "Fuente": "Abanca Santi",
        "Destino": "Obramat enchufes trasteiro",
        "Cantidad": 33.22,
        "Categoría": "ReformaPiso_Electricidad",
        "Persona": "Común",
    }


def test_map_gastos_comun_row_viaxes_con_ubicacion():
    record = map_gastos_comun_row(
        {
            "Fuente": "Efectivo Santi",
            "Día": "2022-09-20",
            "Destino": "Tren",
            "Cantidad": 15.8,
            "Categoría": "Viaxes",
            "UbicaciónViaxe": "Burdeos",
            "CategoríaViaxe": "Tren",
            "Categoría2Viaxe": "Transporte",
        }
    )
    assert record is not None
    assert record["Categoría"] == "Viaxes_Transporte_Tren"
    assert record["Ubicación"] == "Burdeos"
    assert record["Persona"] == "Común"
