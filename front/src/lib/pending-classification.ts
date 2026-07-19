import type { ClassifiedPending } from "@/lib/import-rules/types";

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** Campos obligatorios cumplidos para aceptar/guardar según tabla destino. */
export function isPendingFullyClassified(item: ClassifiedPending): boolean {
  if (item.ignorar) return true;
  if (!item.tablaDestino) return false;

  if (item.tablaDestino === "Gastos" || item.tablaDestino === "Ingresos") {
    return hasText(item.categoria);
  }
  if (item.tablaDestino === "Inversiones") {
    return hasText(item.tipo) && hasText(item.nombre);
  }
  return false;
}

/** Propuesta parcial (p. ej. tabla Gastos sin categoría) — no listo para aceptar. */
export function isSinClasificar(item: ClassifiedPending): boolean {
  return !item.ignorar && !isPendingFullyClassified(item);
}

export function canAcceptPending(item: ClassifiedPending): boolean {
  return !item.ignorar && isPendingFullyClassified(item);
}

export function validatePendingClassification(item: ClassifiedPending): string | null {
  if (item.ignorar) return null;
  if (!item.tablaDestino) {
    return "Categoriza el movimiento antes de guardarlo";
  }
  if (item.tablaDestino === "Gastos" || item.tablaDestino === "Ingresos") {
    if (!hasText(item.categoria)) return "La categoría es obligatoria";
  }
  if (item.tablaDestino === "Inversiones") {
    if (!hasText(item.tipo) || !hasText(item.nombre)) {
      return "Tipo y nombre del activo son obligatorios";
    }
  }
  return null;
}
