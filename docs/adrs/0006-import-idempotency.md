# ADR-0006: Idempotencia en importación bancaria

## Estado
Aceptado (2025-06-13)

## Contexto
El usuario exportará movimientos del banco de la forma más cómoda, **sin fijarse en fechas exactas**. Lo habitual será traerse **el último año** cada vez. Eso implica **solapamiento** entre exports sucesivos.

## Decisión

### Comportamiento idempotente del worker
- El worker es **idempotente**.
- Antes de insertar, comprueba si `IdempotencyKey` ya existe en **AutomaticActions**.
- Si existe → no inserta.

### Algoritmo de la clave
1. Si el export trae **referencia** del banco → usarla como key.
2. Si no → **hash**(banco + fecha + importe + concepto).

### Almacenamiento y estados
- La key vive **solo en AutomaticActions** (campo `IdempotencyKey`, único).
- Estados: `pending` | `accepted` | `modified` | `ignored`.
- Key existente en **cualquier** estado → no reinserta; no aparece como pending.

## Consecuencias
- Reimports seguros (ej. último año repetido).
- Historial en AutomaticActions sirve también para deduplicación.

## Referencias
- ADR-0005
- `05-automatic-actions.md`
