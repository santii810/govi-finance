# Estándar: decisiones de datos

## Principio

**Solo el usuario toma decisiones sobre datos.** Los agentes preguntan, documentan y ejecutan; no asumen.

## Decisiones registradas

### Visibilidad por usuario (2025-06-13)
- Usuarios: **Santi** y **Sandra**. Sin roles ni administradores.
- Cada uno ve sus datos + comunes; no los personales del otro.
- ADR: `0003-users-and-data-visibility.md`

### Campo created_at (2026-06-25)
- **Todas las tablas** de la base Gastos tienen marca de creación automática.
- En PostgreSQL la columna se llama **`created_at`**; en la API de NocoDB aparece como **`CreatedAt`** (tipo sistema `CreatedTime`, solo lectura).
- NocoDB la rellena al insertar; no hace falta enviarla desde web, worker ni imports.
- No se puede renombrar a `created_at` en la UI/API (campo sistema).

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
  - **Excepción Hotel (2026-07-18):** siempre `Viaxes_Hotel` (sin ciudad en Categoría; la ciudad/viaje va en **Ubicación**).

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
- Condición **`concepto_exacto`**: match literal del concepto (trim + case-insensitive); admite **string o array** de strings.
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

### ImportRules — reglas comunes (2026-07-06)
- Campo **Persona** admite también **Común**: reglas visibles y aplicables para Santi y Sandra.
- Al crear/editar regla: selector **Personal (solo yo)** | **Común (ambos)** en la UI de Tareas → Gestionar reglas.
- Cualquier usuario puede crear, editar y eliminar reglas Común; no puede crear reglas de la otra persona.
- Motor y listado filtran con `(Persona,in,{usuario},Común)`.

### ImportRules — invertir importe (2026-06-21)
- Clave **`invertir_importe`** (bool) dentro del JSON **Acciones** — no requiere columna nueva en NocoDB.
- Al aplicar la regla, el importe clasificado se multiplica por −1 (wizard, aceptar/modificar tarea).
- Caso de uso: MyInvestor registra aportaciones a fondos como gastos (importe negativo); reglas hacia **Inversiones** con `invertir_importe: true` convierten el signo antes del insert.
- UI: checkbox «Invertir cantidad» en formulario de reglas (`12-reglas-clasificacion.md`).

### ImportRules — supermercados y alias Eroski (2026-06-24)
- Reglas de supermercado (Santi): condición `concepto_contiene` + categoría **Supermercado**; nombre `Supermercado {cadena}`.
- Cadenas: Lidl, Carrefour, Mercadona, Froiz, Gadis, Eroski, Aldi, **Primaprix**, **Multipernas** (destino **A de pernas**), **Continente**, **Pingo Doce**.
- Al aceptar, **Gastos.Destino** = nombre de la cadena (p. ej. `Lidl`), no el concepto bancario completo (`Acciones.destino` o inferido del match).
- **Hipermercado A Barca** se trata como **Eroski** (misma regla `Supermercado Eroski`, regex `(Eroski|Hipermercado A Barca)`, `destino: Eroski`).

### ImportRules — MSCI EM alias IE AC EUR (2026-06-25)
- Regla **Exacto — AMUNDI MSCI EM → MSCI EM** (Santi, id 48): `concepto_regex` `(AMUNDI INDEX MSCI EMERG MKTS I|INDEX MSCI EM IE AC EUR @ [\d.,]+)` — el precio tras `@` puede variar (p. ej. `@ 0.13`).

### ImportRules — SP500 alias EUR INV (2026-06-25)
- Regla **Exacto — VANGUARD US 500 → SP500** (Santi, id 47): `concepto_exacto` array con `VANGUARD US 500 STOCK INDEX EU` y `VANGUARD US 500 STOCK EUR INV`.
- **Transferir — Transferencia de …** (Revolut) → ignorar (`concepto_contiene`, transferencia interna).
- **Bar O Paisanino / Paisanino** → Gastos **Restauración**, destino **O Paisaniño** (regex).
- **Chichalovers** → Gastos **Restauración**, destino **Chichalovers** (`concepto_contiene`).
- **Audasa** → Gastos categoría **Transporte_Peaje**, destino **Peaje** (`concepto_contiene`, case-insensitive).
- **Ballenoil** / **Repsol** → Gastos categoría **Transporte_Combustible**, destino **gasolina** (`concepto_contiene`).
- **Daruma Sushi** → Gastos **Restauración**, destino **Daruma Sushi** (`concepto_contiene`).
- **McDonald's** → Gastos **Restauración**, destino **McDonald's** (regex `McDonald'?s?`).
- **Glovo** → Gastos **Restauración**, destino **Glovo** (`concepto_contiene`).
- **Dacosta Bar** → Gastos **Restauración**, destino **Dacosta Bar** (`concepto_contiene`).
- **PASAJE DEL CAMINO** → Gastos **Restauración**, destino **PASAJE DEL CAMINO** (`concepto_contiene`, id **79**).
- **Google One** → Gastos **Suscripcións**, destino **Google One** (`concepto_contiene`, id **94**, 2026-07-18).

### ImportRules — dividendos Trade Republic (2026-06-25)
- Dividendos TR → **Ingresos**, categoría **Inversión**, origen **Dividendos**, **Notas** = emisor (clave `notas` en Acciones).
- **Cash Dividend for ISIN DK0062498333** (Novo Nordisk B) → Notas **Novo Nordisk (B)** (Santi, id **80**, cuenta `trade-republic-santi`).
- **Cash Dividend for ISIN US8740391003** (TSMC) → Notas **TSMC** (Santi, id **81**).
- **Cash Dividend for ISIN FR0000121014** (LVMH) → Notas **LVMH** (Santi, id **82**; Sandra, id **92**, cuenta `trade-republic-sandra`, 2026-07-18).
- **Cash Dividend for ISIN ES0148396007** (Inditex) → Notas **Inditex** (Santi, id **83**).
- **Cash Dividend for ISIN NL0010273215** (ASML) → Notas **ASML** (Santi, id **84**).
- **Cash Dividend for ISIN US0378331005** (Apple) → Notas **Apple** (Santi, id **85**).
- **Cash Dividend for ISIN KYG875721634** (Tencent) → Notas **Tencent** (Santi, id **86**).
- **Cash Dividend for ISIN US6701002056** (Novo Nordisk ADR) → Notas **NovoNordisk (ADR)** (Santi, id **89**).
- **Cash Dividend for ISIN KYG017191142** (Alibaba) → Notas **Alibaba** (Santi, id **93**, cuenta `trade-republic-santi`, 2026-07-18).
- **Savings plan execution NL0010273215 ASML** → **Inversiones**, tipo **Acción**, nombre **ASML**, `invertir_importe` (Santi, id **90**, cuenta `trade-republic-santi`, condición `symbol` + `type: BUY` + `asset_class: STOCK`).
- Si la regla no fija `notas` pero origen = Dividendos, la web usa `Metadatos.name` del export TR como fallback al aceptar.

### Cashback Trade Republic — Saveback (2026-06-25)
- **Opción A acordada:** solo **Ingresos** (no duplicar en Inversiones). Categoría **Inversión**, origen **Cashback**.
- Movimientos con concepto que **contiene** `Saveback cash reward` → regla ImportRules (Santi, id **87**, cuenta `trade-republic-santi`, prioridad 200, `concepto_contiene`). El export TR añade UUID y `for reservation: …` tras el texto base.
- **Notas** al aceptar: `Metadatos.name` del activo (mismo fallback que dividendos).
- Origen **Cashback** se crea en NocoDB al aceptar la primera tarea (`ensureSelectOptions`).

### Cuenta remunerada Trade Republic (2026-06-25)
- **Interest payment for payout collection** (concepto **contiene** ese texto; TR puede añadir UUID y más texto) → **Ingresos**, categoría **Inversión**, origen **Cuenta Remunerada**:
  - Santi, id **88**, cuenta `trade-republic-santi`, prioridad 200
  - Sandra, id **91**, cuenta `trade-republic-sandra`, prioridad 200 (2026-07-18)
- Distinto de `Interest payment Booking` (otro tipo de interés en el export TR).
- **Importe neto (2026-07-18):** el parser oficial TR (`INTEREST_PAYMENT` con `tax`) guarda en AutomaticActions el **neto** (`amount + tax`); `Metadatos.tax` y `Metadatos.amount_gross` conservan bruto y retención. No aplica a filas ya insertadas.

### Cuenta remunerada MyInvestor — intereses e IRPF (2026-06-25)
- **PERIODO** (interés bruto) → **Ingresos**, categoría **Inversión**, origen **Cuenta Remunerada**, importe **positivo**.
- **Ret. IRPF intereses** → misma tabla/categoría/origen, importe **negativo** (retención tal cual en el extracto).
- Al sumar ambos en Ingresos queda el **neto** cobrado en cuenta.
- Regla única ImportRules (Santi, id **58**, cuenta `myinvestor-santi`, prioridad 200): regex `(PERIODO|Ret\. IRPF intereses|Liq\. intereses)` → Ingresos / Inversión / Cuenta Remunerada.
- Insert web: campo **Ingreso** conserva el signo del movimiento (ya no se fuerza `Math.abs`).

### AutomaticActions — Fichero (2026-06-24, sustituido 2026-06-25)
- ~~Campo **Fichero** (SingleLineText)~~ eliminado.
- Sustituido por Link **`AccountDumps`** → tabla **AccountDumps** (un lote = un registro de dump).

### Accounts y AccountDumps (2026-06-25)
- Tabla **Accounts** (`mr0ouismkezq5un`): catálogo de cuentas bancarias en NocoDB.
  - Campos: **Slug** (único, id lógico p. ej. `trade-republic-santi`), **Label**, **Banco**, **Tipo**, **Persona**, **Parser**, **Estado** (`Active` \| `Deprecated`).
  - Seed inicial desde `worker/config/accounts.yaml` (script `worker/scripts/provision_import_schema.py`).
  - Cuentas **Deprecated** no aparecen en la vista web Importaciones ni en el bot.
- Tabla **AccountDumps** (`mcnkpvmpdvo6h9w`): un registro por importación confirmada.
  - Campos: **NombreFichero**, **FechaPrimerRegistro**, **FechaUltimoRegistro**, **NumRegistros**, **NumInsertados**, **NumOmitidos**, Link **Account** → Accounts, Link **AutomaticActions** (hm) ↔ AutomaticActions.
  - **CreatedAt** = fecha de la importación.
- Worker: crea el dump antes de insertar movimientos; cada AutomaticAction enlaza al dump.
- Histórico con **Fichero**: migrado a dumps sintéticos por `(account_id, Fichero)`.

### Cuenta MyInvestor — Sandra (2026-07-18)
- Añadida cuenta **`myinvestor-sandra`** (Id NocoDB **6**): personal, Persona = Sandra, Parser = `myinvestor`.
- Motivo: el bot necesita cuenta propia de Sandra (solo existía `myinvestor-santi`).
- Catálogo YAML (`worker/config/accounts.yaml`) alineado con NocoDB.
- El export de Sandra era CSV texto con separador **`;`** (no Excel). El parser solo partía por `,` → «No se reconoce el formato». Corregido en `split_csv_line` (autodetección `;` vs `,`).

### MyInvestor — IdempotencyKey canónica (2026-07-18)
- Causa: keys se armaban con strings crudos del export → Excel (`2026-06-12 00:00:00|…|-24.54`) ≠ CSV (`12/06/2026|…|-24,54`) → duplicados en AutomaticActions.
- Forma canónica: `YYYY-MM-DD|YYYY-MM-DD|concepto|importe` (importe con `.`, sin ceros sobrantes).
- Parser: `worker/src/worker/parsers/myinvestor.py` (`build_canonical_idempotency_key`).
- Migración one-shot: `python scripts/migrate_myinvestor_idempotency.py --apply` (borró 124 duplicados; canonicó 325 keys).
- Tras migración: 325 filas MyInvestor, keys únicas, sin formato legacy.

### AutomaticActions — Metadatos (2025-06-13)
- Campo **Metadatos** (JSON) añadido en NocoDB (`c7sy9p6eb0fd60f`).
- Worker inserta datos ricos del parseo + `account_id`.
- **Clasificación en memoria:** la web aplica ImportRules al abrir el wizard; no hay columnas `TablaDestino` ni `Categoría` en AutomaticActions (eliminadas 2025-06-13).

### Enlace AutomaticActions ↔ registro creado (2026-06-25)
- **Alcance:** solo registros creados al **Aceptar** o **Editar** una tarea (wizard). Inserción manual y Excel **sin** enlace.
- **Histórico:** sin rellenar; solo aplica a partir de ahora.
- **Tablas destino** (Gastos, Ingresos, Inversiones): campo Link **`AutomaticAction`** → AutomaticActions (relación 1-1 opcional).
- **AutomaticActions:** campo JSON **`RegistroDestino`** `{ tabla, id }` con el registro insertado (para deshacer sin depender del navegador).
- **AutomaticActions** (inversas NocoDB): **`EnlaceGastos`**, **`EnlaceIngresos`**, **`EnlaceInversiones`** — solo una rellena por tarea aceptada/modificada.
- Al deshacer: se borra el registro destino y se limpia `RegistroDestino`.

### Tabla GastosPlantillas (2026-06-27)
- Plantillas de **gastos fijos mensuales** para precargar el formulario de inserción manual.
- Una fila = un gasto recurrente. Varias filas con el mismo **`Plantilla`** forman un grupo (p. ej. `piso-fijos`).
- Campos: **Plantilla** (clave interna), **Nombre** (nombre visible del grupo), **Descripcion**, **DiaMes**, **Cantidad**, **Destino**, **Fuente**, **Persona**, **Categoria**, **Orden**, **Activa** (checkbox).
- Edición: directamente en NocoDB (UI de la base Gastos). No requiere tocar código.
- ID NocoDB: **meadbamg3ffs9v3** (creada 2026-06-27).
- Provision idempotente: `worker/scripts/provision_gastos_plantillas.py`.

### Limpieza Categoría Gastos (2026-07-18)
- Eliminada opción SingleSelect **sin uso**: `Transporte` (las subcategorías `Transporte_*` se mantienen).
- Unificadas **18** opciones `Viaxes_Hotel_*` → **`Viaxes_Hotel`**: 18 registros reasignados (quedan 36 en `Viaxes_Hotel`). Ubicación del viaje ya estaba en campo **Ubicación**.
- Import Excel/Común: `Categoría2Viaxe = Hotel` → siempre `Viaxes_Hotel` (no crea `Viaxes_Hotel_{ciudad}`).

### Inserción manual — campos obligatorios de clasificación (2026-07-18)
- En **+ Insertar → Gastos** e **Ingresos**, **Categoría** es obligatoria: sin ella la fila no cuenta como lista y no se puede guardar.
- En **+ Insertar → Gastos**, **Fuente** también es obligatoria (mismo criterio que Categoría).
- En **+ Insertar → Ingresos**, **Origen** es obligatorio (mismo criterio y UX que Categoría: búsqueda al escribir y poder crear valor nuevo).
- Cliente y servidor comparten la misma validación: el contador «filas listas» / Guardar solo incluye filas que el guardado aceptaría; campos vacíos obligatorios muestran error en la fila.

### UI — Gastos.Destino se muestra como Concepto (2026-07-18)
- En formularios web (inserción, log, tareas), la etiqueta visible del campo **Gastos.Destino** es **Concepto**. La columna en NocoDB sigue siendo **Destino**.

### Patrimonio — columna Detalle (JSON) (2026-07-05)
- Nueva columna **`Detalle`** (JSON, opcional) en tabla **Patrimonio** (`mimdsus64el2tnl`). No cambia los agregados: todos siguen leyendo **`Valor`** en euros.
- Provisión idempotente: `worker/scripts/provision_patrimonio_detalle.py` (stdlib, sin dependencias).
- **Cripto (BTC):** al insertar por web, si `Tipo = Crypto` se pueden indicar **unidades**; el `Valor` en € se calcula al guardar con la cotización **BTC/EUR spot** de CoinGecko (sin API key). `Detalle = { unidades, activo: "BTC", precio_eur, fecha_precio }`. «Usar último snapshot» arrastra las unidades y **recalcula el precio** en cada snapshot (el usuario ya no vuelve a tocar el euro del BTC). Usa el precio del **momento de guardar**.
- **Inmobiliario:** clave **`propiedad`** en `Detalle` para agrupar activo + hipoteca de un mismo inmueble, independiente del `Nombre`. El desglose por inmueble (tabla y barras) agrupa por `propiedad`; si falta, cae al `Nombre` (compatibilidad). Agregados generales y LTV global sin cambios.
- Formulario **+ Insertar → Patrimonio**: campos condicionales «Unidades» (Crypto) y «Propiedad» (Inmobiliario).
- Decidido con el usuario (2026-07-05): guardado por **formulario web**, cotización **CoinGecko spot**, agrupación por clave **`propiedad`**, nombre de columna **`Detalle`**.

### Patrimonio — Tipo Hipoteca y titularidad parcial (2026-07-05)
- Nuevo **Tipo = Hipoteca** para deudas hipotecarias. En la UI se introduce el importe **en positivo**; en BD **`Valor`** sigue siendo **negativo** (patrimonio neto correcto).
- **Inmobiliario** en diversificación refleja el **valor neto** (activos − hipotecas). **Hipoteca** no aparece como categoría en los gráficos de diversificación (tarta/barras/treemap); sí en BD y en el KPI de patrimonio neto.
- **Titularidad parcial** (p. ej. 50 % de un piso que no es Común): en **`Detalle`** se guardan **`valor_total`** (importe íntegro del activo/deuda) y **`porcentaje`** (1–100, vacío = 100). Columna **`Valor`** = `valor_total × porcentaje / 100` (negativo si Hipoteca).
- Compatibilidad: filas antiguas con **Inmobiliario** y **Valor** negativo siguen contando como deuda en LTV y desglose; «Usar último snapshot» las convierte a **Hipoteca** con importe positivo en el formulario.
- Decidido con el usuario (2026-07-05).

### Resumen — Ahorro en gráfico 12 meses (2026-07-18)
- Serie **Ahorro** del gráfico de barras (últimos 12 meses): **ingresos − gastos − inversión** por mes.
- Lo invertido no cuenta como ahorro. Distinto del **Balance** de las tarjetas (ingresos − gastos, sin restar inversión).
- Decidido con el usuario (2026-07-18).

### Resumen — columnas de año en Ratios sobre ingresos (2026-07-18)
- Modo **Por año**: solo columnas de años con **ingresos atribuidos** para la sesión (Persona + 50 % Común, ADR-0004).
- No se abren columnas por gastos/inversión solos (celdas «—») ni se rellenan huecos de calendario entre el primer y el último movimiento.
- Columna **Histórico**: agrega los años visibles con ese criterio.
- Modo **Últimos 12 meses**: misma regla por mes (hace falta ingreso atribuido en el mes).
- Decidido con el usuario (2026-07-18).

### Resumen — ingresos insignificantes en Ratios sobre ingresos (2026-07-18)
- Umbral: si **gastos ≥ 20 × ingresos** en el periodo (mes o año), los ingresos se consideran **insignificantes** → no hay datos de ratio para ese periodo.
- También sin datos si **ingresos ≤ 0** (o ≈ 0).
- Aplica a las tres series (gastos / inversión / ahorro sobre ingresos), en **Últimos 12 meses** y **Por año**.
- Comportamiento: **omitir la columna** del mes/año (no mostrar % absurdos). **Histórico** y **Total 12m** solo agregan periodos que pasan el umbral.
- Decidido con el usuario (2026-07-18).

## Estado actual en NocoDB

| Tabla              | ID              | Campos negocio        |
|--------------------|-----------------|------------------------|
| Gastos             | myqcksevgehcvlp | Completos              |
| Ingresos           | mrr99jc3e3707n6 | Persona añadida; 547 registros = Santi |
| Users              | mwspabgn3fdm9ot | 2 usuarios (Santi, Sandra); bcrypt en PasswordHash |
| **AutomaticActions** | mugm6tw1ail68rq | IdempotencyKey, Estado, Fecha, Importe, Concepto, Banco, Persona, **AccountDumps** (link), **Metadatos**, **RegistroDestino** |
| **Accounts**           | mr0ouismkezq5un | Slug, Label, Banco, Tipo, Persona, Parser, Estado |
| **AccountDumps**       | mcnkpvmpdvo6h9w | NombreFichero, FechaPrimer/Último, NumRegistros/Insertados/Omitidos, Account, AutomaticActions |
| **ImportRules**      | mo7uf7o396lxp59 | Nombre, Persona, Activa, Alcance, Cuenta, Prioridad, Condición, Acciones |
| **Inversiones**      | mwnd0d416iwzwv6 | Entidad, Fecha, Nombre, Importe, Tipo, Persona |
| **Patrimonio**       | mimdsus64el2tnl | Entidad, Fecha, Nombre, Valor, Tipo, Persona, **Detalle** (JSON) |
| **GastosPlantillas** | meadbamg3ffs9v3 | Plantilla, Nombre, Descripcion, DiaMes, Cantidad, Destino, Fuente, Persona, Categoria, Orden, Activa |

> Esquema objetivo en `05-automatic-actions.md`. Añadir campos: decisión/implementación del usuario o agente con su OK.
