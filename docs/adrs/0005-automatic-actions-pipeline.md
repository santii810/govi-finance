# ADR-0005: Pipeline de importación bancaria y AutomaticActions

## Estado
Aceptado (2025-06-13)

## Contexto
Los movimientos bancarios llegan como exports de **N bancos**, cada uno con formato distinto. El usuario quiere revisarlos antes de que pasen a las tablas definitivas (Gastos, Ingresos, etc.).

## Decisión de arquitectura

### Flujo general

```
Usuario ──(export banco)──► Bot Telegram (o similar)
                                │
                                ▼
                           Worker
                     (parsea, unifica, clasifica,
                      recomienda — toda la lógica aquí)
                                │
                                ▼
                      Tabla AutomaticActions
                      (Estado: pending, accepted, …)
                                │
              badge cuenta pending ◄── Web
                                │
                         Wizard (web)
                    aceptar / ignorar / modificar
                                │
                    aceptar o modificar ──► tabla destino
                    ignorar ──► Estado=ignored (sin insertar)
```

### Responsabilidades

| Componente        | Responsabilidad                                              |
|-------------------|--------------------------------------------------------------|
| Bot (Telegram…)   | Recibir exports del usuario (uno o N bancos)                 |
| Worker            | Parseo, unificación, clasificación, recomendación → insert en AutomaticActions |
| AutomaticActions  | **Todas** las acciones automáticas (historial + cola de revisión) |
| Web — badge       | Contar filas con `Estado = pending`                          |
| Web — wizard      | Lista ágil: aceptar, ignorar, editar, deshacer               |
| Web — alta final  | Aceptar o modificar → insert en **TablaDestino**             |

### Principios
- Toda la lógica de parseo/clasificación vive en el **worker**.
- Cada banco tiene su parser; salida unificada hacia AutomaticActions.
- La web presenta, cuenta y ejecuta la decisión del usuario.
- Idempotencia: ADR-0006.

### Almacenamiento
- Tabla **AutomaticActions** en NocoDB base Gastos (`mugm6tw1ail68rq`).
- Modelo de datos: `docs/design/05-automatic-actions.md`.

### Infraestructura
- Bot, worker: **Docker** (ADR-0001).

## Pendiente
- Canal exacto: Telegram u otra alternativa.
- Añadir campos de negocio en NocoDB (tabla creada vacía).
- Parsers por banco.

## Consecuencias
- AutomaticActions conserva historial completo (no solo pendientes).
- Badge y wizard filtran por `Estado = pending`.

## Referencias
- `03-wizard-automatic-actions.md`
- ADR-0006
