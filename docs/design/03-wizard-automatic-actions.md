# Diseño: Wizard de AutomaticActions

## Estado
Aprobado — UX (2025-06-13). Modelo: `05-automatic-actions.md`. Actualizado: ImportRules en web (2025-06-13).

## Origen de los datos
1. Usuario envía **export bancario** al bot (Telegram o similar).
2. Hay **N bancos**, cada uno con formato propio.
3. El **worker** parsea, detecta cuenta e inserta filas en **AutomaticActions** (`Estado = pending`), con idempotencia (ADR-0006).
4. La **web** carga **ImportRules** y calcula la propuesta **en memoria** al mostrar el wizard (no se persiste en AutomaticActions).

> **Parseo y origen:** worker/bot. **Clasificación (ImportRules):** web, en memoria, al revisar pending.

## Web — badge «Tareas pendientes»
- Cuenta filas en **AutomaticActions** con `Estado = pending`.
- Badge visible en dos lugares: botón «Tareas» en la barra superior y pestaña «Tareas» en la nav de pestañas.
- Ambos se actualizan **sin recargar la página**.

## Web — pantalla de tareas (al pulsar badge o pestaña)
- Se activa la **pestaña «Tareas»** en la barra de pestañas: página fullwidth dentro del shell normal.
- La barra superior y la nav de pestañas permanecen visibles.
- Para salir: click en cualquier otra pestaña (Resumen, Ingresos, etc.).

## Web — ImportRules

### Cuándo se aplican
- Al **abrir el wizard** (lista de pending) — vía `GET /api/automatic-actions/pending`.
- Al **crear o editar una regla** en NocoDB — re-evaluar pending visibles (misma petición).
- **No** en el bot ni en el worker al importar.
- **No** hay job ni CLI de clasificación; todo ocurre en la petición del wizard.

### Jerarquía
Reglas de **cuenta** prevalecen sobre **globales**. Prioridad numérica dentro de cada alcance.

### Propuesta mostrada
Por cada fila pending: `TablaDestino`, `Categoría` (Gastos) o `Tipo` + `Nombre` (Inversiones), `Persona` (override si la regla lo indica), calculados en memoria. Datos de entrada: campos de AutomaticActions + **Metadatos** JSON. No se escriben en NocoDB hasta **Aceptar** / **Editar**.

### Gestión de reglas (acordado 2026-06-15)
- Botón **Gestionar reglas** en la pestaña Tareas → vista CRUD de ImportRules (`12-reglas-clasificacion.md`).
- Sin botón global en la barra superior.
- Al guardar una regla: re-evaluar pending visibles sin recargar.

### Aprendizaje (futuro)
Al aceptar/editar con cambios, opción de **guardar regla** para movimientos similares.

## Web — lista de tareas

### Patrón: lista ágil (opción C)
Vista de **lista** filtrada por `pending`. Cada fila muestra resumen y acciones directas.

### Vista lista (resumen por fila)
`fecha · importe · concepto · banco · destino · categoría o tipo+nombre`

```
┌────────────────────────────────────────────────────────────────────────┐
│ Tareas pendientes (3)                              [Gestionar reglas]   │
├────────────────────────────────────────────────────────────────────────┤
│ 12/06  -45,20 €  Gadis  Supermercado_Gadis  Gastos  [Aceptar][Ignorar][✎]│
│ 11/06  +200 €  VANGUARD US 500…  Inversiones  Fondo indexado  SP500   │
│                                              [Aceptar][Ignorar][✎]      │
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
- `12-reglas-clasificacion.md`
- `07-bank-import-worker.md`
- ADR-0005, ADR-0006
