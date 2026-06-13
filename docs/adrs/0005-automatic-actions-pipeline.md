# ADR-0005: Pipeline de importación bancaria y AutomaticActions

## Estado
Aceptado (2025-06-13). Actualizado: ImportRules en web, Metadatos (2025-06-13).

## Contexto
Los movimientos bancarios llegan como exports de **N bancos**, cada uno con formato distinto. El usuario quiere revisarlos antes de que pasen a las tablas definitivas (Gastos, Ingresos, etc.).

## Decisión de arquitectura

### Flujo general

```
Usuario ──(export banco)──► Bot Telegram (o similar)
                                │
                                ▼ confirmar origen
                           Worker
                     (parsea, detecta cuenta,
                      Metadatos, idempotencia)
                                │
                                ▼
                      Tabla AutomaticActions
                      (Estado: pending, Metadatos, …)
                                │
              badge cuenta pending ◄── Web
                                │
                         Wizard (web)
              ImportRules → propuesta clasificación
                    aceptar / ignorar / modificar
                                │
                    aceptar o modificar ──► tabla destino
                    ignorar ──► Estado=ignored (sin insertar)
```

### Responsabilidades

| Componente        | Responsabilidad                                              |
|-------------------|--------------------------------------------------------------|
| Bot (Telegram…)   | Recibir exports; confirmar **origen** (banco, cuenta, fechas) |
| Worker            | Parseo, cuenta (YAML), Metadatos, idempotencia → insert pending |
| AutomaticActions  | **Todas** las acciones automáticas (historial + cola de revisión) |
| Web — ImportRules | Clasificación al mostrar wizard; reglas en NocoDB, evolucionan con el uso |
| Web — badge       | Contar filas con `Estado = pending`                          |
| Web — wizard      | Lista ágil: aceptar, ignorar, editar, deshacer               |
| Web — alta final  | Aceptar o modificar → insert en **TablaDestino**             |

### Principios
- **Parseo y origen** en worker/bot; **clasificación (ImportRules)** en la web.
- Cada banco tiene su parser; salida unificada hacia AutomaticActions con **Metadatos** JSON.
- ImportRules: cuenta > global; recalculables al cambiar reglas (solo pending).
- Idempotencia: ADR-0006.

### Almacenamiento
- Tabla **AutomaticActions** en NocoDB base Gastos (`mugm6tw1ail68rq`).
- Campo **Metadatos** (JSON): datos del banco + `account_id`.
- Modelo: `docs/design/05-automatic-actions.md`.

### Infraestructura
- Bot, worker: **Docker** (ADR-0001).

## Pendiente
- Canal exacto: Telegram u otra alternativa.
- Parsers por banco.
- Confirmación pre-insert en bot (ver `07-bank-import-worker.md`).

## Consecuencias
- AutomaticActions conserva historial completo (no solo pendientes).
- Badge y wizard filtran por `Estado = pending`.
- Reglas mejoran con el uso sin reimportar ficheros.

## Referencias
- `03-wizard-automatic-actions.md`
- `07-bank-import-worker.md`
- `08-import-rules.md`
- ADR-0006
