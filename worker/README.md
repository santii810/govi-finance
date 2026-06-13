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

No aplica ImportRules — eso lo hace la web en el wizard.

## Clasificador (ImportRules)

Aplica las reglas de NocoDB a filas `pending` en AutomaticActions (misma lógica que la web):

```bash
cd worker
pip install -e ".[dev]"
export NOCODB_URL=http://localhost:23456
export NOCODB_API_TOKEN=...
python -m worker classify          # clasifica y persiste
python -m worker classify --dry-run  # solo simula
```

Motor de reglas: `src/worker/rules/engine.py` (referencia compartida con `front/src/lib/import-rules/`).

## CLI (parseo local)

```bash
cd worker
pip install -e ".[dev]"
python -m worker analyze samples/trade-republic-santi/exportacion.csv --message
```

## Configuración

- **Cuentas:** `config/accounts.yaml`
- **Reglas (ImportRules):** NocoDB — las aplica la **web**
- Motor de reglas de referencia: `src/worker/rules/engine.py`
