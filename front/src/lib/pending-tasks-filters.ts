import type { ClassifiedPending, PersonaValue, TablaDestino } from "@/lib/import-rules/types";
import {
  formatCuentaLabel,
  getCuentaKey,
  getTipoMovimiento,
  type TipoMovimiento,
} from "@/lib/pending-tasks-groups";

export type TablaDestinoFilter = TablaDestino | "__sin_asignar__";

export interface PendingTasksFilters {
  concepto: string;
  cuentas: string[];
  tipos: TipoMovimiento[];
  personas: PersonaValue[];
  tablasDestino: TablaDestinoFilter[];
}

export const EMPTY_PENDING_FILTERS: PendingTasksFilters = {
  concepto: "",
  cuentas: [],
  tipos: [],
  personas: [],
  tablasDestino: [],
};

export const TIPO_FILTER_OPTIONS: { value: TipoMovimiento; label: string }[] = [
  { value: "ingreso", label: "Ingreso" },
  { value: "gasto", label: "Gasto" },
  { value: "inversion", label: "Inversión" },
  { value: "otro", label: "Otro" },
];

export const PERSONA_FILTER_OPTIONS: PersonaValue[] = ["Santi", "Sandra", "Común"];

export const TABLA_DESTINO_FILTER_OPTIONS: { value: TablaDestinoFilter; label: string }[] = [
  { value: "Gastos", label: "Gastos" },
  { value: "Ingresos", label: "Ingresos" },
  { value: "Inversiones", label: "Inversiones" },
  { value: "__sin_asignar__", label: "Sin asignar" },
];

export function getTablaDestinoFilter(item: ClassifiedPending): TablaDestinoFilter {
  return item.tablaDestino ?? "__sin_asignar__";
}

export function hasActiveFilters(filters: PendingTasksFilters): boolean {
  return (
    filters.concepto.trim() !== "" ||
    filters.cuentas.length > 0 ||
    filters.tipos.length > 0 ||
    filters.personas.length > 0 ||
    filters.tablasDestino.length > 0
  );
}

export function applyPendingFilters(
  items: ClassifiedPending[],
  filters: PendingTasksFilters,
): ClassifiedPending[] {
  const concepto = filters.concepto.trim().toLowerCase();

  return items.filter((item) => {
    if (concepto && !(item.concepto ?? "").toLowerCase().includes(concepto)) {
      return false;
    }
    if (filters.cuentas.length > 0 && !filters.cuentas.includes(getCuentaKey(item))) {
      return false;
    }
    if (filters.tipos.length > 0 && !filters.tipos.includes(getTipoMovimiento(item))) {
      return false;
    }
    if (filters.personas.length > 0 && !filters.personas.includes(item.persona)) {
      return false;
    }
    if (
      filters.tablasDestino.length > 0 &&
      !filters.tablasDestino.includes(getTablaDestinoFilter(item))
    ) {
      return false;
    }
    return true;
  });
}

export function getCuentaFilterOptions(
  items: ClassifiedPending[],
): { key: string; label: string }[] {
  const seen = new Map<string, ClassifiedPending>();

  for (const item of items) {
    const key = getCuentaKey(item);
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }

  return [...seen.entries()]
    .map(([key, item]) => ({ key, label: formatCuentaLabel(key, item) }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}
