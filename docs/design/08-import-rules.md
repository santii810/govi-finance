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
3. Ordenar por **Prioridad** descendente (reglas de cuenta suelen usar prioridad > global).
4. Aplicar **todas** las que coinciden, en orden (cada una puede sobreescribir la anterior).

> En la práctica: reglas de cuenta con prioridad alta prevalecen sobre globales con prioridad 0.

---

## Condición (JSON) — claves soportadas

Referencia de implementación: `worker/src/worker/rules/engine.py` (portar a la web).

| Clave | Tipo | Ejemplo |
|-------|------|---------|
| `importe_positivo` | bool | `true` |
| `importe_negativo` | bool | `true` |
| `concepto_contiene` | string | `"AMAZON"` |
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
| `tabla_destino` | `Gastos` \| `Ingresos` | Tabla destino propuesta |
| `categoria` | string | Categoría (misma lógica que Gastos) |
| `persona` | `Santi` \| `Sandra` \| `Común` | Override de persona |
| `importe_signo` | `positivo` \| `negativo` | Fuerza signo del importe (casos raros) |

---

## Reglas iniciales (seed)

| Id | Nombre | Alcance | Prioridad | Condición | Acciones |
|----|--------|---------|-----------|-----------|----------|
| 1 | Global — importe positivo → Ingresos | global | 0 | `{"importe_positivo": true}` | `{"tabla_destino": "Ingresos"}` |
| 4 | Global — importe negativo → Gastos | global | 0 | `{"importe_negativo": true}` | `{"tabla_destino": "Gastos"}` |

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
