from pathlib import Path

from worker.preview import analyze_file


FIXTURE = Path(__file__).parent / "fixtures" / "trade-republic-minimal.csv"
OFFICIAL = Path(__file__).parent / "fixtures" / "trade-republic-official.csv"


def test_analyze_trade_republic_santi():
    preview, movements = analyze_file(FIXTURE)

    assert preview.account_id == "trade-republic-santi"
    assert preview.banco == "Trade Republic"
    assert preview.persona == "Santi"
    assert preview.total_movimientos == 3
    assert preview.gastos_count == 1
    assert preview.ingresos_count == 2
    assert preview.fecha_desde.isoformat() == "2025-06-01"
    assert preview.fecha_hasta.isoformat() == "2025-06-12"
    assert len(movements) == 3
    assert movements[0].idempotency_key == "test-001"


def test_official_export_rich_metadata():
    _, movements = analyze_file(OFFICIAL)
    card = next(m for m in movements if m.metadata.get("type") == "CARD_TRANSACTION")

    assert card.concepto == "WWW.AMAZON*"
    assert card.idempotency_key == "amazon-tx-001"
    assert card.metadata["category"] == "CASH"
    assert card.metadata["mcc_code"] == "5942"

    buy = next(m for m in movements if m.metadata.get("type") == "BUY")
    assert "Taiwan Semi" in buy.concepto
    assert buy.metadata["asset_class"] == "STOCK"
    assert buy.metadata["symbol"] == "US8740391003"
