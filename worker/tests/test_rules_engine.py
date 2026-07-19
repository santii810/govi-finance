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


def test_concepto_exacto_inversiones():
    rules = [
        NocoDbRule(
            id="20",
            scope="global",
            account_id=None,
            priority=500,
            condition={
                "concepto_exacto": [
                    "VANGUARD US 500 STOCK INDEX EU",
                    "VANGUARD US 500 STOCK EUR INV",
                ]
            },
            actions={
                "tabla_destino": "Inversiones",
                "tipo": "Fondo indexado",
                "nombre": "SP500",
            },
        ),
        NocoDbRule(
            id="1",
            scope="global",
            account_id=None,
            priority=0,
            condition={"importe_positivo": True},
            actions={"tabla_destino": "Ingresos"},
        ),
    ]
    pending = _movement(200, type="TRADE")
    pending.concepto = "VANGUARD US 500 STOCK INDEX EU"
    result = apply_rules_to_pending(
        pending,
        account_id="trade-republic-santi",
        nocodb_rules=rules,
    )
    assert result.tabla_destino == "Inversiones"
    assert result.categoria is None

    pending_eur_inv = _movement(200, type="TRADE")
    pending_eur_inv.concepto = "VANGUARD US 500 STOCK EUR INV"
    result_eur_inv = apply_rules_to_pending(
        pending_eur_inv,
        account_id="trade-republic-santi",
        nocodb_rules=rules,
    )
    assert result_eur_inv.tabla_destino == "Inversiones"


def test_exact_rule_overrides_sign_rule_on_negative_importe():
    """Prioridad 500 debe ganar a la regla de signo (0) aunque el importe sea negativo."""
    rules = [
        NocoDbRule(
            id="4",
            scope="global",
            account_id=None,
            priority=0,
            condition={"importe_negativo": True},
            actions={"tabla_destino": "Gastos"},
        ),
        NocoDbRule(
            id="20",
            scope="global",
            account_id=None,
            priority=500,
            condition={
                "concepto_exacto": [
                    "VANGUARD US 500 STOCK INDEX EU",
                    "VANGUARD US 500 STOCK EUR INV",
                ]
            },
            actions={
                "tabla_destino": "Inversiones",
                "tipo": "Fondo indexado",
                "nombre": "SP500",
            },
        ),
    ]
    pending = _movement(-24.92)
    pending.concepto = "VANGUARD US 500 STOCK INDEX EU"
    result = apply_rules_to_pending(
        pending,
        account_id="trade-republic-santi",
        nocodb_rules=rules,
    )
    assert result.tabla_destino == "Inversiones"


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


def test_invertir_importe_on_negative_inversion():
    """MyInvestor: aportación negativa → Inversiones con importe positivo."""
    rules = [
        NocoDbRule(
            id="4",
            scope="global",
            account_id=None,
            priority=0,
            condition={"importe_negativo": True},
            actions={"tabla_destino": "Gastos"},
        ),
        NocoDbRule(
            id="30",
            scope="global",
            account_id=None,
            priority=500,
            condition={
                "concepto_regex": (
                    "(AMUNDI INDEX MSCI EMERG MKTS I|INDEX MSCI EM IE AC EUR @ [\\d.,]+)"
                )
            },
            actions={
                "tabla_destino": "Inversiones",
                "tipo": "Fondo indexado",
                "nombre": "MSCI EM",
                "invertir_importe": True,
            },
        ),
    ]
    pending = _movement(-150)
    pending.concepto = "AMUNDI INDEX MSCI EMERG MKTS I"
    result = apply_rules_to_pending(
        pending,
        account_id="myinvestor-santi",
        nocodb_rules=rules,
    )
    assert result.tabla_destino == "Inversiones"
    assert result.importe == Decimal("150")

    pending_ie = _movement(-200)
    pending_ie.concepto = "INDEX MSCI EM IE AC EUR @ 0.13"
    result_ie = apply_rules_to_pending(
        pending_ie,
        account_id="myinvestor-santi",
        nocodb_rules=rules,
    )
    assert result_ie.tabla_destino == "Inversiones"
    assert result_ie.importe == Decimal("200")

    pending_ie_price = _movement(-180)
    pending_ie_price.concepto = "INDEX MSCI EM IE AC EUR @ 1.25"
    result_ie_price = apply_rules_to_pending(
        pending_ie_price,
        account_id="myinvestor-santi",
        nocodb_rules=rules,
    )
    assert result_ie_price.tabla_destino == "Inversiones"
    assert result_ie_price.importe == Decimal("180")
