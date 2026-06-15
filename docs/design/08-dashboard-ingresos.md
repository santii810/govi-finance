# Diseño: Dashboard Ingresos (pestaña)

## Estado
Aprobado e implementado (2026-06-13).

## Cuándo se muestra
Pestaña **Ingresos** del shell (`01-homepage.md`), activa al pulsarla.

## Filtro de años (acordado)
Selector en la parte superior del dashboard:

| Opción | Comportamiento |
|--------|----------------|
| **Todo el histórico** | Todos los años con datos |
| **Año concreto** | Solo ese año calendario |
| **Rango personalizado** | Desde / hasta (dos selectores) |

Todos los gráficos y tarjetas **reaccionan al filtro** (sin recargar la página).

## Reglas de datos
- Solo ingresos visibles para el usuario logueado (Persona = suyo o Común).
- Persona = Común → **50%** del importe en agregaciones (ADR-0004).
- Campo importe: **Ingreso**. Campo fecha: **Fecha**.

## Mapeo Excel → NocoDB

| Gráfico Excel | Campo NocoDB |
|---------------|--------------|
| Por fuente / origen | **Origen** |
| Por rol | **Categoría** |
| Por año / mes | **Fecha** |

## Layout

```
┌─ Filtro años ─────────────────────────────────────────────┐
│  [ Todo ▾ ]  o  Desde [2012▾]  Hasta [2025▾]              │
├───────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│  │ Total       │ │ Año actual  │ │ Media mens. │         │
│  └─────────────┘ └─────────────┘ └─────────────┘         │
│  ┌─ Ingresos por año (línea) ─────────────────────────┐  │
│  └────────────────────────────────────────────────────┘  │
│  ┌─ Por origen (barras) ──┐  ┌─ Por categoría (barras) ┐ │
│  └────────────────────────┘  └──────────────────────────┘  │
│  ┌─ % origen (tarta) ─────┐  ┌─ % categoría (tarta) ───┐ │
│  └────────────────────────┘  └──────────────────────────┘  │
│  ┌─ Tabla año × origen (heatmap) ──────────────────────┐  │
│  └────────────────────────────────────────────────────┘  │
│  ┌─ Calendario mensual (heatmap mes × año) ────────────┐  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Widgets

### Tarjetas superiores (3)
| Tarjeta | Valor | Notas |
|---------|-------|-------|
| Total en período | Suma Ingreso en rango filtrado | Etiqueta refleja filtro |
| Año en curso | Suma del año calendario actual | Siempre visible |
| Media mensual | Total ÷ meses con datos en rango | — |

### Gráficos (de Excel, acordados)
1. **Línea — ingresos por año** (equivalente «INGRESOS POR AÑO»)
2. **Barras — total por Origen**
3. **Barras — total por Categoría**
4. **Tarta — % por Origen**
5. **Tarta — % por Categoría**
6. **Tabla pivot — año × Origen** con intensidad de color
7. **Heatmap — mes × año** con suma mensual

### Extras propuestos (opcionales, no en v1 salvo acuerdo)
- Comparativa % vs año anterior en tarjeta
- Top 5 mejores meses
- Línea apilada por Origen

## Presentación
- Sin título redundante en el área (la pestaña basta).
- Paleta Finanzas (no verde oliva Excel); importes en EUR.
- Etiquetas de valor en línea anual (como Excel).

## Fuera de alcance (fase actual)
- Comparativa % vs año anterior, top 5 meses, línea apilada por origen.

## Referencias
- Shell: `01-homepage.md`
- Canvas: `ingresos-v0` → `docs/design/canvases/ingresos-v0.canvas.tsx`
- Reglas Persona: ADR-0004
