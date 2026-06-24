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
- En **AutomaticActions** no hay columna Categoría: la propuesta se calcula en memoria en el wizard.

### Auth con tabla Users (2025-06-13)
- Tabla **Users** en NocoDB: `Username`, `PasswordHash`, `Persona` (Santi | Sandra).
- Sin roles. Login → sesión con Persona → filtro de datos (ADR-0003).
- Tabla creada: `mwspabgn3fdm9ot`. ADR-0007, `06-auth-users.md`.

### Usuarios iniciales Users (2025-06-13)
- Filas creadas: **Username** `Santi` / `Sandra` (tal cual), **Persona** alineada.
- Contraseña inicial acordada por el usuario; guardada solo como **PasswordHash** (bcrypt, cost 10). No texto plano en BD ni en repo.
- IDs en BD: Santi = 2, Sandra = 3.

### Tabla Inversiones (2026-06-14)
- Nueva tabla **Inversiones** en NocoDB base Gastos.
- Flujos de dinero: aportaciones (+) y retiros (−) hacia/desde inversiones.
- Campos: **Entidad**, **Fecha**, **Nombre**, **Importe** (signo = dirección), **Tipo** (Fondo indexado, PIAS, Inmobiliario, Crypto…), **Persona**.
- Renombrado acordado: campo histórico «Aportado» → **Importe**.
- Dashboard: `docs/design/09-dashboard-inversiones.md`.
- ID NocoDB: **mwnd0d416iwzwv6** (creada 2026-06-14).

### Tabla Patrimonio (2026-06-15)
- Nueva tabla **Patrimonio** en NocoDB base Gastos.
- Snapshots de valor por entidad/tipo (dashboard `patrimonio-v0`).
- Campos: **Entidad**, **Fecha**, **Nombre**, **Valor** (+ activo / − deuda), **Tipo**, **Persona**.
- ID NocoDB: **mimdsus64el2tnl** (creada 2026-06-15).
- Dashboard: `docs/design/10-dashboard-patrimonio.md`.
- Importación histórica: hoja `Patrimonio` del Excel vía `import-excel`.

### Migración Excel (2026-06-15)
- Herramienta: `python -m worker import-excel Finanzas.xlsx` (`worker/`).
- Hojas: `GastosExport`, `Ingresos`, `Inversión`, `Patrimonio`.
- Spec: `docs/design/10-excel-migration.md`.
- Ingresos ya cargados (547 = Santi). Gastos/Inversión/Patrimonio vía CLI.

### GastosComún.xlsx (2026-06-20)
- Herramienta: `python -m worker import-gastos-comun GastosComún.xlsx` (`worker/`).
- Hoja: `Gastos Común`. Siempre `Persona = Común`. No borra registros existentes.
- **Ubicación** (texto) en Gastos: viaje (`UbicaciónViaxe`) solo para categorías Viaxes.
- **Categoría** compuesta con `_`:
  - ReformaPiso → `ReformaPiso_{CategoríaReforma}`
  - Viaxes → `Viaxes_{Categoría2Viaxe}_{CategoríaViaxe}` (doble nivel; omite el segundo segmento si repite ubicación o el primer nivel)

### Pendiente
- Mapeo al insertar en Ingresos desde wizard.
- Importar datos históricos del usuario en Inversiones.

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

### ImportRules — extensiones (2026-06-15)
- Condición **`concepto_exacto`**: match literal del concepto (trim + case-insensitive).
- Destino **`Inversiones`** en `tabla_destino`; acciones `tipo`, `nombre`, `entidad` (opcional).
- Prioridad **500** para reglas de nombre exacto (prevalecen sobre signo global).
- Pantalla **Gestionar reglas** dentro de pestaña Tareas (`12-reglas-clasificacion.md`).
- Seed acordado: VANGUARD US 500 → SP500, AMUNDI MSCI EM → MSCI EM (Tipo: `Fondo indexado`).
- Seed insertado en NocoDB (2026-06-15): IDs **5** y **6**.

### ImportRules — Persona (2026-06-21)
- Campo **Persona** (`Santi` | `Sandra`) añadido a tabla ImportRules — **obligatorio**, sin valor Común.
- Visibilidad: cada usuario ve **solo sus reglas**; no las del otro usuario.
- Al crear regla desde la web: `Persona` = usuario logueado (campo no expuesto en UI).
- Registros existentes (14) migrados a **Santi** (creados por Santi).
- Motor de clasificación y listado UI filtran con `(Persona,eq,{usuario})`.
- Confirmado (2026-06-21): no hay reglas Común; cada persona escribe las suyas. Campo obligatorio en NocoDB, no expuesto en UI.

### ImportRules — invertir importe (2026-06-21)
- Clave **`invertir_importe`** (bool) dentro del JSON **Acciones** — no requiere columna nueva en NocoDB.
- Al aplicar la regla, el importe clasificado se multiplica por −1 (wizard, aceptar/modificar tarea).
- Caso de uso: MyInvestor registra aportaciones a fondos como gastos (importe negativo); reglas hacia **Inversiones** con `invertir_importe: true` convierten el signo antes del insert.
- UI: checkbox «Invertir cantidad» en formulario de reglas (`12-reglas-clasificacion.md`).

### AutomaticActions — Metadatos (2025-06-13)
- Campo **Metadatos** (JSON) añadido en NocoDB (`c7sy9p6eb0fd60f`).
- Worker inserta datos ricos del parseo + `account_id`.
- **Clasificación en memoria:** la web aplica ImportRules al abrir el wizard; no hay columnas `TablaDestino` ni `Categoría` en AutomaticActions (eliminadas 2025-06-13).

## Estado actual en NocoDB

| Tabla              | ID              | Campos negocio        |
|--------------------|-----------------|------------------------|
| Gastos             | myqcksevgehcvlp | Completos              |
| Ingresos           | mrr99jc3e3707n6 | Persona añadida; 547 registros = Santi |
| Users              | mwspabgn3fdm9ot | 2 usuarios (Santi, Sandra); bcrypt en PasswordHash |
| **AutomaticActions** | mugm6tw1ail68rq | IdempotencyKey, Estado, Fecha, Importe, Concepto, Banco, Persona, **Metadatos** |
| **ImportRules**      | mo7uf7o396lxp59 | Nombre, Persona, Activa, Alcance, Cuenta, Prioridad, Condición, Acciones |
| **Inversiones**      | mwnd0d416iwzwv6 | Entidad, Fecha, Nombre, Importe, Tipo, Persona |
| **Patrimonio**       | mimdsus64el2tnl | Entidad, Fecha, Nombre, Valor, Tipo, Persona |

> Esquema objetivo en `05-automatic-actions.md`. Añadir campos: decisión/implementación del usuario o agente con su OK.
