from __future__ import annotations

from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from openpyxl import Workbook

from worker.preview import analyze_file


def _write_revolut_xlsx(path: Path) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(
        [
            "Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo"
        ]
    )
    sheet.append(
        [
            "Pago con tarjeta,Actual,2026-06-01 10:00:00,2026-06-01 12:00:00,Cafetería,-4.50,0.00,EUR,COMPLETADO,100.00"
        ]
    )
    sheet.append(
        [
            "Recargas,Actual,2026-06-02 09:00:00,2026-06-02 09:01:00,Recarga,200.00,0.00,EUR,COMPLETADO,300.00"
        ]
    )
    workbook.save(path)
    workbook.close()


def _write_myinvestor_xlsx(path: Path) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["Fecha de operación", "Fecha de valor", "Concepto", "Importe", "Divisa"])
    sheet.append(["45809", "45809", "RECARGA MI", "200", "EUR"])
    sheet.append(["45810", "45810", "VANGUARD US 500", "-24.54", "EUR"])
    workbook.save(path)
    workbook.close()


def test_analyze_revolut_xlsx(tmp_path: Path):
    sample = tmp_path / "revolut.csv"
    _write_revolut_xlsx(sample)

    preview, movements = analyze_file(sample)

    assert preview.account_id == "revolut-santi"
    assert preview.banco == "Revolut"
    assert preview.total_movimientos == 2
    assert preview.gastos_count == 1
    assert preview.ingresos_count == 1
    assert preview.fecha_desde == date(2026, 6, 1)
    assert preview.fecha_hasta == date(2026, 6, 2)
    assert movements[0].importe == Decimal("-4.50")
    assert "Cafetería" in movements[0].concepto
    assert len(movements[0].idempotency_key) == 32


def test_analyze_myinvestor_xlsx(tmp_path: Path):
    sample = tmp_path / "myinvestor.csv"
    _write_myinvestor_xlsx(sample)

    preview, movements = analyze_file(sample)

    assert preview.account_id == "myinvestor-santi"
    assert preview.banco == "MyInvestor"
    assert preview.total_movimientos == 2
    assert preview.gastos_count == 1
    assert preview.ingresos_count == 1
    assert movements[0].importe == Decimal("200")
    assert movements[1].importe == Decimal("-24.54")


@pytest.mark.parametrize(
    "sample_path,account_id,min_movements",
    [
        (
            Path("samples/revolut-santi/account-statement_2021-12-01_2026-06-13_es-es_29cca1 (2).csv"),
            "revolut-santi",
            450,
        ),
        (
            Path("samples/myinvestor-santi/Movimientos Mi Cuenta MyInvestor.csv"),
            "myinvestor-santi",
            120,
        ),
    ],
)
def test_real_samples_if_present(sample_path: Path, account_id: str, min_movements: int):
    if not sample_path.is_file():
        pytest.skip("muestra local no disponible")

    preview, movements = analyze_file(sample_path)

    assert preview.account_id == account_id
    assert preview.total_movimientos >= min_movements
    assert len(movements) == preview.total_movimientos
