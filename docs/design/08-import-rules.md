# Modelo de datos: ImportRules

## Estado
Creada en NocoDB (2025-06-13).

## Propósito

Reglas de clasificación para movimientos **pending** en AutomaticActions.
Las aplica la **web** al abrir el wizard (no el bot ni el worker).

| Uso | Cuándo |
|-----|--------|
| Propuesta `TablaDestino` / `Categoría` / `Persona` | Al listar pending en wizard |
| Re-evaluación | Al crear/editar/desactivar una regla |
| Aprendizaje (futuro) | Al aceptar/editar un movimiento → guardar regla similar |

## Identificación en NocoDB

| Propiedad | Valor |
|-----------|-------|
| Título | ImportRules |
| Table ID | `mo7uf7o396lxp59` |
| Base | Gastos (`pnf173not1wvzg0`) |

---

## Campos

| Campo | Tipo NocoDB | Obligatorio | Descripción |
|-------|-------------|-------------|-------------|
| **Nombre** | SingleLineText | Sí | Etiqueta legible |
| **Persona** | SingleSelect | Sí | `Santi` \| `Sandra` — propietario de la regla (personal, no compartida) |
| **Activa** | Checkbox | Sí | Solo reglas activas se evalúan |
| **Alcance** | SingleSelect | Sí | `global` \| `account` |
| **Cuenta** | SingleLineText | No | `account_id` del YAML; vacío si `global` |
| **Prioridad** | Number | Sí | Mayor número = más peso |
| **Condición** | JSON | Sí | Filtros sobre el movimiento + Metadatos |
| **Acciones** | JSON | Sí | Valores a aplicar si la condición coincide |

---

## Jerarquía de evaluación

1. Filtrar reglas con `Activa = true`.
2. Si `Alcance = account`, aplicar solo si `Cuenta` = `Metadatos.account_id` del movimiento.
3. Ordenar por **Prioridad** ascendente (menor primero, mayor al final).
4. Aplicar **todas** las que coinciden, en orden (cada una puede sobreescribir la anterior).

> En la práctica: reglas de prioridad alta (p. ej. 500, nombre exacto) se aplican **al final** y prevalecen sobre globales de signo (prioridad 0).

---

## Condición (JSON) — claves soportadas

Referencia de implementación: `worker/src/worker/rules/engine.py` (portar a la web).

| Clave | Tipo | Ejemplo |
|-------|------|---------|
| `importe_positivo` | bool | `true` |
| `importe_negativo` | bool | `true` |
| `concepto_contiene` | string | `"AMAZON"` |
| `concepto_exacto` | string | `"VANGUARD US 500 STOCK INDEX EU"` |
| `type` / `tipo` | string | `"CARD_TRANSACTION"` |
| `category` | string | `"TRADING"` |
| `asset_class` | string | `"STOCK"` |
| `mcc_code` | string | `"5813"` |
| `symbol` | string | `"US64110L1061"` |

Entrada: `Concepto`, `Importe`, `Persona`, `Banco` + campos de **Metadatos** (AutomaticActions).

---

## Acciones (JSON) — claves soportadas

| Clave | Valores | Descripción |
|-------|---------|-------------|
| `tabla_destino` | `Gastos` \| `Ingresos` \| `Inversiones` | Tabla destino propuesta |
| `categoria` | string | Categoría (destino Gastos) |
| `tipo` | string | Tipo de inversión (destino Inversiones; ej. `Fondo indexado`) |
| `nombre` | string | Nombre del activo (destino Inversiones; ej. `SP500`) |
| `entidad` | string | Override de plataforma; vacío → heredar del banco/cuenta |
| `persona` | `Santi` \| `Sandra` \| `Común` | Override de persona |
| `importe_signo` | `positivo` \| `negativo` | Fuerza signo del importe (casos raros) |
| `invertir_importe` | bool | Multiplica el importe por −1 (p. ej. MyInvestor: inversiones como gastos) |

---

## Reglas iniciales (seed)

| Id | Nombre | Alcance | Prioridad | Condición | Acciones |
|----|--------|---------|-----------|-----------|----------|
| 1 | Global — importe positivo → Ingresos | global | 0 | `{"importe_positivo": true}` | `{"tabla_destino": "Ingresos"}` |
| 4 | Global — importe negativo → Gastos | global | 0 | `{"importe_negativo": true}` | `{"tabla_destino": "Gastos"}` |
| — | Exacto — VANGUARD US 500 → SP500 | global | 500 | `{"concepto_exacto": "VANGUARD US 500 STOCK INDEX EU"}` | `{"tabla_destino": "Inversiones", "tipo": "Fondo indexado", "nombre": "SP500"}` |
| — | Exacto — AMUNDI MSCI EM → MSCI EM | global | 500 | `{"concepto_exacto": "AMUNDI INDEX MSCI EMERG MKTS I"}` | `{"tabla_destino": "Inversiones", "tipo": "Fondo indexado", "nombre": "MSCI EM"}` |

> Pantalla web para CRUD de reglas: `12-reglas-clasificacion.md`.

---

## Ejemplo — regla de cuenta

Tarjeta restaurante en Trade Republic Santi:

```json
{
  "Nombre": "TR Santi — restaurante (MCC 5813)",
  "Activa": true,
  "Alcance": "account",
  "Cuenta": "trade-republic-santi",
  "Prioridad": 100,
  "Condición": {
    "type": "CARD_TRANSACTION",
    "mcc_code": "5813"
  },
  "Acciones": {
    "tabla_destino": "Gastos",
    "categoria": "Restaurantes"
  }
}
```

---

## Referencias

- `07-bank-import-worker.md`
- `03-wizard-automatic-actions.md`
- `05-automatic-actions.md` (Metadatos)
- `worker/src/worker/rules/engine.py`
