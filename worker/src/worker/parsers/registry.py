from __future__ import annotations

from pathlib import Path

from openpyxl.utils.exceptions import InvalidFileException

from worker.parsers import myinvestor, revolut, trade_republic

PARSERS = {
    trade_republic.parser_name(): trade_republic,
    revolut.parser_name(): revolut,
    myinvestor.parser_name(): myinvestor,
}


def detect_parser(path: Path) -> str | None:
    for name, module in PARSERS.items():
        try:
            if module.can_parse(path):
                return name
        except (UnicodeDecodeError, OSError, InvalidFileException):
            continue
    return None


def parse(path: Path, parser_name: str) -> list:
    module = PARSERS.get(parser_name)
    if module is None:
        raise ValueError(f"Parser desconocido: {parser_name}")
    return module.parse_file(path)
