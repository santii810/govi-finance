# AGENTS — Proyecto Gastos Web

> Documento maestro para agentes de IA que trabajen en este repositorio.
> Se actualiza en cada iteración de diseño. **No implementar funcionalidades sin planning aprobado.**

## Contexto del proyecto

Aplicación web personal de gestión financiera (**marca: Finanzas**), apoyada en NocoDB (base **Gastos**).
El repositorio está organizado en:

| Carpeta   | Propósito                                      |
|-----------|------------------------------------------------|
| `infra/`  | Docker Compose: NocoDB + PostgreSQL            |
| `front/`  | Aplicación web (por diseñar)                   |
| `backend/`| Reservado; posiblemente no necesario           |

## Reglas de colaboración con el usuario

### Datos — decisión exclusiva del usuario
- **Nunca asumir** esquemas, tablas, relaciones, permisos de datos ni flujos de almacenamiento.
- **Siempre preguntar** antes de proponer cambios en el modelo de datos.
- Las decisiones de datos se documentan en `docs/adrs/` y `docs/standards/data-decisions.md`.

### Tecnología de front — irrelevante para el usuario
- El usuario **no conoce ni le interesa** el stack de front.
- No discutir frameworks, librerías ni arquitectura de front salvo que el usuario lo pida.
- El agente elige la tecnología; el usuario aporta **gustos visuales y de UX**.

### Infraestructura — innegociable
- **Todo servicio se levanta con Docker** (ver ADR-0001).
- El compose raíz incluye `infra/docker-compose.yml`.

### Fase actual
**Planning cerrado** (2025-06-13). Implementación **pausada** hasta que el usuario retome una fase.
Ver `docs/design/planning.md` para resumen y fases sugeridas.

## Funcionalidad acordada

### Autenticación y acceso
- **Dos usuarios**: Santi y Sandra, cada uno con su cuenta.
- **Sin roles ni administradores** — mismas capacidades para ambos dentro de su ámbito.
- Login vía tabla **Users** en NocoDB (Username, PasswordHash, Persona). ADR-0007, `06-auth-users.md`.
- Tras iniciar sesión → **homepage** con dashboard inicial; sesión lleva **Persona** para filtrar datos.

### Modelo de datos
- Campo **Persona** (Santi | Sandra | Común) en **todas** las tablas, actuales y futuras.
- Registros **Común**: **50%** de atribución por usuario en totales/dashboards, en **todas** las tablas (importe real en BD).
- Tabla **AutomaticActions**: todas las acciones automáticas del pipeline (badge filtra `Estado = pending`). Modelo: `05-automatic-actions.md`.
- Campo **Categoría** único (ex-Status en Gastos); AutomaticActions usa el mismo campo.

### Navegación
- **Sistema de pestañas** para navegar entre distintos dashboards.
- Los dashboards se irán añadiendo de forma incremental.

### Acciones globales (siempre visibles)
| Acción              | Comportamiento                                      |
|---------------------|-----------------------------------------------------|
| Tareas pendientes   | Badge = **AutomaticActions** con `Estado = pending` → lista ágil. `03-wizard-automatic-actions.md` |
| Inserción manual    | **+ Insertar** → desplegable de tablas → formulario según tabla (Gastos, Ingresos, futuras). `04-manual-insert.md` |

### Pipeline bancario (acordado en conversación)
- Bot (Telegram o similar) recibe exports de **N bancos**.
- **Worker** → inserta en **AutomaticActions** (NocoDB, tabla `mugm6tw1ail68rq`).
- Idempotencia (ADR-0006): `IdempotencyKey` solo en AutomaticActions.
- Web: lista ágil + deshacer, sin recargas. ADR-0005, `03-wizard-automatic-actions.md`.

### Homepage y dashboard

### Dashboard Resumen (acordado)
- Tres tarjetas: **Balance**, **Gastos**, **Ingresos** del mes en curso.
- En cada una, texto pequeño con el valor del **mes anterior**.
- Cálculos con reglas Persona + 50% comunes (ADR-0004).
- Zona inferior: **gráfico de barras** ingresos vs gastos, **últimos 12 meses**.
- Canvas: `homepage-v0`. Specs: `01-homepage.md`, `02-dashboard-resumen.md`.

## Documentación del harness

| Recurso                              | Uso                                           |
|--------------------------------------|-----------------------------------------------|
| `docs/design/`                       | Especificaciones de pantallas y flujos        |
| `docs/adrs/`                         | Architecture Decision Records                 |
| `docs/standards/`                    | Estándares, proceso, UX (`ux-interactions.md`) |
| `.cursor/skills/gastos-web-design/`  | Skill de diseño para agentes                  |
| `.cursor/rules/`                     | Reglas Cursor persistentes                    |

## Estado del planning

- [x] Reestructuración repo (`infra/`, `front/`)
- [x] Verificación NocoDB tras reinicio
- [x] Harness de diseño inicial
- [x] Definición de usuarios y acceso (ADR-0003)
- [x] Dashboard Resumen — gráfico anual ingresos/gastos (`02-dashboard-resumen.md`)
- [x] Inserción manual — desplegable + formulario (`04-manual-insert.md`)
- [x] Diseño homepage aprobado — shell + dashboard Resumen (`01-homepage.md`, `02-dashboard-resumen.md`)
- [x] Tabla AutomaticActions — modelo definido (`05-automatic-actions.md`)
- [x] Wizard UX (`03-wizard-automatic-actions.md`)
- [x] **Planning cerrado** (2025-06-13) — ver `docs/design/planning.md`

## Retomar implementación

Elegir fase en `planning.md` → generar plan de implementación → codificar.
Esquema NocoDB: añadir campos a AutomaticActions (`05-automatic-actions.md`), Persona en Ingresos, etc.
