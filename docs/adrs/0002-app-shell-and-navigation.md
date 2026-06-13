# ADR-0002: App shell — pestañas, tareas y inserción manual

## Estado
Aceptado (2025-06-13)

## Contexto
La web necesita una estructura de navegación clara, extensible y con acciones globales siempre accesibles.

## Decisión propuesta

### Shell de aplicación (post-login)
1. **Barra superior** con identidad de usuario, botón de tareas pendientes (con badge) y botón de inserción manual.
2. **Barra de pestañas** bajo la superior: cada pestaña = un dashboard distinto. Se añaden incrementalmente.
3. **Área principal**: contenido del dashboard activo.

### Acciones globales
- **Tareas pendientes**: notificación → navega a wizard guiado (definición pendiente).
- **Inserción manual**: abre flujo de alta manual de registros (tabla/campos por definir con el usuario).

### Dashboard inicial
- Primera pestaña activa al entrar.
- Contenido concreto por definir en iteraciones posteriores.

## Consecuencias
- Los dashboards futuros son pestañas nuevas sin rediseñar el shell.
- Wizard e inserción manual son flujos separados del dashboard.

## Pendiente
- Aprobación visual del homepage (ver `docs/design/01-homepage.md`).
- Definición de usuarios/roles (ADR separado).
