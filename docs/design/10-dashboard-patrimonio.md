# Diseño: Dashboard Patrimonio (pestaña)

## Estado
Aprobado (2026-06-15). Canvas: `patrimonio-v0`.

## Cuándo se muestra
Pestaña **Patrimonio** del shell (`01-homepage.md`).

## Tabla NocoDB: **Patrimonio**

Snapshots de valor: varias filas por **Fecha** (un snapshot = todas las filas del mismo día).

| Campo | Tipo | Notas |
|-------|------|-------|
| **Entidad** | Texto / Single select | Banco, broker, inmueble… |
| **Fecha** | Date | Fecha del snapshot |
| **Nombre** | Texto | Activo, cuenta, hipoteca (ex-Elemento / Nota Excel) |
| **Valor** | Number | Positivo = activo · Negativo = deuda |
| **Tipo** | Single select | Lista fija (abajo) |
| **Persona** | Single select | Santi \| Sandra \| Común |

**Tipos:** `Liquidez`, `Renta variable`, `Crypto`, `Inmobiliario` (+ `Otro` si aplica en import).

### Reglas de datos
- Filtro por usuario (Persona propia + Común).
- Común → **50%** en agregaciones (ADR-0004).
- Patrimonio neto = suma **Valor** atribuido.
- Deuda hipotecaria: **Tipo = Inmobiliario**, **Valor** negativo; mismo **Nombre** que el activo para desglose por inmueble.
- LTV inmobiliario global: `|Σ deudas inmobiliarias| / Σ activos inmobiliarios` (último snapshot).
- LTV por activo: deuda / valor bruto agrupando filas por **Nombre**.

## UX — textos
- **KPIs superiores:** subtítulo permitido (fecha snapshot, % variación, ratio deuda/activo).
- **Gráficos:** solo título; sin pies de figura redundantes. Detalle técnico → tooltip al hover.

## Layout

### Bloque 1: Patrimonio actual (último snapshot; ignora filtro de evolución)

| Widget | Contenido |
|--------|-----------|
| Tarjeta Patrimonio neto | Valor + subtítulo `EUR · {fecha}` |
| Tarjeta Variación | Δ€ + subtítulo `{±%} · respecto a {snapshot anterior}` |
| Tarjeta LTV inmobiliario | % + subtítulo `Deuda X / Activo Y` |
| Diversificación € | Barras horizontales por Tipo |
| Diversificación % | Tarta por Tipo |
| Renta variable por activo | Barras por **Nombre** (solo Tipo = Renta variable) |
| Inmobiliario por activo | Barras agrupadas Valor bruto / Deuda por **Nombre** |
| Tabla inmobiliario | Activo · Valor bruto · Deuda · Neto · LTV |

### Bloque 2: Evolución (respeta filtro de años)

Filtro igual que Ingresos/Inversión (`YearFilter`): todo / año / rango / últimos 5 años — aplicado al **año calendario** de cada fecha de snapshot.

| Widget | Contenido |
|--------|-----------|
| Línea | Patrimonio neto total por fecha de snapshot |
| Barras agrupadas | Por snapshot, una barra por Tipo (€) |

## Fuera de alcance (v1)
- LTV por inmueble con campo Grupo dedicado.
- Integración Dashboard Resumen.
- **+ Insertar** → Patrimonio.
- Gráfica % composición temporal (eliminada en diseño).

## Referencias
- Canvas: `docs/design/canvases/patrimonio-v0.canvas.tsx`
- Paralelo: `09-dashboard-inversiones.md`
- Tabla / import: `10-excel-migration.md`, `data-decisions.md`
- ADR-0004 Persona
