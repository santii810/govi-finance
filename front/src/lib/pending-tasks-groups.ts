import { parseDate } from "@/lib/persona";
import type { ClassifiedPending } from "@/lib/import-rules/types";

export type TipoMovimiento = "ingreso" | "gasto" | "inversion" | "otro";

export function getTipoMovimiento(item: ClassifiedPending): TipoMovimiento {
  if (item.tablaDestino === "Ingresos") return "ingreso";
  if (item.tablaDestino === "Gastos") return "gasto";
  if (item.tablaDestino === "Inversiones") return "inversion";
  return "otro";
}

export function getCuentaKey(item: ClassifiedPending): string {
  return item.metadata.account_id?.trim() || item.banco?.trim() || "__sin_cuenta__";
}

export function formatCuentaLabel(key: string, sample?: ClassifiedPending): string {
  if (key === "__sin_cuenta__") return "Sin cuenta";
  if (sample?.banco) {
    const suffix = key.split("-").pop() ?? key;
    const formatted = suffix.charAt(0).toUpperCase() + suffix.slice(1);
    return `${sample.banco} — ${formatted}`;
  }
  return key
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function sortPendingByFechaAsc(items: ClassifiedPending[]): ClassifiedPending[] {
  return [...items].sort((a, b) => {
    const da = parseDate(a.fecha);
    const db = parseDate(b.fecha);
    if (!da && !db) return a.id.localeCompare(b.id);
    if (!da) return 1;
    if (!db) return -1;
    const diff = da.getTime() - db.getTime();
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
}

export interface PendingDayGroup {
  key: string;
  label: string;
  items: ClassifiedPending[];
}

function getFechaKey(item: ClassifiedPending): string {
  const d = parseDate(item.fecha);
  if (!d) return item.fecha?.trim() || "__sin_fecha__";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatFechaLabel(key: string): string {
  if (key === "__sin_fecha__") return "Sin fecha";
  const d = parseDate(key);
  if (!d) return key;
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Agrupa por día calendario, orden ascendente (día más antiguo primero). */
export function groupPendingByFecha(items: ClassifiedPending[]): PendingDayGroup[] {
  const map = new Map<string, ClassifiedPending[]>();

  for (const item of items) {
    const key = getFechaKey(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }

  const groups: PendingDayGroup[] = [];
  for (const [key, groupItems] of map) {
    groups.push({
      key,
      label: formatFechaLabel(key),
      items: sortPendingByFechaAsc(groupItems),
    });
  }

  return groups.sort((a, b) => {
    if (a.key === "__sin_fecha__") return 1;
    if (b.key === "__sin_fecha__") return -1;
    return a.key.localeCompare(b.key);
  });
}
