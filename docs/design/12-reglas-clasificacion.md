# Diseño: Reglas de clasificación automática

## Estado
Aprobado e implementado (2026-06-15).

## Propósito

Gestionar **ImportRules** desde la web para clasificar movimientos **pending** en el wizard de tareas.
Las reglas se aplican **en memoria** al listar pending; no las aplica el bot ni el worker.

Modelo de datos: `08-import-rules.md`. Wizard: `03-wizard-automatic-actions.md`.

---

## Ubicación en la UI (acordado)

**Opción B:** acceso **solo dentro de la pestaña Tareas**.

- En la vista de tareas pending, botón **Gestionar reglas** (junto al título «Tareas pendientes»).
- Click → misma pestaña, sustituye la lista por la **vista de reglas** (o panel fullwidth equivalente).
- Volver a la lista: botón **← Tareas** o equivalente.
- **No** hay botón Reglas en la barra superior global.

---

## Vistas

### Vista lista de reglas

```
┌────────────────────────────────────────────────────────────────────────┐
│ ← Tareas    Reglas de clasificación                    [+ Nueva regla] │
├────────────────────────────────────────────────────────────────────────┤
│ ☑ Exacto — VANGUARD US 500 → SP500     global · 500 · Inversiones      │
│   Si concepto = «VANGUARD US 500 STOCK INDEX EU» → SP500               │
│                                                    [Editar] [Desactivar]│
├────────────────────────────────────────────────────────────────────────┤
│ ☑ Exacto — AMUNDI MSCI EM → MSCI EM    global · 500 · Inversiones    │
│   Si concepto = «AMUNDI INDEX MSCI EMERG MKTS I» → MSCI EM           │
│                                                    [Editar] [Desactivar]│
├────────────────────────────────────────────────────────────────────────┤
│ ☑ Global — importe positivo → Ingresos global · 0                    │
│ ☐ Global — importe negativo → Gastos   global · 0   (inactiva)     │
└────────────────────────────────────────────────────────────────────────┘
```

| Columna / dato | Descripción |
|----------------|-------------|
| Activa | Checkbox; solo reglas activas se evalúan |
| Nombre | Campo **Nombre** de ImportRules |
| Resumen | Texto generado: condición → destino (legible, no JSON) |
| Alcance · Prioridad · Destino | Metadatos rápidos |
| Editar | Abre formulario |
| Desactivar / Activar | Toggle sin borrar |

Orden por defecto: **Prioridad** descendente, luego **Nombre**.

### Vista formulario (crear / editar)

**Modo simple** (por defecto; cubre el 90% de casos):

| Campo UI | Mapeo ImportRules |
|----------|-------------------|
| Nombre | `Nombre` |
| Tipo de condición | Define claves en `Condición` |
| Texto del concepto | `concepto_exacto` o `concepto_contiene` |
| Destino | `Acciones.tabla_destino` |
| Categoría | `Acciones.categoria` (solo si destino = Gastos) |
| Tipo inversión | `Acciones.tipo` (solo si destino = Inversiones) |
| Nombre activo | `Acciones.nombre` (solo si destino = Inversiones) |
| Entidad (opcional) | `Acciones.entidad` (override; vacío = heredar del banco/cuenta) |
| Alcance | `Alcance` + `Cuenta` si `account` |
| Prioridad | `Prioridad` (default según tipo de condición) |
| Activa | `Activa` |
| Invertir cantidad | `Acciones.invertir_importe` (bool) |

**Tipos de condición en modo simple:**

| Tipo UI | Condición JSON | Prioridad default |
|---------|----------------|-------------------|
| **Nombre exacto** | `concepto_exacto` | 500 |
| Contiene texto | `concepto_contiene` | 100 |
| Importe positivo | `importe_positivo: true` | 0 |
| Importe negativo | `importe_negativo: true` | 0 |

**Modo avanzado** (colapsado): edición directa de JSON `Condición` y `Acciones` para MCC, `type`, `asset_class`, `symbol`, etc.

### Tras guardar

1. Persistir en NocoDB (tabla ImportRules).
2. Volver a lista de reglas o a lista de tareas (según flujo).
3. Si hay pending visibles: **re-evaluar clasificación** sin recargar página (`ux-interactions.md`).

---

## Motor — extensiones (acordado)

### Nueva condición

| Clave | Comportamiento |
|-------|----------------|
| `concepto_exacto` | `Concepto` coincide tras **trim** + comparación **case-insensitive** |

### Destinos ampliados

| `tabla_destino` | Campos de acción |
|-----------------|------------------|
| `Gastos` | `categoria` |
| `Ingresos` | (sin campos extra por ahora) |
| `Inversiones` | `tipo`, `nombre`, `entidad` (opcional) |

### Entidad por defecto

Si la regla no fija `entidad`, al aceptar el movimiento se usa la entidad derivada del **banco/cuenta** del movimiento (p. ej. Trade Republic desde `Metadatos.account_id` / `Banco`).

### Jerarquía de prioridad

| Tipo | Prioridad típica |
|------|------------------|
| Signo global (+/−) | 0 |
| Contiene / metadatos | 50–100 |
| **Nombre exacto** | **500** |
| Regla de cuenta | +100 sobre equivalente global |

Evaluación sin cambios: filtrar activas → alcance cuenta → ordenar por prioridad desc → aplicar todas las que coinciden (cada una puede sobreescribir la anterior).

---

## Wizard — filas con destino Inversiones

Resumen por fila pending cuando la propuesta es Inversiones:

`fecha · importe · concepto · banco · Inversiones · {tipo} · {nombre}`

Ejemplo:

`12/06  +200 €  VANGUARD US 500 STOCK INDEX EU  Trade Republic  Inversiones  Fondo indexado  SP500`

**Aceptar** → insert en tabla **Inversiones** (`mwnd0d416iwzwv6`):

| Campo NocoDB | Origen |
|--------------|--------|
| Entidad | `entidad` de regla o derivada del movimiento |
| Fecha | Fecha del movimiento |
| Nombre | `nombre` de la clasificación |
| Importe | Importe del movimiento (signo = aportación/retiro) |
| Tipo | `tipo` de la clasificación |
| Persona | Persona del movimiento (o override de regla) |

---

## Reglas seed acordadas (inversiones — nombre exacto)

| Nombre | Condición | Acciones |
|--------|-----------|----------|
| Exacto — VANGUARD US 500 → SP500 | `concepto_exacto`: `VANGUARD US 500 STOCK INDEX EU` | `tabla_destino`: Inversiones, `tipo`: Fondo indexado, `nombre`: SP500 |
| Exacto — AMUNDI MSCI EM → MSCI EM | `concepto_exacto`: `AMUNDI INDEX MSCI EMERG MKTS I` | `tabla_destino`: Inversiones, `tipo`: Fondo indexado, `nombre`: MSCI EM |

Ambas: `Alcance` global, `Prioridad` 500, `Activa` true.

> Valor **Tipo** en NocoDB: `Fondo indexado` (singular), alineado con tabla Inversiones.

---

## Aprendizaje desde wizard (futuro)

Al aceptar/editar un movimiento con clasificación distinta a la propuesta, ofrecer **«Guardar como regla»** con formulario simple pre-rellenado. Fuera de alcance de la primera implementación.

---

## Referencias

- `08-import-rules.md` — modelo ImportRules
- `03-wizard-automatic-actions.md` — wizard y re-evaluación
- `09-dashboard-inversiones.md` — campos destino Inversiones
- `docs/standards/ux-interactions.md` — sin recargas
