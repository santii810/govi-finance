# Diseño: Autenticación — tabla Users

## Estado
Aceptado (2025-06-13)

## Tabla Users (NocoDB)

**Table ID:** `mwspabgn3fdm9ot`

| Campo | Tipo NocoDB | Obligatorio | Único | Uso |
|-------|-------------|-------------|-------|-----|
| Username | SingleLineText | Sí | Sí | Login |
| PasswordHash | SingleLineText | Sí | No | Solo hash; nunca contraseña en claro |
| Persona | SingleSelect | Sí | No | `Santi` \| `Sandra` (cuentas de login; sin Común) |

## Usuarios iniciales

| Username | Persona | Notas |
|----------|---------|-------|
| *(por definir)* | Santi | Contraseña la fija el usuario al crear la fila |
| *(por definir)* | Sandra | Idem |

> Los nombres de login y contraseñas iniciales: **decisión del usuario** (no asumir).

## Tras login
- Sesión guarda `persona` (Santi o Sandra).
- Consultas a Gastos, Ingresos, etc.: filtro Persona = suyo OR Común.
- Común al 50% en agregaciones (ADR-0004).

## Fuera de alcance (v1)
- Cambio de contraseña desde la UI.
- Recuperación de contraseña.
- Tercer usuario.

## Referencias
- ADR-0007
