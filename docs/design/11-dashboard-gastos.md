# Diseño: Dashboard Gastos (pestaña)

## Estado
**Aprobado — cerrado para implementación** (2026-06-15).

Canvas de referencia: `gastos-v0` → `docs/design/canvases/gastos-v0.canvas.tsx`

## Cuándo se muestra
Pestaña **Gastos** del shell (`01-homepage.md`), activa al pulsarla.

## Navegación interna — subpestañas laterales

Barra lateral dentro del área de Gastos, en dos bloques:

| Bloque | Entradas |
|--------|----------|
| **Vistas** | Totales · Gastos de vida |
| **Por categoría** | Supermercado · Piso · Viaxes · Restauración · *(futuras)* |

Al entrar en Gastos, la vista activa por defecto es **Totales**.

### Vista «Totales»
Todas las categorías con gasto en el período filtrado.

### Vista «Gastos de vida» (acordado 2026-06-15)
Gastos cotidianos: **mismas categorías que Totales excepto Viaxes y ReformaPiso**.
Equivalente a la vista «Gastos de vida» del Looker GastosComún.

## Filtro de período (acordado)
Selector en la parte superior del dashboard (mismo patrón que Ingresos):

| Opción | Comportamiento |
|--------|----------------|
| **Año en curso** | Solo el año calendario actual *(valor por defecto)* |
| **Todo el histórico** | Todos los años con datos |
| **Últimos 5 años** | Ventana móvil de 5 años |
| **Rango personalizado** | Desde / hasta (dos selectores) |

Todos los widgets **reaccionan al filtro** (sin recargar la página).

## Reglas de datos
- Solo gastos visibles para el usuario logueado (Persona = suyo o Común).
- Persona = Común → **50%** del importe en agregaciones (ADR-0004). *No mostrar en UI; es implícito.*
- Campo importe: **Gasto**. Campo fecha: **Fecha**. Campo categoría: **Categoría**.
- Campo **Destino**: establecimiento/concepto (Supermercado, Restauración, detalle de ticket en viajes).
- Campo **Ubicación**: nombre del viaje en subpestaña Viaxes (Burdeos, Madeira…).

## Layout — vista agregada (Totales / Gastos de vida)

```
┌─ Subpestañas ─┬─ Filtro período ─────────────────────────────┐
│  Totales      │  [ Año en curso ▾ ]  o  Desde–Hasta           │
│  Gastos vida  ├──────────────────────────────────────────────┤
│  ─────────    │  ┌─────────────┐ ┌─────────────┐              │
│  Supermercado │  │ Total       │ │ Registros   │              │
│  Piso         │  └─────────────┘ └─────────────┘              │
│  …            │  ┌─ Distribución (barra + treemap) ─────────┐ │
│               │  └──────────────────────────────────────────┘ │
│               │  ┌─ Ranking ──┐  ┌─ Participación % ───────┐ │
│               │  └────────────┘  └─────────────────────────┘ │
│               │  ┌─ Tabla mes × categoría (+ fila Total) ──┐ │
│               │  └──────────────────────────────────────────┘ │
└───────────────┴──────────────────────────────────────────────┘
```

### Tarjetas superiores (2)
| Tarjeta | Valor |
|---------|-------|
| Total apuntado | Suma Gasto en rango y vista activa. Línea secundaria centrada: **±N € vs año pasado a hoy** (mismo tramo YTD). **Rojo** si mayor; **verde** si menor. |
| Registros | Nº de movimientos en el mismo ámbito |

*Sin fechas de inicio/fin de período en UI.*

### Widgets agregados
1. **Barra de composición** por categoría
2. **Treemap** — área proporcional al importe
3. **Ranking** horizontal por categoría (valores ≥ 1k en notación **k** con 1 decimal)
4. **Participación %** — top categorías
5. **Tabla** — filas = meses (ene–dic), columnas = categorías + Total, fila Total al pie

## Layout — Supermercado (acordado 2026-06-15)

Distribución por campo **Nombre** (`Categoría = Supermercado`):

- Total apuntado (+ comparativa YTD) · media mensual
- Barra de composición + treemap + ranking por establecimiento
- Evolución mensual y últimos movimientos

## Layout — Piso (acordado 2026-06-15)

Agregación por **Nombre** (`Categoría = Piso`):

- Total apuntado (+ comparativa YTD) · media mensual
- Barra de composición + treemap + ranking por concepto
- Evolución mensual
- **Tabla de gastos mensuales** — filas = meses, columnas = nombres + Total, fila Total al pie
- Últimos movimientos

## Layout — Viaxes (acordado 2026-06-15)

Sin evolución mensual (los viajes no son regulares).

- Total apuntado (+ comparativa YTD) · nº de viajes en el período
- **Barras apiladas por año** — altura = total del año; segmentos = **Ubicación** (comparativa interanual)
- **Tabla pivot** — filas = **Ubicación**, columnas = categoría nivel 1 (`Viaxes_X_…` → `X`; p. ej. Transporte, Hotel, Restauración)
- **Tabla año × viaje × total** — por cada año: filas con cada viaje (campo **Ubicación**) y su importe; subfila **Total {año}**; si hay varios años, **Total período** al pie. Solo registros con **Ubicación** rellena (excluye histórico sin migrar).

## Layout — Restauración (acordado 2026-06-15)

- Total apuntado (+ comparativa YTD) · media mensual
- **Barras apiladas mensuales** — cada segmento = un ticket; muchos segmentos pequeños = gasto diversificado, pocos bloques grandes = concentrado
- **Tabla mensual** — Mes · Total · Tickets
- Últimos movimientos

## Presentación
- Sin título redundante en el área (la pestaña basta).
- Sin leyendas explicativas bajo cada widget.
- Paleta Finanzas; importes en EUR.

## Fuera de alcance (v1)
- Detalle por viaje con desglose por **subcategoría** (subcategorías y campo por definir con el usuario).
- Más subpestañas por categoría (Hogar, Transporte, etc.) salvo acuerdo posterior.

## Referencias
- Shell: `01-homepage.md`
- Canvas: `gastos-v0` → `docs/design/canvases/gastos-v0.canvas.tsx`
- Plan implementación: `docs/design/plans/2026-06-15-dashboard-gastos.md`
- Filtro período (patrón): `08-dashboard-ingresos.md`
- Reglas Persona: ADR-0004
