---
name: gastos-web-design
description: >-
  Skill para diseñar la web Gastos en fase de planning. Usar al hablar de UX,
  homepage, dashboards, wizard, usuarios o documentación del harness. No
  implementar funcionalidades hasta planning aprobado.
---

# Gastos Web — Skill de diseño

## Cuándo usar
- Iteraciones de diseño con el usuario.
- Actualizar `AGENTS.md`, ADRs, estándares o specs en `docs/design/`.
- Proponer wireframes (canvas o markdown), nunca código de funcionalidad.

## Reglas inquebrantables

1. **Datos**: solo el usuario decide. Preguntar siempre; documentar en `docs/standards/data-decisions.md`.
2. **Front**: no hablar de tecnología con el usuario salvo que lo pida.
3. **Docker**: cualquier servicio nuevo va en compose.
4. **Fase**: diseño → planning aprobado → implementación.

## Funcionalidad acordada (resumen)
- Login: Santi y Sandra (sin roles ni admins).
- Campo Persona (Santi/Sandra/Común) en todas las tablas.
- Gastos comunes al 50% por usuario en totales/dashboards.
- **Todos** los comunes (cualquier tabla) al 50% para cada usuario.
- Homepage = dashboard inicial tras login.
- Pestañas para múltiples dashboards (incrementales).
- Botón tareas: lista sobre **AutomaticActions** (`Estado = pending`).
- Botón **+ Insertar**: desplegable de tablas → formulario según tabla (Gastos, Ingresos, futuras).

## Archivos clave
- `AGENTS.md` — contexto maestro para agentes.
- `docs/adrs/` — decisiones de arquitectura.
- `docs/design/` — pantallas y flujos.
- `docs/standards/` — proceso y datos.

## Flujo de trabajo
1. Leer `AGENTS.md` y estado del planning.
2. Una pregunta a la vez al usuario.
3. Tras cada acuerdo, actualizar documentación.
4. Proponer visual si ayuda; pedir aprobación.
