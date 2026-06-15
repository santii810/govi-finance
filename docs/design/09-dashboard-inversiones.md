# Diseño: Dashboard Inversión (pestaña)

## Estado
Aprobado e implementado (2026-06-14).

## Cuándo se muestra
Pestaña **Inversión** del shell (`01-homepage.md`), activa al pulsarla.

## Tabla NocoDB: **Inversiones**

Registra **flujos de dinero**: cuánto se aporta o se retira de lo invertido.

| Campo | Tipo | Notas |
|-------|------|-------|
| **Entidad** | Single select o texto | Plataforma / broker (Trade Republic, Indexa…) |
| **Fecha** | Date | Fecha del movimiento |
| **Nombre** | Texto | Activo o producto (Bitcoin, MSCI World…) |
| **Importe** | Number | **Positivo** = aportación · **Negativo** = retiro (ej. −500 €) |
| **Tipo** | Single select | Categoría de inversión: Fondo indexado, PIAS, Inmobiliario, Crypto… |
| **Persona** | Single select | Santi \| Sandra \| Común (ADR-0004) |

### Reglas de datos
- Solo registros visibles para el usuario logueado (Persona = suyo o Común).
- Persona = Común → **50%** del importe en agregaciones (ADR-0004).
- El importe almacenado es el **real**; el signo indica dirección del flujo.
- Agregaciones del dashboard usan **suma neta** (aportaciones − retiros).

## Filtro de años (acordado)
Igual que Ingresos (`08-dashboard-ingresos.md`):

| Opción | Comportamiento |
|--------|----------------|
| **Todo el histórico** | Todos los años con datos |
| **Año concreto** | Solo ese año calendario |
| **Rango personalizado** | Desde / hasta (dos selectores) |

Todos los gráficos y tarjetas **reaccionan al filtro** (sin recargar la página).

## Mapeo widgets → campos

| Widget | Campo NocoDB |
|--------|--------------|
| Por plataforma | **Entidad** |
| Por categoría | **Tipo** |
| Por activo | **Nombre** |
| Por año / mes | **Fecha** |
| Importe | **Importe** (con signo) |

## Layout

```
┌─ Filtro años ─────────────────────────────────────────────┐
│  [ Todo ▾ ]  o  Desde [2021▾]  Hasta [2025▾]              │
├───────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│  │ Total neto  │ │ Año actual  │ │ Media mens. │         │
│  └─────────────┘ └─────────────┘ └─────────────┘         │
│  ┌─ Inversión neta por año (línea) ────────────────────┐  │
│  └────────────────────────────────────────────────────┘  │
│  ┌─ Por entidad (barras) ─┐  ┌─ Por tipo (barras) ────┐ │
│  └────────────────────────┘  └──────────────────────────┘  │
│  ┌─ Por nombre (barras) ───────────────────────────────┐  │
│  └────────────────────────────────────────────────────┘  │
│  ┌─ % entidad (tarta) ────┐  ┌─ % tipo (tarta) ────────┐ │
│  └────────────────────────┘  └──────────────────────────┘  │
│  ┌─ % nombre (tarta) ──────────────────────────────────┐  │
│  └────────────────────────────────────────────────────┘  │
│  ┌─ Tabla año × entidad (heatmap) ─────────────────────┐  │
│  └────────────────────────────────────────────────────┘  │
│  ┌─ Calendario mensual (heatmap mes × año) ────────────┐  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Widgets

### Tarjetas superiores (3)
| Tarjeta | Valor | Notas |
|---------|-------|-------|
| Total neto en período | Suma Importe en rango filtrado | Aportaciones − retiros |
| Año en curso | Suma neta del año calendario actual | Siempre visible |
| Media mensual neta | Total neto ÷ meses con datos en rango | — |

### Gráficos
1. **Línea — inversión neta por año**
2. **Barras — neto por Entidad**
3. **Barras — neto por Tipo**
4. **Barras — neto por Nombre**
5. **Tarta — % por Entidad**
6. **Tarta — % por Tipo**
7. **Tarta — % por Nombre**
8. **Tabla pivot — año × Entidad** con intensidad de color
9. **Heatmap — mes × año** con suma mensual neta

## Presentación
- Sin título redundante en el área (la pestaña basta).
- Paleta Finanzas; importes en EUR; retiros mostrados con signo negativo.
- Reutilizar componentes visuales de Ingresos donde aplique (`ingresos/`).

## Integraciones

| Elemento | v1 |
|----------|-----|
| Pestaña en shell | Sí |
| **+ Insertar** → Inversiones | Sí (cuando exista inserción manual) |
| Dashboard Resumen (balance) | **No** — inversión no es gasto ni ingreso |
| Wizard / ImportRules | No |

## Fuera de alcance (v1)
- Valor de cartera / precios de mercado (posiciones).
- Dividendos como ingreso (permanecen en Ingresos si aplica).
- Comparativa % vs año anterior, top 5 meses.

## Referencias
- Shell: `01-homepage.md`
- Paralelo: `08-dashboard-ingresos.md`
- Canvas: `inversiones-v0` → `docs/design/canvases/inversiones-v0.canvas.tsx`
- Reglas Persona: ADR-0004
- Decisiones datos: `docs/standards/data-decisions.md`
