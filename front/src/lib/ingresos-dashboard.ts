import type { NocoDbClient } from "./nocodb";
import { yearsFromDateBounds } from "./nocodb";
import { TABLES } from "./config";
import {
  attributedAmount,
  currentYearKey,
  getDateParts,
  parseAmount,
  parseDate,
  personaFilter,
  yearBoundsIso,
} from "./persona";
import { resolvePeriodFilterRange } from "./period-filter";
import { buildPivotDetails, formatPivotDate, type PivotDrilldownMove } from "./pivot-drilldown";
import { INGRESOS_FIELDS } from "./table-fields";
import type {
  IngresosData,
  IngresosFilterMode,
  IngresosHeatmapRow,
  IngresosPivotRow,
  IngresosYearPoint,
  NamedAmount,
  Persona,
} from "./types";

interface IngresoRecord {
  date: Date;
  amount: number;
  origen: string;
  categoria: string;
  year: string;
  monthIndex: number;
  monthKey: string;
}

function mapIngresos(records: Record<string, unknown>[], timezone: string): IngresoRecord[] {
  return records
    .map((r) => {
      const date = parseDate(r.Fecha);
      if (!date) return null;
      const parts = getDateParts(date, timezone);
      return {
        date,
        amount: attributedAmount(parseAmount(r.Ingreso), r.Persona),
        origen: String(r.Origen ?? "Sin origen"),
        categoria: String(r.Categoría ?? r.Categoria ?? "Sin categoría"),
        year: parts.year,
        monthIndex: parts.monthIndex,
        monthKey: parts.monthKey,
      };
    })
    .filter((r): r is IngresoRecord => r !== null);
}

function resolveFilterRange(
  mode: IngresosFilterMode,
  timezone: string,
  availableYears: string[],
  yearFrom?: string,
  yearTo?: string,
): { from: string; to: string } {
  return resolvePeriodFilterRange(mode, timezone, availableYears, yearFrom, yearTo);
}

function filterByYears(records: IngresoRecord[], from: string, to: string): IngresoRecord[] {
  return records.filter((r) => r.year >= from && r.year <= to);
}

function sumByYear(records: IngresoRecord[]): IngresosYearPoint[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    totals.set(r.year, (totals.get(r.year) ?? 0) + r.amount);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, total]) => ({ year, total }));
}

function sumByField(records: IngresoRecord[], field: "origen" | "categoria"): NamedAmount[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    const key = r[field];
    totals.set(key, (totals.get(key) ?? 0) + r.amount);
  }
  return [...totals.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([name, total]) => ({ name, total }));
}

function buildPivot(records: IngresoRecord[], timezone: string): {
  origenKeys: string[];
  rows: IngresosPivotRow[];
  details: Record<string, PivotDrilldownMove[]>;
} {
  const origenSet = new Set<string>();
  const grid = new Map<string, Map<string, number>>();
  const entries: Array<{ rowKey: string; colKey: string; ts: number; move: PivotDrilldownMove }> = [];

  for (const r of records) {
    origenSet.add(r.origen);
    const y = r.year;
    if (!grid.has(y)) grid.set(y, new Map());
    const row = grid.get(y)!;
    row.set(r.origen, (row.get(r.origen) ?? 0) + r.amount);
    entries.push({
      rowKey: y,
      colKey: r.origen,
      ts: r.date.getTime(),
      move: {
        date: formatPivotDate(r.date, timezone),
        label: r.categoria,
        amount: r.amount,
      },
    });
  }

  const origenKeys = [...origenSet].sort((a, b) => a.localeCompare(b));
  const rows: IngresosPivotRow[] = [...grid.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, valuesMap]) => {
      const values: Record<string, number> = {};
      let total = 0;
      for (const key of origenKeys) {
        const v = valuesMap.get(key) ?? 0;
        values[key] = v;
        total += v;
      }
      return { year, values, total };
    });

  return { origenKeys, rows, details: buildPivotDetails(entries) };
}

const HEATMAP_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function buildHeatmap(
  records: IngresoRecord[],
  timezone: string,
): { rows: IngresosHeatmapRow[]; details: Record<string, PivotDrilldownMove[]> } {
  const grid = new Map<string, number[]>();
  const entries: Array<{ rowKey: string; colKey: string; ts: number; move: PivotDrilldownMove }> = [];

  for (const r of records) {
    const y = r.year;
    if (!grid.has(y)) grid.set(y, Array(12).fill(0));
    const months = grid.get(y)!;
    months[r.monthIndex] += r.amount;
    entries.push({
      rowKey: y,
      colKey: HEATMAP_MONTHS[r.monthIndex],
      ts: r.date.getTime(),
      move: {
        date: formatPivotDate(r.date, timezone),
        label: r.categoria,
        amount: r.amount,
      },
    });
  }

  const rows = [...grid.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, months]) => ({ year, months }));

  return { rows, details: buildPivotDetails(entries) };
}

function monthlyAverage(records: IngresoRecord[]): number {
  const monthTotals = new Map<string, number>();
  for (const r of records) {
    monthTotals.set(r.monthKey, (monthTotals.get(r.monthKey) ?? 0) + r.amount);
  }
  const monthsWithData = [...monthTotals.values()].filter((v) => v > 0);
  if (monthsWithData.length === 0) return 0;
  const total = monthsWithData.reduce((a, b) => a + b, 0);
  return total / monthsWithData.length;
}

export async function fetchIngresos(
  client: NocoDbClient,
  persona: Persona,
  timezone: string,
  mode: IngresosFilterMode = "all",
  yearFrom?: string,
  yearTo?: string,
): Promise<IngresosData> {
  const where = personaFilter(persona);
  const bounds = await client.availableYears(TABLES.ingresos, "Fecha", where);
  const availableYears = yearsFromDateBounds(bounds.min, bounds.max, timezone, currentYearKey(timezone));

  const filter = resolveFilterRange(mode, timezone, availableYears, yearFrom, yearTo);
  const currentYear = currentYearKey(timezone);
  const fetchFrom = String(Math.min(Number(filter.from), Number(currentYear)));
  const fetchTo = String(Math.max(Number(filter.to), Number(currentYear)));
  const { from: apiFrom, to: apiTo } = yearBoundsIso(fetchFrom, fetchTo);

  const ingresosRaw = await client.listRecords(TABLES.ingresos, {
    where,
    fields: [...INGRESOS_FIELDS],
    dateFrom: { field: "Fecha", iso: apiFrom },
    dateTo: { field: "Fecha", iso: apiTo },
  });
  const all = mapIngresos(ingresosRaw, timezone);
  const filtered = filterByYears(all, filter.from, filter.to);
  const currentYearTotal = all
    .filter((r) => r.year === currentYear)
    .reduce((sum, r) => sum + r.amount, 0);

  const pivot = buildPivot(filtered, timezone);
  const heatmapData = buildHeatmap(filtered, timezone);

  return {
    metrics: {
      periodTotal: filtered.reduce((sum, r) => sum + r.amount, 0),
      currentYearTotal,
      monthlyAverage: monthlyAverage(filtered),
    },
    availableYears,
    yearlyLine: sumByYear(filtered),
    byOrigen: sumByField(filtered, "origen"),
    byCategoria: sumByField(filtered, "categoria"),
    pivot,
    heatmap: heatmapData.rows,
    heatmapDetails: heatmapData.details,
    filter: { mode, ...filter },
  };
}
