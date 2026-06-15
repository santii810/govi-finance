from __future__ import annotations

import os
from dataclasses import dataclass
from decimal import Decimal

from worker.models import ClassifiedMovement


@dataclass(frozen=True)
class BotConfig:
    telegram_token: str
    nocodb_url: str
    nocodb_token: str
    automatic_actions_table_id: str
    allowed_user_ids: frozenset[int]
    backup_manager_url: str
    backup_trigger_secret: str

    @classmethod
    def from_env(cls) -> BotConfig:
        token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
        if not token:
            raise RuntimeError("TELEGRAM_BOT_TOKEN es obligatorio")

        nocodb_token = os.environ.get("NOCODB_API_TOKEN", "").strip()
        if not nocodb_token:
            raise RuntimeError("NOCODB_API_TOKEN es obligatorio")

        allowed_raw = os.environ.get("TELEGRAM_ALLOWED_USER_IDS", "").strip()
        allowed: frozenset[int] = frozenset()
        if allowed_raw:
            allowed = frozenset(int(part.strip()) for part in allowed_raw.split(",") if part.strip())

        return cls(
            telegram_token=token,
            nocodb_url=os.environ.get("NOCODB_URL", "http://nocodb:8080").rstrip("/"),
            nocodb_token=nocodb_token,
            automatic_actions_table_id=os.environ.get(
                "AUTOMATIC_ACTIONS_TABLE_ID", "mugm6tw1ail68rq"
            ),
            allowed_user_ids=allowed,
            backup_manager_url=os.environ.get(
                "BACKUP_MANAGER_URL", "http://backup-manager:8090"
            ).rstrip("/"),
            backup_trigger_secret=os.environ.get("BACKUP_TRIGGER_SECRET", "").strip(),
        )


def movement_to_record(movement: ClassifiedMovement) -> dict:
    return {
        "IdempotencyKey": movement.idempotency_key,
        "Estado": "pending",
        "Fecha": movement.fecha.isoformat(),
        "Importe": float(movement.importe),
        "Concepto": movement.concepto[:255] if movement.concepto else "",
        "Banco": movement.banco,
        "Persona": movement.persona,
        "Metadatos": dict(movement.metadata),
    }


@dataclass(frozen=True)
class ImportResult:
    inserted: int
    skipped: int
    total: int
