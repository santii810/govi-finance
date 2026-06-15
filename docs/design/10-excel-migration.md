# Migración Excel → NocoDB

Herramienta CLI para cargar el histórico de **Finanzas.xlsx** en la base **Gastos** de NocoDB.

## Fuente de verdad durante la transición

Mientras la app web evoluciona, el Excel sigue siendo el libro de registro del usuario. La herramienta `import-excel` sincroniza hacia NocoDB las tablas acordadas. Cualquier herramienta nueva que toque datos históricos debe respetar este contrato.

| Entidad      | Hoja Excel     | Tabla NocoDB | Notas |
|--------------|----------------|--------------|-------|
| Gastos       | `GastosExport` | Gastos       | Incluye comunes + personales; columna `Origen` → `Persona` |
| Ingresos     | `Ingresos`     | Ingresos     | Sin columna Persona en Excel → default `Santi` |
| Inversión    | `Inversión`    | Inversiones  | `Elemento` → `Nombre`, `Aportado` → `Importe` |
| Patrimonio   | `Patrimonio`   | Patrimonio   | `Nota` → `Nombre`, `cantidad` → `Valor` |

Hojas **no importadas** (por ahora): `GastosTotales`, `GastosPersonales`, `Templates`, `Renta`, `Deudas`.

## Mapeos de Persona (Gastos)

| Excel `Origen` | Regla |
|----------------|-------|
| `Común`        | `Persona = Común` |
| `Personal` + fuente con «Sandra» | `Persona = Sandra` |
| `Personal` (resto) | `Persona` = flag `--persona` (default `Santi`) |

Ingresos, Inversiones y Patrimonio usan `--persona` para todas las filas (el Excel no trae Persona).

## Mapeos de tipos

**Inversión** (`Tipo` Excel → NocoDB):

- Fondo Indexado → Fondo indexado
- PIAS, Acción, Inmobiliario, ETF → igual (con normalización de mayúsculas)
- Cripto → Crypto

**Patrimonio** (`tipo` Excel → NocoDB):

- liquidez → Liquidez
- bolsa → Renta variable
- inmobiliario → Inmobiliario
- BTC → Crypto
- otro → Otro

## Comportamiento de la CLI

```bash
cd worker
pip install -e ".[dev]"

export NOCODB_URL=http://localhost:23456
export NOCODB_API_TOKEN=...

# Vista previa (no escribe en BD)
python -m worker import-excel ../Finanzas.xlsx --dry-run

# Solo entidades concretas
python -m worker import-excel ../Finanzas.xlsx --only gastos,inversiones,patrimonio

# Reimportar aunque ya haya filas (puede duplicar)
python -m worker import-excel ../Finanzas.xlsx --only gastos --force
```

Por defecto **omite** una entidad si NocoDB ya tiene ≥ filas que el Excel mapea (`--force` para forzar).

La herramienta **añade opciones** a columnas SingleSelect (Fuente, Categoría, etc.) si faltan en NocoDB.

## Idempotencia y re-ejecución

- **Ingresos**: ya importados manualmente (547 filas). La CLI los salta por defecto.
- **Gastos / Inversión / Patrimonio**: primera carga desde Excel; re-ejecutar con `--force` duplica filas (no hay clave de idempotencia en estas tablas).
- Futuro: comparar por hash de fila o flag `--replace` por tabla.

## Docker

```bash
cd infra
docker compose run --rm \
  -v "$(pwd)/../Finanzas.xlsx:/data/Finanzas.xlsx:ro" \
  -e NOCODB_URL=http://nocodb:8080 \
  bot python -m worker import-excel /data/Finanzas.xlsx --dry-run
```

## Relación con otras herramientas

| Herramienta | Qué importa | Idempotencia |
|-------------|-------------|--------------|
| `import-excel` | Histórico Excel | Skip por conteo de filas |
| Bot Telegram + worker | Movimientos bancarios | `IdempotencyKey` en AutomaticActions |
| Web wizard | AutomaticActions → Gastos/Ingresos | Estado en AutomaticActions |

No mezclar flujos: el Excel es carga histórica; el pipeline bancario es operativa diaria.

## Tabla Patrimonio

Creada en NocoDB (2026-06-15) según canvas `patrimonio-v0`:

- Campos: Entidad, Fecha, Nombre, Valor, Tipo, Persona
- ID: `mimdsus64el2tnl`
