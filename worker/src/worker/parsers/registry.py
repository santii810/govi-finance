from __future__ import annotations

from pathlib import Path

from worker.parsers import trade_republic

PARSERS = {
    trade_republic.parser_name(): trade_republic,
}


def detect_parser(path: Path) -> str | None:
    for name, module in PARSERS.items():
        if module.can_parse(path):
            return name
    return None


def parse(path: Path, parser_name: str) -> list:
    module = PARSERS.get(parser_name)
    if module is None:
        raise ValueError(f"Parser desconocido: {parser_name}")
    return module.parse_file(path)
