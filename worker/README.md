# Worker — importación bancaria + bot Telegram

Parsea exports, detecta cuenta e inserta en AutomaticActions tras confirmación en Telegram.

## Bot Telegram

### Variables de entorno

Ver `.env.example`. Obligatorias:

- `TELEGRAM_BOT_TOKEN` — de @BotFather
- `NOCODB_API_TOKEN`

Recomendado en producción:

- `TELEGRAM_ALLOWED_USER_IDS` — IDs permitidos (coma separada)

### Docker (recomendado)

Añade a `infra/.env`:

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_ALLOWED_USER_IDS=123456789
```

Levanta el stack:

```bash
docker compose up -d bot
```

### Flujo

1. Envías un CSV al bot
2. Resumen: banco, cuenta, persona, fechas, ejemplos
3. **Sí, importar** → insert idempotente en AutomaticActions (`pending` + Metadatos)
4. **Cancelar** → nada en BD
5. **✎ Cuenta** → re-analizar con otra cuenta del catálogo (si hay varias)

No aplica ImportRules — eso lo hace la web en el wizard (en memoria).

## CLI (parseo local)

```bash
cd worker
pip install -e ".[dev]"
python -m worker analyze samples/trade-republic-santi/exportacion.csv --message
```

## Migración Excel → NocoDB

Carga histórica desde `Finanzas.xlsx` (Gastos, Ingresos, Inversión, Patrimonio).

```bash
export NOCODB_URL=http://localhost:23456
export NOCODB_API_TOKEN=...

# Vista previa
python -m worker import-excel ../Finanzas.xlsx --dry-run

# Importar solo lo que falta (salta Ingresos si ya hay 547 filas)
python -m worker import-excel ../Finanzas.xlsx --only gastos,inversiones,patrimonio
```

Spec completa: `docs/design/10-excel-migration.md`.

## Configuración

- **Cuentas:** `config/accounts.yaml`
- **Reglas (ImportRules):** NocoDB — las aplica la **web**
- Motor de reglas de referencia: `src/worker/rules/engine.py`
