"""
Motor de ImportRules — ejecutado por la web (wizard), no por el worker/bot.

El worker solo parsea e inserta pending con Metadatos.
La web carga reglas desde NocoDB y aplica al mostrar/revisar pending.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal

from worker.models import ClassifiedMovement, Persona, RawMovement, TablaDestino


@dataclass(frozen=True)
class NocoDbRule:
    """Regla cargada desde NocoDB (estructura provisional)."""

    id: str
    scope: str
    account_id: str | None
    priority: int
    condition: dict
    actions: dict
    active: bool = True


def apply_global_sign_rule(movement: RawMovement, persona: Persona, banco: str, key: str) -> ClassifiedMovement:
    tabla: TablaDestino = "Ingresos" if movement.importe > 0 else "Gastos"
    return ClassifiedMovement(
        fecha=movement.fecha,
        importe=movement.importe,
        concepto=movement.concepto,
        banco=banco,
        persona=persona,
        tabla_destino=tabla,
        categoria=None,
        idempotency_key=key,
        referencia=movement.referencia,
        metadata=dict(movement.metadata),
    )


def apply_rules(
    movement: RawMovement,
    *,
    persona: Persona,
    banco: str,
    account_id: str,
    idempotency_key: str,
    nocodb_rules: list[NocoDbRule] | None = None,
) -> ClassifiedMovement:
    classified = apply_global_sign_rule(movement, persona, banco, idempotency_key)
    if not nocodb_rules:
        return classified

    applicable = [
        rule
        for rule in nocodb_rules
        if rule.active and _rule_matches(rule, movement, account_id)
    ]
    applicable.sort(key=lambda rule: rule.priority)

    for rule in applicable:
        classified = _apply_actions(classified, rule.actions)

    return classified


def apply_rules_to_pending(
    pending: ClassifiedMovement,
    *,
    account_id: str,
    nocodb_rules: list[NocoDbRule],
) -> ClassifiedMovement:
    """Aplica ImportRules a un movimiento ya parseado (desde AutomaticActions + Metadatos)."""
    raw = RawMovement(
        fecha=pending.fecha,
        importe=pending.importe,
        concepto=pending.concepto,
        referencia=pending.referencia,
        metadata=dict(pending.metadata),
    )
    return apply_rules(
        raw,
        persona=pending.persona,
        banco=pending.banco,
        account_id=account_id,
        idempotency_key=pending.idempotency_key,
        nocodb_rules=nocodb_rules,
    )


def _rule_matches(rule: NocoDbRule, movement: RawMovement, account_id: str) -> bool:
    if rule.scope == "account" and rule.account_id not in (None, account_id):
        return False
    condition = rule.condition or {}
    if "importe_positivo" in condition and (movement.importe > 0) != bool(condition["importe_positivo"]):
        return False
    if "importe_negativo" in condition and (movement.importe < 0) != bool(condition["importe_negativo"]):
        return False
    contains = condition.get("concepto_contiene")
    if contains and contains.lower() not in movement.concepto.lower():
        return False
    exact = condition.get("concepto_exacto")
    if exact and movement.concepto.strip().lower() != str(exact).strip().lower():
        return False
    regex = condition.get("concepto_regex")
    if regex and not re.search(str(regex), movement.concepto, re.IGNORECASE):
        return False
    tx_type = condition.get("tipo") or condition.get("type")
    if tx_type and movement.metadata.get("type", "").lower() != str(tx_type).lower():
        return False
    category = condition.get("category")
    if category and movement.metadata.get("category", "").lower() != str(category).lower():
        return False
    asset_class = condition.get("asset_class")
    if asset_class and movement.metadata.get("asset_class", "").lower() != str(asset_class).lower():
        return False
    mcc = condition.get("mcc_code")
    if mcc and movement.metadata.get("mcc_code", "") != str(mcc):
        return False
    symbol = condition.get("symbol")
    if symbol and movement.metadata.get("symbol", "").upper() != str(symbol).upper():
        return False
    return True


def _apply_actions(classified: ClassifiedMovement, actions: dict) -> ClassifiedMovement:
    tabla = actions.get("tabla_destino", classified.tabla_destino)
    persona = actions.get("persona", classified.persona)
    categoria = actions.get("categoria", classified.categoria)
    importe = classified.importe
    if "importe_signo" in actions:
        sign = Decimal("1") if actions["importe_signo"] == "positivo" else Decimal("-1")
        importe = abs(importe) * sign
    if actions.get("invertir_importe"):
        importe = importe * Decimal("-1")
    return ClassifiedMovement(
        fecha=classified.fecha,
        importe=importe,
        concepto=classified.concepto,
        banco=classified.banco,
        persona=persona,
        tabla_destino=tabla,
        categoria=categoria,
        idempotency_key=classified.idempotency_key,
        referencia=classified.referencia,
        metadata=dict(classified.metadata),
    )
