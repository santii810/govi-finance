import type { ClassifiedPending } from "./import-rules/types";
import { defaultIngresosOrigen } from "./pending-ingresos-origen";

/** Texto para Ingresos.Notas al aceptar/modificar una tarea. */
export function resolveIngresosNotasForInsert(item: ClassifiedPending): string | undefined {
  const explicit = item.notas?.trim();
  if (explicit) return explicit;

  const origen = item.origen?.trim() || defaultIngresosOrigen(item);
  if (origen === "Dividendos" || origen === "Cashback") {
    const name = item.metadata.name?.trim();
    if (name) return name;
  }

  return undefined;
}
