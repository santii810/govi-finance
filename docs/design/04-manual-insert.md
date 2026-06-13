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
- **Gastos** e **Ingresos** desde el inicio.
- **Tablas futuras**: aparecen automáticamente en el desplegable cuando se creen (mismo mecanismo).

> Los campos de cada formulario dependen del esquema de la tabla elegida (incl. **Persona** en todas).

## Diferencia con el wizard
| Flujo            | Origen              | Destino                    |
|------------------|---------------------|----------------------------|
| Wizard tareas    | AutomaticActions    | Tabla tras aceptar/modificar |
| + Insertar       | Usuario, a mano     | Tabla elegida, directo     |

## Fuera de alcance
- Implementación.
- Validaciones campo a campo (se derivan del esquema NocoDB cuando exista).

## Referencias
- Shell: `01-homepage.md`
- Campo Persona: ADR-0004
