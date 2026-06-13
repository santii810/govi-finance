# ADR-0003: Usuarios y visibilidad de datos

## Estado
Aceptado (2025-06-13)

## Contexto
La web necesita autenticación y que cada persona vea solo lo que le corresponde.

## Decisión

### Usuarios
- **Dos usuarios**: Santi y Sandra.
- Cada uno tiene su propia cuenta / sesión.

### Visibilidad
- Cada usuario ve **sus datos personales** y los **datos comunes**.
- No ve los datos personales del otro usuario.

### Lo que NO hay
- **Sin roles** (admin, editor, lector, etc.).
- **Sin administradores**.
- Todos los usuarios tienen las mismas capacidades dentro de su ámbito de visibilidad.

## Consecuencias
- El control de acceso se basa en **identidad de usuario + filtro por campo Persona**, no en roles.
- No se necesita panel de administración de usuarios/roles.
- Campo Persona y reparto 50% gastos: ver ADR-0004.
