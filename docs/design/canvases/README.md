# Canvas de diseño — Finanzas

Maquetas visuales interactivas (Cursor Canvas) de las pantallas acordadas.

## Cómo verlos en Cursor

1. Abre el fichero `.canvas.tsx` en el editor.
2. Cursor lo renderiza al **lado del chat** como vista previa en vivo.

Los canvas que Cursor detecta automáticamente viven también en:

`~/.cursor/projects/home-santi-dockerPortatil-nocodb/canvases/`

**Copia de referencia en el repo** (esta carpeta): versionada en git para consultarlas siempre.

| Canvas | Spec | Descripción |
|--------|------|-------------|
| `homepage-v0.canvas.tsx` | `01-homepage.md`, `02-dashboard-resumen.md` | Shell + pestaña Resumen |
| `ingresos-v0.canvas.tsx` | `08-dashboard-ingresos.md` | Pestaña Ingresos + filtro de años |
| `inversiones-v0.canvas.tsx` | `09-dashboard-inversiones.md` | Pestaña Inversión + filtro de años |
| `gastos-v0.canvas.tsx` | `11-dashboard-gastos.md` ✓ | Pestaña Gastos + subpestañas laterales |

> Los `.canvas.tsx` usan `cursor/canvas` (SDK de Cursor). Solo funcionan como preview interactiva dentro de Cursor, no en la web Finanzas.
