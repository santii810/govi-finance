from __future__ import annotations

from datetime import date
from decimal import Decimal

from worker.parsers.myinvestor import build_canonical_idempotency_key, canonicalize_legacy_key


def test_canonical_key_normalizes_importe_and_dates():
    key = build_canonical_idempotency_key(
        fecha=date(2026, 4, 28),
        fecha_valor=date(2026, 4, 29),
        concepto="VANGUARD US 500",
        importe=Decimal("-24.80"),
    )
    assert key == "2026-04-28|2026-04-29|VANGUARD US 500|-24.8"


def test_canonicalize_legacy_excel_key():
    legacy = "2026-06-12 00:00:00|2026-06-15 00:00:00|VANGUARD US 500 STOCK INDEX EU|-24.54"
    assert (
        canonicalize_legacy_key(legacy)
        == "2026-06-12|2026-06-15|VANGUARD US 500 STOCK INDEX EU|-24.54"
    )


def test_canonicalize_legacy_csv_key():
    legacy = "12/06/2026|15/06/2026|VANGUARD US 500 STOCK INDEX EU|-24,54"
    assert (
        canonicalize_legacy_key(legacy)
        == "2026-06-12|2026-06-15|VANGUARD US 500 STOCK INDEX EU|-24.54"
    )
