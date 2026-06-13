# Diseño: Homepage v0 (propuesta)

## Estado
Aprobado (2025-06-13) — shell y dashboard Resumen validados por el usuario.

## Cuándo se muestra
Tras **iniciar sesión** con éxito. Es la pantalla principal de la aplicación.

## Layout propuesto

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]  Finanzas        [🔔 Tareas 3]  [+ Insertar]  [Usuario ▾]│
├─────────────────────────────────────────────────────────────────┤
│  [ Resumen ]  [ Gastos ]  [ Ingresos ]  [ + ]                  │
├─────────────────────────────────────────────────────────────────┤
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│   │ Balance mes  │  │ Gastos mes   │  │ Ingresos mes │         │
│   │   1.240 €    │  │    820 €     │  │   2.060 €    │         │
│   │ ant: 980 €   │  │ ant: 750 €   │  │ ant: 1.730 € │  ← pequeño
│   └──────────────┘  └──────────────┘  └──────────────┘         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Gráfico barras: Ingresos vs Gastos — últimos 12 meses  │  │
│   └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Elementos

### Barra superior (fija)
| Elemento            | Comportamiento                                      |
|---------------------|-----------------------------------------------------|
| Logo / título       | **Finanzas** — identidad de la app; click → dashboard inicial |
| Tareas pendientes   | Badge con número; click → wizard de tareas          |
| Insertar            | Click → formulario inserción manual                 |
| Usuario             | Menú: perfil, cerrar sesión (detalle por definir) |

### Pestañas
- **Resumen**: dashboard inicial (activa por defecto). Contenido: `02-dashboard-resumen.md`.
- **Gastos**, **Ingresos**: dashboards futuros.
- **+**: añadir pestaña/dashboard (comportamiento futuro).

### Área de dashboard
- **Sin título** dentro del contenido (ej. no «Dashboard: Resumen»); la pestaña activa indica la vista.
- Solo widgets y gráficos del dashboard correspondiente.

## Preguntas abiertas
1. UI wizard (campos AutomaticActions).
2. Añadir campos de negocio en NocoDB (`05-automatic-actions.md`).
