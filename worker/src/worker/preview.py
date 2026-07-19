from __future__ import annotations

from pathlib import Path

from worker.accounts import load_accounts, resolve_account
from worker.idempotency import build_idempotency_key
from worker.models import ClassifiedMovement, ImportPreview, Persona
from worker.parsers.registry import detect_parser, parse


def analyze_file(
    path: Path,
    *,
    account_id: str | None = None,
    accounts: list | None = None,
    sender_persona: Persona | None = None,
) -> tuple[ImportPreview, list[ClassifiedMovement]]:
    """Parsea y detecta cuenta. No aplica ImportRules (las aplica la web)."""
    parser_name = detect_parser(path)
    if parser_name is None:
        raise ValueError("No se reconoce el formato del export")

    catalog = accounts if accounts is not None else load_accounts()
    if account_id:
        account = next((a for a in catalog if a.id == account_id), None)
        ambiguities: list[str] = []
        if account is None:
            raise ValueError(f"Cuenta desconocida: {account_id}")
    else:
        account, ambiguities = resolve_account(
            catalog, parser_name, sender_persona=sender_persona
        )
        if account is None:
            matches = [a for a in catalog if a.parser == parser_name]
            if not matches:
                preview = ImportPreview(
                    account_id="",
                    account_label="",
                    banco="",
                    tipo_cuenta="personal",
                    persona="Santi",
                    fecha_desde=None,
                    fecha_hasta=None,
                    total_movimientos=0,
                    gastos_count=0,
                    ingresos_count=0,
                    ejemplos=[],
                    ambiguedades=ambiguities,
                )
                return preview, []
            account = matches[0]

    raw_movements = parse(path, parser_name)
    raw_movements = [m for m in raw_movements if m.importe != 0]

    parsed: list[ClassifiedMovement] = []
    for movement in raw_movements:
        key = build_idempotency_key(account.banco, movement)
        metadata = dict(movement.metadata)
        metadata["account_id"] = account.id
        parsed.append(
            ClassifiedMovement(
                fecha=movement.fecha,
                importe=movement.importe,
                concepto=movement.concepto,
                banco=account.banco,
                persona=account.persona,
                tabla_destino="Ingresos" if movement.importe > 0 else "Gastos",
                categoria=None,
                idempotency_key=key,
                referencia=movement.referencia,
                metadata=metadata,
            )
        )

    fechas = [m.fecha for m in parsed]
    gastos = sum(1 for m in parsed if m.importe < 0)
    ingresos = sum(1 for m in parsed if m.importe > 0)

    preview = ImportPreview(
        account_id=account.id,
        account_label=account.label,
        banco=account.banco,
        tipo_cuenta=account.tipo,
        persona=account.persona,
        fecha_desde=min(fechas) if fechas else None,
        fecha_hasta=max(fechas) if fechas else None,
        total_movimientos=len(parsed),
        gastos_count=gastos,
        ingresos_count=ingresos,
        ejemplos=(
            list(parsed)
            if len(parsed) <= 4
            else parsed[:2] + parsed[-2:]
        ),
        ambiguedades=ambiguities,
    )
    return preview, parsed
