import { parseDate } from "@/lib/persona";
import type { ClassifiedPending } from "@/lib/import-rules/types";

export type TipoMovimiento = "ingreso" | "gasto" | "inversion" | "transferencia" | "otro";

export function getTipoMovimiento(item: ClassifiedPending): TipoMovimiento {
  if (item.ignorar) return "transferencia";
  if (!item.tablaDestino) return "otro";
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

export interface PendingReglaGroup {
  key: string;
  label: string;
  ignorar: boolean;
  sinCategorizar: boolean;
  rulePriority: number;
  items: ClassifiedPending[];
}

export function isSinCategorizar(item: ClassifiedPending): boolean {
  return !item.ignorar && !item.reglaId && !item.tablaDestino;
}

export function getReglaGroupKey(item: ClassifiedPending): string {
  if (item.reglaId) return `rule:${item.reglaId}`;
  return "__sin_categorizar__";
}

export function getReglaGroupLabel(item: ClassifiedPending): string {
  if (item.reglaNombre) return item.reglaNombre;
  return "Sin categorizar";
}

function describeGroupDestino(item: ClassifiedPending): string {
  if (item.ignorar) return "Transferencia (ignorar)";
  if (isSinCategorizar(item)) return "Asigna destino antes de guardar";
  if (item.tablaDestino === "Inversiones") {
    const parts = [item.tipo, item.nombre].filter(Boolean).join(" · ");
    return parts ? `Inversiones — ${parts}` : "Inversiones";
  }
  if (item.tablaDestino === "Gastos" && item.categoria) {
    return `Gastos — ${item.categoria}`;
  }
  return item.tablaDestino ?? "Sin destino";
}

export function getReglaGroupSubtitle(items: ClassifiedPending[]): string {
  if (items.length === 0) return "";
  return describeGroupDestino(items[0]);
}

export interface PendingImporteTotals {
  incrementos: number;
  decrementos: number;
}

/** Suma incrementos (importe > 0) y decrementos (|importe| donde importe < 0) del grupo. */
export function sumPendingImportes(items: ClassifiedPending[]): PendingImporteTotals {
  let incrementos = 0;
  let decrementos = 0;
  for (const item of items) {
    if (item.importe > 0) incrementos += item.importe;
    else if (item.importe < 0) decrementos += Math.abs(item.importe);
  }
  return { incrementos, decrementos };
}

/** Agrupa por regla ImportRules (o por defecto ingreso/gasto si ninguna coincidió). */
export function groupPendingByRegla(items: ClassifiedPending[]): PendingReglaGroup[] {
  const map = new Map<string, PendingReglaGroup>();

  for (const item of items) {
    const key = getReglaGroupKey(item);
    const existing = map.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(key, {
        key,
        label: getReglaGroupLabel(item),
        ignorar: item.ignorar,
        sinCategorizar: key === "__sin_categorizar__",
        rulePriority: item.reglaPrioridad,
        items: [item],
      });
    }
  }

  for (const group of map.values()) {
    group.items = sortPendingByFechaAsc(group.items);
  }

  return [...map.values()].sort((a, b) => {
    if (a.ignorar !== b.ignorar) return a.ignorar ? -1 : 1;
    if (a.sinCategorizar !== b.sinCategorizar) return a.sinCategorizar ? 1 : -1;
    if (a.rulePriority !== b.rulePriority) return b.rulePriority - a.rulePriority;
    return a.label.localeCompare(b.label, "es");
  });
}
