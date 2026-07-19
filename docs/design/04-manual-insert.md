# Diseño: Inserción manual (+ Insertar)

## Estado
Aprobado (2025-06-13)

## Ubicación
Botón **+ Insertar** en la barra superior (siempre visible, junto a Tareas pendientes).

## Comportamiento

1. Usuario pulsa **+ Insertar**.
2. Se abre un **desplegable** con la lista de tablas disponibles.
3. Al elegir una tabla → se muestra un **formulario** con los campos de esa tabla.
4. Usuario rellena y confirma → insert directo en NocoDB (sin AutomaticActions).

```
[+ Insertar ▾]
    ├── Gastos      → formulario Gastos
    ├── Ingresos    → formulario Ingresos
    └── (tablas futuras cuando existan)
```

## Tablas incluidas
- **Gastos**, **Ingresos**, **Inversiones** y **Patrimonio**.
- **Tablas futuras**: aparecen automáticamente en el desplegable cuando se creen (mismo mecanismo).

> Los campos de cada formulario dependen del esquema de la tabla elegida (incl. **Persona** en todas).

### Patrimonio (snapshot)
- Un guardado = un **snapshot**: todas las filas comparten **Fecha**. Botón **«Usar último snapshot»** precarga las filas del último.
- **Hipotecas:** **Tipo = Hipoteca**, importe en positivo en el formulario (se guarda negativo en BD).
- Columna **Detalle** por fila (JSON, ver `data-decisions.md` 2026-07-05):
  - **Crypto** → campo **Unidades** (BTC). Si se rellena, el **Valor €** se calcula al guardar con la cotización **BTC/EUR spot** (CoinGecko). «Usar último snapshot» arrastra las unidades y recalcula el precio.
  - **Inmobiliario / Hipoteca** → **Propiedad** (agrupa activo + deuda) y **% titularidad** (vacío = 100 %). **Valor total** en la columna Valor; en BD se guarda la cuota (`valor_total × % / 100`; negativo si Hipoteca). `Detalle = { valor_total, porcentaje, propiedad? }`.

## Diferencia con el wizard
| Flujo            | Origen              | Destino                    |
|------------------|---------------------|----------------------------|
| Wizard tareas    | AutomaticActions    | Tabla tras aceptar/modificar |
| + Insertar       | Usuario, a mano     | Tabla elegida, directo     |

## Estado
- Implementado: Gastos, Ingresos, Inversiones, Patrimonio (con Detalle).

## Referencias
- Shell: `01-homepage.md`
- Campo Persona: ADR-0004
