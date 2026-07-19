# Diseño: valor por defecto de Concepto (Gastos) sin prefijo Revolut

## Estado

Aprobado en conversación (2026-07-18). Scope limitado a **tareas pendientes**.

## Problema

Revolut antepone `Pago con tarjeta -` / `Pago con tarjeta —` al concepto bancario. Al clasificar Gastos, si no hay Destino de una ImportRule, ese texto completo acaba en el campo que se guarda (columna NocoDB **Destino**) o el usuario tiene que reescribirlo al editar.

## Decisión

| Aspecto | Decisión |
|---------|----------|
| Dónde limpiar | Solo el valor por defecto al **guardar / editar** en tareas pendientes |
| Concepto en lista | Sin cambios (sigue el texto bancario completo) |
| Import / worker | Sin cambios |
| Modelo de datos | Sin cambios (columna Gastos.Destino) |
| Etiqueta UI | En tareas pendientes el campo ya se muestra como **Concepto**; mantenerlo. Fuera de este scope (inserción manual, etc.) no se toca |

## Comportamiento

1. **Valor por defecto** = concepto bancario tras quitar el prefijo `Pago con tarjeta` seguido de guion (`-`), en dash (`–`) o raya (`—`) y espacios.
2. Si una ImportRule ya aporta `destino`, se usa ese valor (sin tocar el prefijo del concepto crudo).
3. Al **editar** una tarea con tabla Gastos: el input **Concepto** se precarga con ese valor por defecto (no placeholder vacío / no obligar a escribir de cero).
4. Al **aceptar** sin editar (o con Concepto vacío en el draft): al insertar en Gastos se usa el mismo valor limpio como Destino.

## Fuera de alcance

- Otras tipologías Revolut (`Transferir — …`, etc.).
- Renombrar columnas NocoDB o etiquetas fuera de tareas pendientes.
- Limpiar el Concepto almacenado en AutomaticActions.
