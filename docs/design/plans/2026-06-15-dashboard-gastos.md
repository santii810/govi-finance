# Dashboard Gastos — Plan de implementación

> **Goal:** Pestaña Gastos con subpestañas laterales, filtro de período y vistas por categoría (paridad con canvas `gastos-v0`).

> **Architecture:** Clonar el patrón Ingresos (`ingresos-dashboard.ts`, `dashboard-ingresos.tsx`, API `/api/dashboard/ingresos`). Nuevo módulo `gastos-dashboard.ts` con agregaciones por categoría, nombre y viaje; componente `dashboard-gastos.tsx` con sidebar de subpestañas; habilitar pestaña en `app-shell.tsx`.

> **Spec:** `docs/design/11-dashboard-gastos.md` · **Canvas:** `gastos-v0.canvas.tsx`

---

## Archivos principales

| Acción | Ruta |
|--------|------|
| Lógica agregación | `front/src/lib/gastos-dashboard.ts` |
| Tipos | `front/src/lib/types.ts` |
| API | `front/src/app/api/dashboard/gastos/route.ts` |
| UI dashboard | `front/src/components/dashboard-gastos.tsx` |
| Subvistas | `front/src/components/gastos/` (sidebar, overview, supermercado, piso, viajes, restauracion) |
| Shell pestaña | `front/src/components/app-shell.tsx` (quitar `disabled` en Gastos) |

Componentes reutilizables de Ingresos: filtro de período, tarjetas métricas, gráficos de barras apiladas, tablas, heatmaps si aplican.

---

## Task 1: Capa de datos

**Create:** `front/src/lib/gastos-dashboard.ts`

- [ ] Leer tabla **Gastos** (`TABLES.gastos` en `config.ts`).
- [ ] Mapear: `Fecha`, `Gasto`, `Categoría`, `Nombre`, `Persona`; aplicar `attributedAmount` y `personaFilter`.
- [ ] Filtro período: reutilizar `resolveFilterRange` (mismo contrato que Ingresos; default **año en curso**).
- [ ] Vista agregada (Totales / Gastos de vida): totales por categoría, tabla mes × categoría, KPIs (total, registros, YTD vs año anterior a hoy).
- [ ] Supermercado / Piso: agregación por `Nombre`, treemap/ranking, evolución mensual; Piso incluye tabla mensual por nombre.
- [ ] Viaxes: tabla año × viaje (`Nombre`) × total; sin serie mensual.
- [ ] Restauración: tickets por mes, barras apiladas (un segmento = un movimiento), tabla Mes · Total · Tickets.

---

## Task 2: API y tipos

- [ ] Tipos `GastosData`, `GastosSubTab`, payloads por subvista en `types.ts`.
- [ ] `GET /api/dashboard/gastos?subTab=…&filterMode=…&yearFrom=…&yearTo=…`
- [ ] Respuesta acotada a la subpestaña activa (evitar payload enorme).

---

## Task 3: UI — shell y layout

- [ ] `dashboard-gastos.tsx`: layout con **sidebar** (Vistas + Por categoría) + área principal.
- [ ] Filtro período arriba del contenido.
- [ ] Subpestaña activa en estado local (sin recarga).
- [ ] Habilitar pestaña Gastos en `app-shell.tsx`.

---

## Task 4: Subvistas (según spec)

| Subpestaña | Entregable |
|------------|------------|
| Totales / Gastos de vida | KPIs, treemap, ranking k, participación %, tabla mensual |
| Supermercado | Por `Nombre`, treemap coloreado, ranking, línea mensual, movimientos |
| Piso | Igual + tabla gastos mensuales por nombre |
| Viaxes | Tabla año × viaje × total |
| Restauración | Barras apiladas diversificación + tabla tickets |

- [ ] KPI Total apuntado: comparativa YTD centrada, rojo si ↑, verde si ↓.
- [ ] Colores por entidad en treemaps de nombre (no gris por defecto).

---

## Task 5: Verificación

- [ ] Persona + 50 % comunes en totales (tests o comprobación manual con datos de prueba).
- [ ] Filtro período recalcula todas las subvistas.
- [ ] Gastos de vida excluye Viaxes y ReformaPiso.
- [ ] Comparar visualmente con canvas `gastos-v0`.

---

## Fuera de alcance v1

- Desglose por subcategoría dentro de cada viaje (pendiente de definición de datos).
