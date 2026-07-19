from __future__ import annotations

import os
from dataclasses import dataclass
from decimal import Decimal

from worker.models import ClassifiedMovement, Persona


@dataclass(frozen=True)
class BotConfig:
    telegram_token: str
    nocodb_url: str
    nocodb_token: str
    automatic_actions_table_id: str
    accounts_table_id: str
    account_dumps_table_id: str
    allowed_user_ids: frozenset[int]
    owner_user_id: int | None
    sandra_user_id: int | None
    user_personas: dict[int, Persona]
    backup_manager_url: str
    backup_trigger_secret: str

    def persona_for_user(self, user_id: int) -> Persona | None:
        if user_id in self.user_personas:
            return self.user_personas[user_id]
        if self.owner_user_id is not None and user_id == self.owner_user_id:
            return "Santi"
        if self.sandra_user_id is not None and user_id == self.sandra_user_id:
            return "Sandra"
        return None

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

        owner_raw = os.environ.get("TELEGRAM_OWNER_USER_ID", "").strip()
        owner_user_id = int(owner_raw) if owner_raw else None

        sandra_raw = os.environ.get("TELEGRAM_SANDRA_USER_ID", "").strip()
        sandra_user_id = int(sandra_raw) if sandra_raw else None

        user_personas: dict[int, Persona] = {}
        personas_raw = os.environ.get("TELEGRAM_USER_PERSONAS", "").strip()
        if personas_raw:
            for part in personas_raw.split(","):
                chunk = part.strip()
                if not chunk or ":" not in chunk:
                    continue
                user_raw, persona_raw = chunk.split(":", 1)
                persona = persona_raw.strip()
                if persona not in {"Santi", "Sandra"}:
                    raise RuntimeError(
                        f"Persona inválida en TELEGRAM_USER_PERSONAS: {persona!r}"
                    )
                user_personas[int(user_raw.strip())] = persona  # type: ignore[assignment]

        return cls(
            telegram_token=token,
            nocodb_url=os.environ.get("NOCODB_URL", "http://nocodb:8080").rstrip("/"),
            nocodb_token=nocodb_token,
            automatic_actions_table_id=os.environ.get(
                "AUTOMATIC_ACTIONS_TABLE_ID", "mugm6tw1ail68rq"
            ),
            accounts_table_id=os.environ.get("ACCOUNTS_TABLE_ID", "mr0ouismkezq5un"),
            account_dumps_table_id=os.environ.get("ACCOUNT_DUMPS_TABLE_ID", "mcnkpvmpdvo6h9w"),
            allowed_user_ids=allowed,
            owner_user_id=owner_user_id,
            sandra_user_id=sandra_user_id,
            user_personas=user_personas,
            backup_manager_url=os.environ.get(
                "BACKUP_MANAGER_URL", "http://backup-manager:8090"
            ).rstrip("/"),
            backup_trigger_secret=os.environ.get("BACKUP_TRIGGER_SECRET", "").strip(),
        )


def movement_to_record(movement: ClassifiedMovement, *, account_dump_id: int) -> dict:
    record = {
        "IdempotencyKey": movement.idempotency_key,
        "Estado": "pending",
        "Fecha": movement.fecha.isoformat(),
        "Importe": float(movement.importe),
        "Concepto": movement.concepto[:255] if movement.concepto else "",
        "Banco": movement.banco,
        "Persona": movement.persona,
        "Metadatos": dict(movement.metadata),
        "AccountDumps": {"Id": account_dump_id},
    }
    return record


@dataclass(frozen=True)
class ImportResult:
    inserted: int
    skipped: int
    total: int
