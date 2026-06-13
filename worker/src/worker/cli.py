from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from worker.classify_cli import run_classify
from worker.preview import analyze_file


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Worker de importación bancaria")
    sub = parser.add_subparsers(dest="command", required=True)

    analyze = sub.add_parser("analyze", help="Analiza un export sin insertar en NocoDB")
    analyze.add_argument("file", type=Path, help="Ruta al CSV")
    analyze.add_argument("--account", help="Forzar cuenta (id del catálogo YAML)")
    analyze.add_argument("--message", action="store_true", help="Imprime mensaje tipo bot")

    classify = sub.add_parser(
        "classify",
        help="Aplica ImportRules a pending en AutomaticActions (misma lógica que la web)",
    )
    classify.add_argument(
        "--dry-run",
        action="store_true",
        help="Clasifica sin escribir en NocoDB",
    )

    args = parser.parse_args(argv)

    if args.command == "analyze":
        preview, _ = analyze_file(args.file, account_id=args.account)
        if args.message:
            print(preview.to_bot_message())
        else:
            print(json.dumps(preview.to_dict(), ensure_ascii=False, indent=2))
        return 0

    if args.command == "classify":
        try:
            total, updated = asyncio.run(run_classify(dry_run=args.dry_run))
        except Exception as exc:
            print(f"Error: {exc}", file=sys.stderr)
            return 1
        mode = "simulado" if args.dry_run else "actualizado"
        print(f"Pending: {total}  Clasificados ({mode}): {updated}")
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
