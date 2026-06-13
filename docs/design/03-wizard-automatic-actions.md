# Diseño: Wizard de AutomaticActions

## Estado
Aprobado — UX (2025-06-13). Modelo: `05-automatic-actions.md`. Actualizado: ImportRules en web (2025-06-13).

## Origen de los datos
1. Usuario envía **export bancario** al bot (Telegram o similar).
2. Hay **N bancos**, cada uno con formato propio.
3. El **worker** parsea, detecta cuenta e inserta filas en **AutomaticActions** (`Estado = pending`), con idempotencia (ADR-0006).
4. La **web** carga **ImportRules** de NocoDB y aplica propuestas de clasificación al mostrar el wizard.

> **Parseo y origen:** worker/bot. **Clasificación (ImportRules):** web, al revisar pending.

## Web — badge «Tareas pendientes»
- Cuenta filas en **AutomaticActions** con `Estado = pending`.
- Badge en barra superior; se actualiza **sin recargar la página**.

## Web — ImportRules

### Cuándo se aplican
- Al **abrir el wizard** (lista de pending).
- Al **crear o editar una regla** en NocoDB — re-evaluar pending visibles.
- **No** en el bot ni en el worker al importar.

### Jerarquía
Reglas de **cuenta** prevalecen sobre **globales**. Prioridad numérica dentro de cada alcance.

### Propuesta mostrada
Por cada fila pending: `TablaDestino`, `Categoría`, `Persona` (override si la regla lo indica). Datos de entrada: campos de AutomaticActions + **Metadatos** JSON.

### Aprendizaje (futuro)
Al aceptar/editar con cambios, opción de **guardar regla** para movimientos similares.

## Web — pantalla wizard (al pulsar)

### Patrón: lista ágil (opción C)
Vista de **lista** filtrada por `pending`. Cada fila muestra resumen y acciones directas.

### Vista lista (resumen por fila)
`fecha · importe · concepto · banco · categoría · tabla destino`

```
┌────────────────────────────────────────────────────────────────────────┐
│ Tareas pendientes (3)                                                  │
├────────────────────────────────────────────────────────────────────────┤
│ 12/06  -45,20 €  Gadis  Supermercado_Gadis  Gastos  [Aceptar][Ignorar][✎]│
│ 11/06  +1.200 €  Optare  Nómina_Optare       Ingresos [Aceptar][Ignorar][✎]│
└────────────────────────────────────────────────────────────────────────┘
```

### Acciones por fila

| Control   | Comportamiento |
|-----------|----------------|
| **Aceptar** | `Estado` → `accepted`. Insert en **TablaDestino**. Fila sale de la lista. |
| **Ignorar** | `Estado` → `ignored`. Sin insert. Fila sale de la lista. |
| **Editar (✎)** | Edición de todos los campos. Confirmar → `modified` + insert destino. |

### Deshacer (anti-missclick)
- Tras **Aceptar** o **Ignorar**, opción **Deshacer** breve.
- **Deshacer aceptar/modificar**: `Estado` → `pending`, elimina insert destino, fila vuelve, badge sube.
- **Deshacer ignorar**: `Estado` → `pending`, fila vuelve.

### Interacción sin recargas
- Todo en cliente (JS). Ver `ux-interactions.md`.

## Referencias
- `05-automatic-actions.md`
- `08-import-rules.md`
- `07-bank-import-worker.md`
- ADR-0005, ADR-0006
