# Estándar: proceso de diseño

## Objetivo

Iterar en conversación hasta tener un **planning aprobado** antes de escribir código de funcionalidad.

## Ciclo de iteración

1. **Explorar** — el agente resume lo acordado y detecta huecos.
2. **Preguntar** — una pregunta a la vez; en datos, solo el usuario decide.
3. **Documentar** — cada acuerdo va a `AGENTS.md`, ADR, estándar o spec de diseño.
4. **Proponer** — wireframes o canvas cuando ayude (sin implementar).
5. **Validar** — el usuario aprueba o corrige antes de seguir.

## Qué documentar dónde

| Tipo de decisión        | Destino                              |
|-------------------------|--------------------------------------|
| Reglas para agentes     | `AGENTS.md`                          |
| Decisiones arquitectura | `docs/adrs/NNNN-titulo.md`           |
| Reglas de datos         | `docs/standards/data-decisions.md`   |
| Pantallas y flujos UX   | `docs/design/NN-nombre.md`           |
| Proceso y convenciones  | `docs/standards/`                    |
| Contexto para el agente | `.cursor/skills/gastos-web-design/`  |

## Prohibido en fase de diseño

- Implementar funcionalidades concretas en `front/`.
- Asumir cambios en tablas o esquema NocoDB sin aprobación del usuario.
- Discutir stack de front con el usuario salvo petición explícita.
- Levantar servicios fuera de Docker.
