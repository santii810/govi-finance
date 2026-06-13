# Estándar: interacciones en la web

## Principio
La web debe sentirse **fluida**: las acciones del usuario actualizan la interfaz **sin recargar la página completa**.

## Requisito (decisión del usuario, 2025-06-13)
- Procesamiento **en cliente** (JS): peticiones a backend/API y actualización del DOM/estado local.
- **No** usar recarga completa (`location.reload`, navegación tradicional) como mecanismo habitual tras:
  - Aceptar / ignorar / editar / deshacer en el wizard
  - Actualizar badge de tareas pendientes
  - Inserción manual (+ Insertar)
  - Cambiar de pestaña de dashboard (cuando haya datos dinámicos)

## Wizard — requisitos UX adicionales
- Lista con acciones rápidas por fila: **Aceptar**, **Ignorar**, **Editar** (todos los campos).
- **Deshacer** tras aceptar/ignorar para prevenir missclicks.

## Nota para agentes
- El usuario **no** elige stack de front; este estándar describe **comportamiento**, no framework.
- Detalle del wizard: `docs/design/03-wizard-automatic-actions.md`.
