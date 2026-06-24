from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

from worker.excel_import.service import import_excel
from worker.gastos_comun_import.service import import_gastos_comun
from worker.nocodb import NocoDbClient
from worker.preview import analyze_file


def _nocodb_client() -> NocoDbClient:
    base_url = os.environ.get("NOCODB_URL", "http://localhost:23456")
    token = os.environ.get("NOCODB_API_TOKEN", "")
    if not token:
        raise SystemExit("NOCODB_API_TOKEN es obligatorio")
    return NocoDbClient(base_url, token)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Worker de importación bancaria")
    sub = parser.add_subparsers(dest="command", required=True)

    analyze = sub.add_parser("analyze", help="Analiza un export sin insertar en NocoDB")
    analyze.add_argument("file", type=Path, help="Ruta al CSV")
    analyze.add_argument("--account", help="Forzar cuenta (id del catálogo YAML)")
    analyze.add_argument("--message", action="store_true", help="Imprime mensaje tipo bot")

    import_excel_cmd = sub.add_parser(
        "import-excel",
        help="Importa Finanzas.xlsx (Gastos, Ingresos, Inversión, Patrimonio) a NocoDB",
    )
    import_excel_cmd.add_argument("file", type=Path, help="Ruta al Excel (p. ej. Finanzas.xlsx)")
    import_excel_cmd.add_argument(
        "--only",
        help="Entidades separadas por coma: gastos,ingresos,inversiones,patrimonio",
    )
    import_excel_cmd.add_argument(
        "--persona",
        default="Santi",
        choices=["Santi", "Sandra"],
        help="Persona por defecto cuando el Excel no la indica",
    )
    import_excel_cmd.add_argument("--dry-run", action="store_true", help="No inserta; solo informe")
    import_excel_cmd.add_argument(
        "--force",
        action="store_true",
        help="Importa aunque NocoDB ya tenga igual o más filas",
    )

    import_gastos_comun_cmd = sub.add_parser(
        "import-gastos-comun",
        help="Importa GastosComún.xlsx (hoja Gastos Común) como Persona = Común",
    )
    import_gastos_comun_cmd.add_argument("file", type=Path, help="Ruta al Excel (p. ej. GastosComún.xlsx)")
    import_gastos_comun_cmd.add_argument("--dry-run", action="store_true", help="No inserta; solo informe")

    args = parser.parse_args(argv)

    if args.command == "analyze":
        preview, _ = analyze_file(args.file, account_id=args.account)
        if args.message:
            print(preview.to_bot_message())
        else:
            print(json.dumps(preview.to_dict(), ensure_ascii=False, indent=2))
        return 0

    if args.command == "import-excel":
        entities = [part.strip() for part in args.only.split(",")] if args.only else None
        report = asyncio.run(
            import_excel(
                _nocodb_client(),
                args.file,
                entities=entities,
                default_persona=args.persona,
                dry_run=args.dry_run,
                skip_existing=not args.force,
            )
        )
        print(json.dumps(report.to_dict(), ensure_ascii=False, indent=2))
        return 0

    if args.command == "import-gastos-comun":
        report = asyncio.run(
            import_gastos_comun(
                _nocodb_client(),
                args.file,
                dry_run=args.dry_run,
            )
        )
        print(json.dumps(report.to_dict(), ensure_ascii=False, indent=2))
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
