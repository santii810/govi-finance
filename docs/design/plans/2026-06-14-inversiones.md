# Dashboard Inversión — Plan de implementación

> **Goal:** Tabla Inversiones en NocoDB + pestaña Inversión con dashboard (paridad con Ingresos).

> **Architecture:** Clonar el patrón `ingresos-dashboard.ts` → `inversiones-dashboard.ts`, reutilizar componentes en `components/ingresos/`, API `/api/dashboard/inversiones`, componente `dashboard-inversiones.tsx`, pestaña en `app-shell.tsx`. Importe con signo; agregaciones netas.

> **Spec:** `docs/design/09-dashboard-inversiones.md` · **Canvas:** `inversiones-v0.canvas.tsx`

---

## Archivos a tocar

| Acción | Ruta |
|--------|------|
| Crear tabla NocoDB | API NocoDB (manual o script) — ID → `config.ts` |
| Tipos | `front/src/lib/types.ts` |
| Lógica agregación | `front/src/lib/inversiones-dashboard.ts` (clonar ingresos) |
| Config tablas | `front/src/lib/config.ts` |
| API | `front/src/app/api/dashboard/inversiones/route.ts` |
| UI dashboard | `front/src/components/dashboard-inversiones.tsx` |
| Shell pestaña | `front/src/components/app-shell.tsx` |
| Docs estado | `docs/standards/data-decisions.md` (ID tabla) |

Componentes reutilizados sin cambios: `ingresos/year-filter`, `line-chart`, `horizontal-bar-chart`, `distribution-pie`, `pivot-heatmap`, `month-heatmap`, `metric-card`.

---

## Task 1: Crear tabla Inversiones en NocoDB

- [ ] Crear tabla **Inversiones** en base Gastos con columnas: Entidad, Fecha, Nombre, Importe (Number), Tipo (SingleSelect), Persona (SingleSelect: Santi, Sandra, Común).
- [ ] Opciones iniciales **Tipo**: Fondo indexado, PIAS, Inmobiliario, Crypto (ampliar según datos del usuario).
- [ ] Anotar table ID en `front/src/lib/config.ts` → `TABLES.inversiones`.
- [ ] Actualizar `docs/standards/data-decisions.md` con el ID.

---

## Task 2: Tipos TypeScript

**Modify:** `front/src/lib/types.ts`

- [ ] Añadir `InversionesFilterMode` (= `IngresosFilterMode`).
- [ ] Añadir `InversionesData` con: `byEntidad`, `byTipo`, `byNombre`, `pivot: { entidadKeys, rows }` (misma forma que ingresos pivot).

---

## Task 3: Lógica de dashboard

**Create:** `front/src/lib/inversiones-dashboard.ts`

- [ ] Copiar `ingresos-dashboard.ts` y adaptar:
  - `TABLES.inversiones`
  - Campo importe: `Importe` (puede ser negativo; `attributedAmount` aplica 50 % comunes)
  - Dimensiones: `entidad`, `tipo`, `nombre` desde campos Entidad, Tipo, Nombre
  - `sumByField` para las tres dimensiones
  - Pivot: año × Entidad
- [ ] Exportar `fetchInversiones(...)` con misma firma de filtros que ingresos.

---

## Task 4: API route

**Create:** `front/src/app/api/dashboard/inversiones/route.ts`

- [ ] Clonar `ingresos/route.ts` → llamar `fetchInversiones`.

---

## Task 5: Componente UI

**Create:** `front/src/components/dashboard-inversiones.tsx`

- [ ] Clonar `dashboard-ingresos.tsx`:
  - Fetch `/api/dashboard/inversiones`
  - Tarjetas: «Total neto en período», «Año en curso», «Media mensual neta»
  - Línea anual, barras/tartas Entidad + Tipo + Nombre (tercera fila para Nombre)
  - Pivot + heatmap
  - `tone` adecuado para métricas (neutral o income según diseño visual)

---

## Task 6: Pestaña en shell

**Modify:** `front/src/components/app-shell.tsx`

- [ ] Extender `Tab` con `"inversion"`.
- [ ] Añadir `{ id: "inversion", label: "Inversión" }` en `tabs`.
- [ ] Render `{activeTab === "inversion" && <DashboardInversiones />}`.

---

## Task 7: Verificación

- [ ] `cd front && npm run build` sin errores.
- [ ] Login → pestaña Inversión → datos cargan (vacío o con seed).
- [ ] Filtro de años actualiza tarjetas y gráficos.
- [ ] Registro Común aparece al 50 % para cada usuario.

---

## Fuera de este plan

- Importación masiva de histórico Excel/CSV del usuario.
- Inserción manual (+ Insertar) — spec `04-manual-insert.md`, aún no implementada en front.
- Wizard / ImportRules hacia Inversiones.
