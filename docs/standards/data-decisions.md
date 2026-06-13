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

### Pipeline bancario — catálogos (2025-06-13)
- **Cuentas:** YAML en `worker/config/accounts.yaml`. Un export = una cuenta.
- **Reglas (ImportRules):** tabla en NocoDB; **las aplica la web** al abrir el wizard, no el bot/worker.
- Prioridad: reglas de cuenta > globales.
- Regla global inicial sugerida en NocoDB: positivo = Ingresos, negativo = Gastos.
- **Confirmación obligatoria** en bot antes de insertar en AutomaticActions.
- Primera cuenta: `trade-republic-santi` (Trade Republic, personal, Santi).
- Diseño: `docs/design/07-bank-import-worker.md`

### Bot Telegram (2025-06-13)
- Servicio Docker `bot` (`worker/`, imagen `nocodb-bot`).
- Flujo: CSV → preview → confirmación → insert AutomaticActions.
- Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USER_IDS`, `NOCODB_*`.
- No aplica ImportRules al insertar.

### ImportRules (2025-06-13)
- Tabla **ImportRules** creada en NocoDB (`mo7uf7o396lxp59`).
- Reglas de clasificación; las aplica la **web** al abrir el wizard.
- Modelo: `docs/design/08-import-rules.md`.
- Seed: 2 reglas globales (signo → Ingresos / Gastos, prioridad 0).

### AutomaticActions — Metadatos (2025-06-13)
- Campo **Metadatos** (JSON) añadido en NocoDB (`c7sy9p6eb0fd60f`).
- Worker inserta datos ricos del parseo + `account_id`.
- **TablaDestino** ya no es obligatorio al insertar (lo rellena la web vía ImportRules).
- **Categoría** y **TablaDestino**: propuesta de la web, vacíos al importar.

## Estado actual en NocoDB

| Tabla              | ID              | Campos negocio        |
|--------------------|-----------------|------------------------|
| Gastos             | myqcksevgehcvlp | Completos              |
| Ingresos           | mrr99jc3e3707n6 | Persona añadida; 547 registros = Santi |
| Users              | mwspabgn3fdm9ot | 2 usuarios (Santi, Sandra); bcrypt en PasswordHash |
| **AutomaticActions** | mugm6tw1ail68rq | Completos + **Metadatos** (JSON) |
| **ImportRules**      | mo7uf7o396lxp59 | 7 campos; 2 reglas globales seed |

> Esquema objetivo en `05-automatic-actions.md`. Añadir campos: decisión/implementación del usuario o agente con su OK.
