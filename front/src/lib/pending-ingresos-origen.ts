import type { ClassifiedPending } from "./import-rules/types";
import { formatCuentaLabel, getCuentaKey } from "./pending-tasks-groups";
import type { SelectOptionsMap } from "./table-select-options";
import { pickSelectValue } from "./table-select-options";

/** Etiqueta de cuenta (p. ej. «MyInvestor — Santi») como origen por defecto en Ingresos. */
export function defaultIngresosOrigen(item: ClassifiedPending): string {
  const cuenta = formatCuentaLabel(getCuentaKey(item), item);
  if (cuenta !== "Sin cuenta") return cuenta;
  return item.banco?.trim() || "";
}

export function effectiveIngresosOrigen(item: ClassifiedPending): string {
  return item.origen?.trim() || defaultIngresosOrigen(item);
}

export function resolveIngresosOrigenForInsert(
  item: ClassifiedPending,
  options: SelectOptionsMap,
): string | undefined {
  const candidates = [
    item.origen?.trim(),
    defaultIngresosOrigen(item),
    item.banco?.trim(),
  ].filter((v): v is string => Boolean(v));

  for (const candidate of candidates) {
    const picked = pickSelectValue("Origen", candidate, options);
    if (picked) return picked;
  }
  return candidates[0];
}
