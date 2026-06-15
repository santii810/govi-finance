from __future__ import annotations

import argparse
import logging
import sys

from backup_manager.config import BackupConfig
from backup_manager.runner import run_backup_sync
from backup_manager.scheduler import scheduler_loop


def _configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Backup de NocoDB → CSV + ZIP + nube")
    parser.add_argument(
        "command",
        nargs="?",
        choices=("run", "scheduler"),
        default="scheduler",
        help="run = una vez; scheduler = bucle según BACKUP_SCHEDULE",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)
    _configure_logging(args.verbose)

    try:
        config = BackupConfig.from_env()
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 1

    if args.command == "run":
        try:
            archive = run_backup_sync(config)
        except Exception as exc:
            print(f"Backup fallido: {exc}", file=sys.stderr)
            return 1
        print(archive)
        return 0

    scheduler_loop(config)
    return 0
