# Diseño: Wizard de AutomaticActions

## Estado
Aprobado — UX (2025-06-13). Modelo: `05-automatic-actions.md`.

## Origen de los datos
1. Usuario envía **export bancario** al bot (Telegram o similar).
2. Hay **N bancos**, cada uno con formato propio.
3. El **worker** parsea, unifica, clasifica y recomienda.
4. El worker inserta filas en **AutomaticActions** (`Estado = pending`), con idempotencia (ADR-0006).

> Toda inteligencia de interpretación/clasificación: **solo en el worker**.

## Web — badge «Tareas pendientes»
- Cuenta filas en **AutomaticActions** con `Estado = pending`.
- Badge en barra superior; se actualiza **sin recargar la página**.

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
- ADR-0005, ADR-0006
