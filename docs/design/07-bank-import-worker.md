# Worker — importación bancaria

## Estado
En diseño / implementación inicial (2025-06-13). Actualizado: ImportRules en web (2025-06-13).

## Principios acordados

1. **Un export = una cuenta** — nunca mezcla cuentas.
2. **Confirmación obligatoria** en bot antes de insertar en NocoDB.
3. **Dos catálogos:**
   - **Cuentas** → `worker/config/accounts.yaml` (repo)
   - **Reglas (ImportRules)** → tabla en NocoDB — **las aplica la web**, no el worker
4. **Worker:** parseo, origen, idempotencia, `Metadatos` JSON.
5. **Web:** ImportRules → propuesta de `TablaDestino`, `Categoría`, overrides de `Persona`.

## Flujo

```
Fichero → parse (sin BD)
       → detectar parser + cuenta (YAML)
       → bot: resumen de origen + ejemplos
       → usuario CONFIRMA
       → insert idempotente en AutomaticActions (pending, Metadatos; sin clasificar)
       → wizard web: ImportRules → propuesta → aceptar/ignorar/editar
```

## Responsabilidades

| Componente | Hace | No hace |
|------------|------|---------|
| Bot | Recibe fichero, confirma **origen** (banco, cuenta, persona, fechas) | ImportRules |
| Worker | Parsea, detecta cuenta, inserta pending + Metadatos | Clasificar categorías |
| Web | ImportRules, propuesta, aceptar/ignorar, crear reglas | Parsear ficheros |

## Catálogo de cuentas (YAML)

Ubicación: `worker/config/accounts.yaml`

| Campo | Descripción |
|-------|-------------|
| `id` | Identificador interno (`trade-republic-santi`) |
| `label` | Texto para el bot |
| `banco` | Nombre del banco |
| `tipo` | `personal` \| `conjunta` |
| `persona` | `Santi` \| `Sandra` \| `Común` |
| `parser` | Parser de formato (`trade_republic`, …) |
| `detection` | Señales futuras (IBAN, fingerprint…) |

El `account_id` se guarda en **Metadatos** de cada fila AutomaticActions.

## Reglas — ImportRules (NocoDB)

Tabla **ImportRules** — creada. Modelo completo: `docs/design/08-import-rules.md`.

| Propiedad | Valor |
|-----------|-------|
| Table ID | `mo7uf7o396lxp59` |

Campos: Nombre, Activa, Alcance (`global` \| `account`), Cuenta, Prioridad, Condición (JSON), Acciones (JSON).

**Ejecutor:** web (wizard). Lógica de referencia en `worker/src/worker/rules/engine.py`.

Reglas globales iniciales (prioridad 0): signo → Ingresos / Gastos.

## Muestras locales

Exports reales en `worker/samples/` (**gitignored**). Ver `worker/samples/README.md`.

Primera cuenta: **Trade Republic — Santi** (`trade-republic-santi`).

## CLI (fase actual)

```bash
cd worker
python -m worker analyze <fichero.csv> [--message]
```

- `--message`: texto tipo bot para Telegram
- **No inserta** en NocoDB

## Bot Telegram

Servicio Docker `bot` en `infra/docker-compose.yml`.

| Variable | Descripción |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Token @BotFather |
| `TELEGRAM_ALLOWED_USER_IDS` | IDs permitidos (vacío = todos, solo dev) |
| `NOCODB_URL` | `http://nocodb:8080` en Docker |
| `NOCODB_API_TOKEN` | Token API |
| `AUTOMATIC_ACTIONS_TABLE_ID` | `mugm6tw1ail68rq` |

Flujo: CSV → preview → confirmación → insert `pending` + Metadatos (sin TablaDestino/Categoría).

Ver `worker/README.md`.

## Parsers

| Parser | Banco | Formatos soportados |
|--------|-------|---------------------|
| `trade_republic` | Trade Republic | Export oficial (`transaction_id`, `category`, `type`, …); CSV legacy |

Campos extraídos → **Metadatos** en AutomaticActions.

## Referencias

- ADR-0005, ADR-0006
- `05-automatic-actions.md`
- `03-wizard-automatic-actions.md`
- `data-decisions.md`
