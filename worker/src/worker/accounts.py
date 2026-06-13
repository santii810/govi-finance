from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import yaml

from worker.models import AccountTipo, Persona

AccountParser = Literal["trade_republic"]


@dataclass(frozen=True)
class Account:
    id: str
    label: str
    banco: str
    tipo: AccountTipo
    persona: Persona
    parser: AccountParser
    detection: dict[str, str]


def default_accounts_path() -> Path:
    if env_path := os.environ.get("WORKER_ACCOUNTS_CONFIG", "").strip():
        return Path(env_path)

    docker_path = Path("/app/config/accounts.yaml")
    if docker_path.is_file():
        return docker_path

    dev_path = Path(__file__).resolve().parents[2] / "config" / "accounts.yaml"
    if dev_path.is_file():
        return dev_path

    raise FileNotFoundError(
        "No se encuentra config/accounts.yaml. "
        "Define WORKER_ACCOUNTS_CONFIG o monta /app/config/accounts.yaml."
    )


def load_accounts(config_path: Path | None = None) -> list[Account]:
    path = config_path or default_accounts_path()
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    accounts: list[Account] = []
    for row in data.get("accounts", []):
        accounts.append(
            Account(
                id=row["id"],
                label=row["label"],
                banco=row["banco"],
                tipo=row["tipo"],
                persona=row["persona"],
                parser=row["parser"],
                detection=row.get("detection", {}),
            )
        )
    return accounts


def resolve_account(accounts: list[Account], parser_name: str) -> tuple[Account | None, list[str]]:
    matches = [a for a in accounts if a.parser == parser_name]
    if len(matches) == 1:
        return matches[0], []
    if not matches:
        return None, [f"No hay cuenta configurada para el parser «{parser_name}»"]
    ids = ", ".join(a.id for a in matches)
    return None, [
        f"Varias cuentas posibles para «{parser_name}»: {ids}. El bot debe pedir confirmación/corrección."
    ]
