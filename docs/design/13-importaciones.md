# Importaciones — vista web y modelo

## Estado
Implementado (2026-06-25).

## Propósito
Consultar el estado de carga de cada cuenta bancaria y el historial de importaciones por fichero.

## Acceso
- Botón **Importaciones** en la barra superior (junto a Tareas y Backups).
- Ruta: `/app/importaciones`.
- Visible para Santi y Sandra; **sin filtro por Persona** (todas las cuentas activas).

## Pantalla

### Bloque «Cuentas activas»
Tarjeta por cuenta con `Estado = Active` en NocoDB:
- **Último movimiento** — `MAX(FechaUltimoRegistro)` de sus AccountDumps.
- **Última importación** — `MAX(CreatedAt)` de sus AccountDumps.
- Badge con tareas **pending** de esa cuenta (vía `Metadatos.account_id`).

### Bloque «Historial de importaciones»
Tabla de AccountDumps de cuentas activas, orden descendente por fecha de importación:
- Importado, Cuenta, Fichero, Rango de movimientos, Total, Nuevos, Omitidos.

## Modelo NocoDB

Ver `docs/standards/data-decisions.md` (sección Accounts y AccountDumps).

## Worker / bot
- Catálogo de cuentas desde tabla **Accounts** (solo `Active` en bot).
- Cada import confirmado crea un **AccountDump** y enlaza todas las AutomaticActions insertadas.
- YAML `worker/config/accounts.yaml` queda como seed del provision script.

## Referencias
- `07-bank-import-worker.md`
- `05-automatic-actions.md`
- `worker/scripts/provision_import_schema.py`
