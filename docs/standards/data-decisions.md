# Estándar: decisiones de datos

## Principio

**Solo el usuario toma decisiones sobre datos.** Los agentes preguntan, documentan y ejecutan; no asumen.

## Decisiones registradas

### Visibilidad por usuario (2025-06-13)
- Usuarios: **Santi** y **Sandra**. Sin roles ni administradores.
- Cada uno ve sus datos + comunes; no los personales del otro.
- ADR: `0003-users-and-data-visibility.md`

### Campo Persona (2025-06-13)
- **Todas las tablas**: campo **Persona** (`Santi` | `Sandra` | `Común`).
- ADR: `0004-persona-field-and-common-split.md`

### Reparto comunes al 50% (2025-06-13)
- Persona = **Común** → 50% en totales/dashboards, todas las tablas.
- ADR: `0004-persona-field-and-common-split.md`

### Tabla AutomaticActions (2025-06-13)
- Renombra el concepto **PendingActions** → **AutomaticActions**.
- Almacena **todas** las acciones automáticas del pipeline (no solo pendientes).
- Creada en NocoDB base Gastos (`mugm6tw1ail68rq`).
- Modelo completo: `docs/design/05-automatic-actions.md`.
- ADR: `0005-automatic-actions-pipeline.md`

### Idempotencia (2025-06-13)
- Key en `IdempotencyKey`; referencia banco o hash.
- Estados: `pending` | `accepted` | `modified` | `ignored`.
- ADR: `0006-import-idempotency.md`

### Campo Categoría (2025-06-13)
- Gastos: **Status** → **Categoría** (cat. + subcat. en un campo).
- AutomaticActions usa el mismo campo **Categoría**.

### Auth con tabla Users (2025-06-13)
- Tabla **Users** en NocoDB: `Username`, `PasswordHash`, `Persona` (Santi | Sandra).
- Sin roles. Login → sesión con Persona → filtro de datos (ADR-0003).
- Tabla creada: `mwspabgn3fdm9ot`. ADR-0007, `06-auth-users.md`.

### Usuarios iniciales Users (2025-06-13)
- Filas creadas: **Username** `Santi` / `Sandra` (tal cual), **Persona** alineada.
- Contraseña inicial acordada por el usuario; guardada solo como **PasswordHash** (bcrypt, cost 10). No texto plano en BD ni en repo.
- IDs en BD: Santi = 2, Sandra = 3.

### Pendiente
- Mapeo al insertar en Ingresos desde wizard.

## Estado actual en NocoDB

| Tabla              | ID              | Campos negocio        |
|--------------------|-----------------|------------------------|
| Gastos             | myqcksevgehcvlp | Completos              |
| Ingresos           | mrr99jc3e3707n6 | Persona añadida; 547 registros = Santi |
| Users              | mwspabgn3fdm9ot | 2 usuarios (Santi, Sandra); bcrypt en PasswordHash |
| **AutomaticActions** | mugm6tw1ail68rq | Creados |

> Esquema objetivo en `05-automatic-actions.md`. Añadir campos: decisión/implementación del usuario o agente con su OK.
