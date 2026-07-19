from __future__ import annotations

from decimal import Decimal

from worker.myinvestor_migration import (
    MyInvestorActionRow,
    canonical_key_for_row,
    plan_myinvestor_idempotency_migration,
)


def test_plan_keeps_accepted_deletes_pending_duplicate():
    rows = [
        MyInvestorActionRow(
            id=1,
            idempotency_key="2026-06-12 00:00:00|2026-06-15 00:00:00|VANGUARD|-24.54",
            estado="accepted",
            fecha="2026-06-12",
            importe=Decimal("-24.54"),
            concepto="VANGUARD",
        ),
        MyInvestorActionRow(
            id=2,
            idempotency_key="12/06/2026|15/06/2026|VANGUARD|-24,54",
            estado="pending",
            fecha="2026-06-12",
            importe=Decimal("-24.54"),
            concepto="VANGUARD",
        ),
    ]
    plan = plan_myinvestor_idempotency_migration(rows)
    assert plan.delete_ids == [2]
    assert plan.updates == [(1, "2026-06-12|2026-06-15|VANGUARD|-24.54")]


def test_plan_keeps_one_pending_when_only_pendings():
    rows = [
        MyInvestorActionRow(
            id=10,
            idempotency_key="12/06/2026|15/06/2026|VANGUARD|-24,54",
            estado="pending",
            fecha="2026-06-12",
            importe=-24.54,
            concepto="VANGUARD",
        ),
        MyInvestorActionRow(
            id=11,
            idempotency_key="2026-06-12 00:00:00|2026-06-15 00:00:00|VANGUARD|-24.54",
            estado="pending",
            fecha="2026-06-12",
            importe=-24.54,
            concepto="VANGUARD",
        ),
    ]
    plan = plan_myinvestor_idempotency_migration(rows)
    assert plan.delete_ids == [11]
    assert plan.updates == [(10, "2026-06-12|2026-06-15|VANGUARD|-24.54")]


def test_canonical_from_csv_legacy_key():
    row = MyInvestorActionRow(
        id=1,
        idempotency_key="28/04/2026|29/04/2026|VANGUARD|-24,8",
        estado="pending",
        fecha="2026-04-28",
        importe=-24.8,
        concepto="VANGUARD",
    )
    assert canonical_key_for_row(row) == "2026-04-28|2026-04-29|VANGUARD|-24.8"
