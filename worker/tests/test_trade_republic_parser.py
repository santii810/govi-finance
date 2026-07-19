from pathlib import Path

from worker.preview import analyze_file


FIXTURE = Path(__file__).parent / "fixtures" / "trade-republic-minimal.csv"
OFFICIAL = Path(__file__).parent / "fixtures" / "trade-republic-official.csv"


def test_analyze_trade_republic_santi():
    preview, movements = analyze_file(FIXTURE, sender_persona="Santi")

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


def test_analyze_trade_republic_sandra():
    preview, movements = analyze_file(FIXTURE, sender_persona="Sandra")

    assert preview.account_id == "trade-republic-sandra"
    assert preview.persona == "Sandra"
    assert len(movements) == 3
    assert movements[0].persona == "Sandra"


def test_official_export_rich_metadata():
    _, movements = analyze_file(OFFICIAL, sender_persona="Santi")
    card = next(m for m in movements if m.metadata.get("type") == "CARD_TRANSACTION")

    assert card.concepto == "WWW.AMAZON*"
    assert card.idempotency_key == "amazon-tx-001"
    assert card.metadata["category"] == "CASH"
    assert card.metadata["mcc_code"] == "5942"

    buy = next(m for m in movements if m.metadata.get("type") == "BUY")
    assert "Taiwan Semi" in buy.concepto
    assert buy.metadata["asset_class"] == "STOCK"
    assert buy.metadata["symbol"] == "US8740391003"


def test_official_interest_payout_uses_net_of_tax():
    from decimal import Decimal

    _, movements = analyze_file(OFFICIAL, sender_persona="Santi")
    payout = next(
        m
        for m in movements
        if "payout collection" in m.concepto and m.metadata.get("type") == "INTEREST_PAYMENT"
    )

    assert payout.importe == Decimal("11.32")
    assert payout.metadata["tax"] == "-2.66"
    assert payout.metadata["amount_gross"] == "13.98"

    booking = next(m for m in movements if m.concepto == "Interest payment Booking")
    assert booking.importe == Decimal("0.09")
    assert "amount_gross" not in booking.metadata
