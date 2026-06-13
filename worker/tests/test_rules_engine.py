from decimal import Decimal
from datetime import date

from worker.models import ClassifiedMovement
from worker.rules.engine import NocoDbRule, apply_rules_to_pending


def _movement(importe: float, **metadata: str) -> ClassifiedMovement:
    return ClassifiedMovement(
        fecha=date(2025, 6, 1),
        importe=Decimal(str(importe)),
        concepto="Test",
        banco="Trade Republic",
        persona="Santi",
        tabla_destino="Ingresos" if importe > 0 else "Gastos",
        categoria=None,
        idempotency_key="key-1",
        metadata=dict(metadata),
    )


def test_global_positive_to_ingresos():
    rules = [
        NocoDbRule(
            id="1",
            scope="global",
            account_id=None,
            priority=0,
            condition={"importe_positivo": True},
            actions={"tabla_destino": "Ingresos"},
        )
    ]
    result = apply_rules_to_pending(
        _movement(10),
        account_id="trade-republic-santi",
        nocodb_rules=rules,
    )
    assert result.tabla_destino == "Ingresos"


def test_global_negative_to_gastos():
    rules = [
        NocoDbRule(
            id="4",
            scope="global",
            account_id=None,
            priority=0,
            condition={"importe_negativo": True},
            actions={"tabla_destino": "Gastos"},
        )
    ]
    result = apply_rules_to_pending(
        _movement(-45.2),
        account_id="trade-republic-santi",
        nocodb_rules=rules,
    )
    assert result.tabla_destino == "Gastos"


def test_account_rule_mcc_restaurant():
    rules = [
        NocoDbRule(
            id="10",
            scope="account",
            account_id="trade-republic-santi",
            priority=100,
            condition={"type": "CARD_TRANSACTION", "mcc_code": "5813"},
            actions={"tabla_destino": "Gastos", "categoria": "Restaurantes"},
        ),
        NocoDbRule(
            id="4",
            scope="global",
            account_id=None,
            priority=0,
            condition={"importe_negativo": True},
            actions={"tabla_destino": "Gastos"},
        ),
    ]
    result = apply_rules_to_pending(
        _movement(-20, type="CARD_TRANSACTION", mcc_code="5813", account_id="trade-republic-santi"),
        account_id="trade-republic-santi",
        nocodb_rules=rules,
    )
    assert result.tabla_destino == "Gastos"
    assert result.categoria == "Restaurantes"


def test_account_rule_does_not_apply_to_other_account():
    rules = [
        NocoDbRule(
            id="10",
            scope="account",
            account_id="trade-republic-sandra",
            priority=100,
            condition={"mcc_code": "5813"},
            actions={"categoria": "Restaurantes"},
        )
    ]
    result = apply_rules_to_pending(
        _movement(-20, mcc_code="5813", account_id="trade-republic-santi"),
        account_id="trade-republic-santi",
        nocodb_rules=rules,
    )
    assert result.categoria is None
