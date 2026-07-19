# Plan: Concepto por defecto sin prefijo Revolut

> Spec: `docs/superpowers/specs/2026-07-18-revolut-destino-default-design.md`

## Archivos

| Archivo | Cambio |
|---------|--------|
| `front/src/lib/pending-gastos-concepto.ts` | Helper: quitar prefijo + valor por defecto |
| `front/src/lib/automatic-actions.ts` | `gastosDestino` usa el helper |
| `front/src/components/pending-tasks-panel.tsx` | Precargar Concepto al editar / al elegir Gastos |

## Tareas

1. Crear helper `stripRevolutCardPrefix` + `defaultGastosConcepto`.
2. Usarlo al insertar Gastos y al armar el draft de edición.
3. Rebuild `web`.
