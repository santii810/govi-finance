from __future__ import annotations

import hashlib

from worker.models import Persona, RawMovement, TablaDestino


def build_idempotency_key(banco: str, movement: RawMovement) -> str:
    if movement.referencia:
        return movement.referencia
    payload = f"{banco}|{movement.fecha.isoformat()}|{movement.importe}|{movement.concepto}"
    return hashlib.sha256(payload.encode()).hexdigest()
