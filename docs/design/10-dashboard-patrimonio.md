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
| **Valor** | Number | Positivo = activo · Negativo = deuda (siempre en €) |
| **Tipo** | Single select | Lista fija (abajo) |
| **Persona** | Single select | Santi \| Sandra \| Común |
| **Detalle** | JSON | Opcional. Extras por fila (unidades cripto, propiedad inmobiliaria). Ver `data-decisions.md` (2026-07-05) |

**Tipos:** `Liquidez`, `Renta variable`, `Crypto`, `Inmobiliario`, `Hipoteca` (+ `Otro` si aplica en import).

### Reglas de datos
- Filtro por usuario (Persona propia + Común).
- Común → **50%** en agregaciones (ADR-0004).
- Patrimonio neto = suma **Valor** atribuido (siempre en €).
- Deuda hipotecaria: **Tipo = Hipoteca**, **Valor** negativo en BD; en UI se introduce en positivo.
- **Titularidad parcial:** `Detalle.valor_total` + `Detalle.porcentaje` (1–100; vacío = 100). **Valor** = cuota atribuida (`valor_total × porcentaje / 100`).
- **Desglose por inmueble:** se agrupa por `Detalle.propiedad`; activo (Inmobiliario) e hipoteca (Hipoteca) de un mismo inmueble comparten esa etiqueta. Si una fila no trae `propiedad`, cae al **Nombre** (compatibilidad). Filas legacy Inmobiliario con Valor negativo siguen contando como deuda.
- Diversificación por tipo: **Inmobiliario** = valor **neto** (activos − deudas hipotecarias); **Hipoteca** no aparece como categoría en tarta/barras/treemap. Patrimonio neto total y evolución por tipo usan la misma lógica en gráficos de diversificación.
- LTV inmobiliario global: `Σ deudas hipotecarias / Σ activos inmobiliarios` (último snapshot).
- LTV por inmueble: deuda / valor bruto agrupando por `Detalle.propiedad` (fallback **Nombre**).
- **Cripto (BTC):** `Valor` se guarda en €, pero puede calcularse desde `Detalle.unidades` × cotización BTC/EUR al insertar (ver `04-manual-insert.md`).

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
| Acciones por empresa | Barras por empresa: **Nombre** si es un activo concreto; si **Nombre** = «Accións»/«Acción», agrupa por **Entidad** (broker) |
| Inmobiliario por activo | Barras agrupadas Valor bruto / Deuda por **Nombre** |
| Tabla inmobiliario | Activo · Valor bruto · Deuda · Neto · LTV |

### Bloque 2: Evolución (respeta filtro de años)

Filtro igual que Ingresos/Inversión (`YearFilter`): todo / año / rango / últimos 5 años — aplicado al **año calendario** de cada fecha de snapshot.

| Widget | Contenido |
|--------|-----------|
| Línea | Patrimonio neto total por fecha de snapshot |
| Barras agrupadas | Por snapshot, una barra por Tipo (€) |

## Implementado tras v1
- **LTV por inmueble** vía `Detalle.propiedad` (2026-07-05).
- **+ Insertar → Patrimonio** (formulario de snapshot, ver `04-manual-insert.md`).
- Cripto BTC: unidades → € al guardar (`Detalle.unidades`).

## Fuera de alcance
- Integración Dashboard Resumen.
- Gráfica % composición temporal (eliminada en diseño).

## Referencias
- Canvas: `docs/design/canvases/patrimonio-v0.canvas.tsx`
- Paralelo: `09-dashboard-inversiones.md`
- Tabla / import: `10-excel-migration.md`, `data-decisions.md`
- ADR-0004 Persona
