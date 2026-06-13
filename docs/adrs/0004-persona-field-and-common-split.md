# ADR-0004: Campo Persona y reparto de gastos comunes

## Estado
Aceptado (2025-06-13)

## Contexto
Cada usuario ve sus datos y los comunes. Hace falta un mecanismo uniforme en todas las tablas y una regla para cuánto “cuentan” los gastos compartidos.

## Decisión

### Campo Persona (todas las tablas)
- **Todas las tablas** — Gastos, Ingresos y las futuras — tendrán un campo **Persona**.
- Valores permitidos: **Santi**, **Sandra**, **Común**.

### Visibilidad por valor de Persona
| Persona  | Santi ve | Sandra ve |
|----------|----------|-----------|
| Santi    | Sí       | No        |
| Sandra   | No       | Sí        |
| Común    | Sí       | Sí        |

### Reparto de registros comunes (regla de negocio)
- En **todas las tablas** (Gastos, Ingresos y futuras), los registros con **Persona = Común** se **atribuyen al 50%** a cada usuario en totales, dashboards y agregaciones.
- El importe almacenado en NocoDB es el **importe real completo**; el 50% es una regla de **visualización/cálculo**, no de almacenamiento.

**Ejemplo:** un gasto común de 100 € → Santi lo ve como 50 € en sus totales; Sandra también como 50 €.  
**Ejemplo:** un ingreso común de 200 € → cada uno lo ve como 100 € en sus totales.

## Consecuencias
- Tablas nuevas deben incluir Persona desde el diseño.
- La tabla **Ingresos** aún no tiene Persona en NocoDB → habrá que añadirlo antes de usar la web con ingresos (decisión de esquema acordada, ejecución en implementación).
- Los dashboards y widgets que sumen importes deben aplicar el factor **0,5** a registros con Persona = Común, en cualquier tabla.

## Pendiente
- Ninguno en esta ADR (regla unificada para todas las tablas).
