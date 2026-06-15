# Diseño: Dashboard Resumen (pestaña inicial)

## Estado
Aprobado (2025-06-13)
Pestaña **Resumen**, activa por defecto al entrar tras login.

## Widgets superiores (3 tarjetas)

Rejilla de tres métricas del **mes en curso**, con referencia al **mes anterior** en texto pequeño debajo.

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Balance del mes │  │ Gastos del mes  │  │ Ingresos del mes│
│    1.240 €      │  │     820 €       │  │    2.060 €      │  ← valor principal
│ Mes ant: 980 €  │  │ Mes ant: 750 €  │  │ Mes ant: 1.730 €│  ← texto pequeño
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Definición de cada métrica

| Widget           | Valor principal              | Texto pequeño                    |
|------------------|------------------------------|----------------------------------|
| Balance del mes  | Ingresos del mes − Gastos del mes (para el usuario logueado) | Mismo cálculo, **mes anterior** |
| Gastos del mes   | Suma de gastos del mes       | Suma de gastos, **mes anterior** |
| Ingresos del mes | Suma de ingresos del mes     | Suma de ingresos, **mes anterior** |

### Reglas de cálculo (datos)
- Solo registros visibles para el usuario (Persona = suyo o Común).
- Registros Común: **50%** del importe (ADR-0004).
- **Mes en curso** = mes calendario actual.
- **Mes anterior** = mes calendario inmediatamente anterior.

### Presentación
- **Sin encabezado** «Dashboard: Resumen» ni títulos redundantes; la pestaña activa basta.
- Valor principal: destacado, legible.
- Mes anterior: texto **pequeño** y tono secundario (ej. etiqueta «Mes anterior: 980 €»).
- Moneda: EUR.

## Área inferior del dashboard

### Gráfico de barras — último año (aprobado 2025-06-13)

Gráfico de **barras agrupadas** con los **últimos 12 meses** calendario.

| Serie    | Qué muestra                                      |
|----------|--------------------------------------------------|
| Ingresos | Suma mensual de ingresos (reglas Persona + 50%)  |
| Gastos   | Suma mensual de gastos (reglas Persona + 50%)    |

- Eje horizontal: meses (12 etiquetas, del más antiguo al más reciente).
- Eje vertical: importe en **EUR**.
- Dos barras por mes: una de ingresos, una de gastos (lado a lado, no apiladas).
- Leyenda identificando ambas series.

### Reglas de cálculo (igual que tarjetas superiores)
- Solo registros visibles para el usuario logueado.
- Persona = Común → 50% del importe.

## Fuera de alcance
- Implementación.

## Referencias
- Shell general: `01-homepage.md`
- Canvas: `homepage-v0` → `docs/design/canvases/homepage-v0.canvas.tsx`
- Reglas Persona y 50%: ADR-0004
