# Planning — Finanzas Web

## Estado
**Cerrado** (2025-06-13). Actualizado: tabla **AutomaticActions** creada en NocoDB.

---

## Checklist

| # | Tema | Estado | Documento |
|---|------|--------|-----------|
| 6 | Wizard AutomaticActions | Aprobado | `03-wizard-automatic-actions.md` |
| 8 | Modelo AutomaticActions | **Definido** | `05-automatic-actions.md` |
| 9 | Dashboard Inversión | **Aprobado** | `09-dashboard-inversiones.md` |
| 10 | Dashboard Patrimonio | **Aprobado** | `10-dashboard-patrimonio.md` |
| 11 | Dashboard Gastos | **Aprobado** | `11-dashboard-gastos.md` |
| 12 | Reglas clasificación | **Aprobado** | `12-reglas-clasificacion.md` |

---

## AutomaticActions (actualización)

- Tabla creada en NocoDB: **AutomaticActions** (`mugm6tw1ail68rq`).
- Sustituye el nombre conceptual **PendingActions**.
- Guarda **todas** las acciones automáticas; badge/wizard filtran `Estado = pending`.
- Campos de negocio: **por añadir en NocoDB** según `05-automatic-actions.md`.

---

## Fases de implementación

1. Front mínimo — auth, shell, Resumen
2. **AutomaticActions** — campos en NocoDB + wizard
3. Inserción manual
4. Worker + bot
5. Más dashboards — **Gastos** listo (`11-dashboard-gastos.md`, plan `plans/2026-06-15-dashboard-gastos.md`)
