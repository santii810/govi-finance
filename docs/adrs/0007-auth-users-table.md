# ADR-0007: Autenticación con tabla Users

## Estado
Aceptado (2025-06-13)

## Contexto
La app **Finanzas** necesita login para **Santi** y **Sandra**, sin roles ni administradores. Tras login, cada uno ve sus datos y los comunes (ADR-0003).

## Decisión
Autenticación **muy sencilla** con tabla **Users** en NocoDB (misma base Gastos).

### Tabla Users — campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Username | Texto (único) | Identificador de login |
| PasswordHash | Texto | Hash de contraseña (nunca texto plano) |
| Persona | Select | `Santi` \| `Sandra` — enlaza con filtro de datos |

### Flujo de login
1. Usuario envía username + password.
2. La app busca fila en **Users**, verifica hash.
3. Crea sesión con **Persona** asociada.
4. Todos los dashboards y filtros usan esa Persona (+ Común al 50%).

### Lo que NO hay
- Roles, permisos granulares, panel de administración.
- OAuth, registro público, recuperación de contraseña (fase inicial).

### Infraestructura
- Servicio web (Docker) consulta Users vía API NocoDB o capa propia.
- Contraseñas: hash con algoritmo estándar (bcrypt/argon2) en implementación.

## Consecuencias
- Cambiar contraseña = editar fila en Users (o pantalla futura).
- Añadir usuario = nueva fila (cuando el usuario lo decida).
- NocoDB panel auth ≠ auth de Finanzas (separados).

## Referencias
- `docs/design/06-auth-users.md`
- ADR-0003
