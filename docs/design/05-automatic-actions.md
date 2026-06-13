# Modelo de datos: AutomaticActions

## Estado
Definido (2025-06-13) — tabla creada en NocoDB base **Gastos**.

## Propósito

Almacena **todas** las acciones automáticas del pipeline bancario (no solo las pendientes):
importaciones del worker, su estado de revisión y trazabilidad para idempotencia.

| Uso | Filtro |
|-----|--------|
| Badge «Tareas pendientes» | `Estado = pending` |
| Wizard web | `Estado = pending` |
| Historial / deduplicación | Cualquier `Estado`; lookup por `IdempotencyKey` |

## Identificación en NocoDB

| Propiedad   | Valor              |
|-------------|--------------------|
| Título      | AutomaticActions   |
| Table ID    | `mugm6tw1ail68rq`  |
| Base        | Gastos (`pnf173not1wvzg0`) |

> **Estado en NocoDB (2025-06-13):** campos de negocio creados vía API. `Title` legacy — no usar en la app.

---

## Campos de negocio

| Campo | Tipo NocoDB | Obligatorio | Único | Descripción |
|-------|-------------|-------------|-------|-------------|
| **IdempotencyKey** | SingleLineText | Sí | Sí | Referencia del banco o hash(banco+fecha+importe+concepto). ADR-0006 |
| **Estado** | SingleSelect | Sí | No | `pending` \| `accepted` \| `modified` \| `ignored` |
| **Fecha** | Date | Sí | No | Fecha del movimiento |
| **Importe** | Currency (EUR) | Sí | No | Importe real del movimiento |
| **Concepto** | SingleLineText | No | No | Descripción / concepto bancario |
| **Banco** | SingleLineText | Sí | No | Banco de origen del export (ej. Abanca) |
| **TablaDestino** | SingleSelect | Sí | No | Tabla propuesta: `Gastos`, `Ingresos`, … |
| **Categoría** | SingleLineText | No | No | Propuesta del worker (misma lógica que Gastos.Categoría) |
| **Persona** | SingleSelect | No | No | `Santi` \| `Sandra` \| `Común` — propuesta del worker |

### Campos sistema (NocoDB)
`Id`, `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy` — gestión estándar.

### Campo legacy
`Title` — existe en la tabla creada; **no usar** en la lógica de la app (opcional eliminar en NocoDB).

---

## Estados

| Estado | Worker inserta | Wizard | Insert tabla destino |
|--------|----------------|--------|----------------------|
| `pending` | Sí | Visible | No |
| `accepted` | No (solo web) | No | Sí, datos propuestos |
| `modified` | No (solo web) | No | Sí, datos editados |
| `ignored` | No (solo web) | No | No |

Tras salir de `pending`, la fila **permanece** en AutomaticActions (historial + idempotencia).

---

## Idempotencia

1. Worker calcula `IdempotencyKey` (ADR-0006).
2. Si la key **ya existe** en AutomaticActions (cualquier estado) → no inserta.
3. La key **no se copia** a Gastos/Ingresos.

---

## Flujos

### Worker → AutomaticActions
```
export banco → parsear → clasificar → INSERT (Estado=pending, resto de campos)
```

### Wizard → tabla destino
```
pending + Aceptar   → INSERT destino, Estado=accepted
pending + Editar    → INSERT destino, Estado=modified
pending + Ignorar   → Estado=ignored
Deshacer            → revertir a pending (y borrar insert destino si aplica)
```

---

## Relación con otras tablas

| Tabla destino | Campos mapeados al aceptar |
|---------------|----------------------------|
| Gastos | Fecha→Date, Importe→Cantidad, Concepto→Destino, Banco→Fuente, Categoría, Persona |
| Ingresos | Por definir cuando exista Categoría/Persona en Ingresos |

> El mapeo exacto se confirma con el usuario al implementar cada tabla destino.

---

## Referencias
- ADR-0005 (pipeline)
- ADR-0006 (idempotencia)
- `03-wizard-automatic-actions.md`
- `data-decisions.md`
