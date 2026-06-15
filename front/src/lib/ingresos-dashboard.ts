import type { NocoDbClient } from "./nocodb";
import { TABLES } from "./config";
import {
  attributedAmount,
  currentYearKey,
  lastNYearsKeys,
  monthIndex,
  parseAmount,
  parseDate,
  personaFilter,
  yearKey,
} from "./persona";
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
}

function mapIngresos(records: Record<string, unknown>[]): IngresoRecord[] {
  return records
    .map((r) => {
      const date = parseDate(r.Fecha);
      if (!date) return null;
      return {
        date,
        amount: attributedAmount(parseAmount(r.Ingreso), r.Persona),
        origen: String(r.Origen ?? "Sin origen"),
        categoria: String(r.Categoría ?? r.Categoria ?? "Sin categoría"),
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
  singleYear?: string,
): { from: string; to: string; year?: string } {
  if (mode === "year" && singleYear) {
    return { from: singleYear, to: singleYear, year: singleYear };
  }
  if (mode === "last5") {
    const { from, to } = lastNYearsKeys(timezone, 5);
    return { from, to };
  }
  if (mode === "range" && yearFrom && yearTo) {
    const from = yearFrom <= yearTo ? yearFrom : yearTo;
    const to = yearFrom <= yearTo ? yearTo : yearFrom;
    return { from, to };
  }
  const from = availableYears[0] ?? currentYearKey(timezone);
  const to = availableYears[availableYears.length - 1] ?? currentYearKey(timezone);
  return { from, to };
}

function filterByYears(records: IngresoRecord[], from: string, to: string, timezone: string): IngresoRecord[] {
  return records.filter((r) => {
    const y = yearKey(r.date, timezone);
    return y >= from && y <= to;
  });
}

function sumByYear(records: IngresoRecord[], timezone: string): IngresosYearPoint[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    const y = yearKey(r.date, timezone);
    totals.set(y, (totals.get(y) ?? 0) + r.amount);
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

function buildPivot(records: IngresoRecord[], timezone: string): { origenKeys: string[]; rows: IngresosPivotRow[] } {
  const origenSet = new Set<string>();
  const grid = new Map<string, Map<string, number>>();

  for (const r of records) {
    origenSet.add(r.origen);
    const y = yearKey(r.date, timezone);
    if (!grid.has(y)) grid.set(y, new Map());
    const row = grid.get(y)!;
    row.set(r.origen, (row.get(r.origen) ?? 0) + r.amount);
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

  return { origenKeys, rows };
}

function buildHeatmap(records: IngresoRecord[], timezone: string): IngresosHeatmapRow[] {
  const grid = new Map<string, number[]>();

  for (const r of records) {
    const y = yearKey(r.date, timezone);
    if (!grid.has(y)) grid.set(y, Array(12).fill(0));
    const months = grid.get(y)!;
    months[monthIndex(r.date, timezone)] += r.amount;
  }

  return [...grid.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, months]) => ({ year, months }));
}

function monthlyAverage(records: IngresoRecord[], timezone: string): number {
  const monthTotals = new Map<string, number>();
  for (const r of records) {
    const key = `${yearKey(r.date, timezone)}-${monthIndex(r.date, timezone)}`;
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + r.amount);
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
  singleYear?: string,
): Promise<IngresosData> {
  const where = personaFilter(persona);
  const ingresosRaw = await client.listRecords(TABLES.ingresos, where);
  const all = mapIngresos(ingresosRaw);

  const yearSet = new Set(all.map((r) => yearKey(r.date, timezone)));
  const availableYears = [...yearSet].sort();

  const filter = resolveFilterRange(mode, timezone, availableYears, yearFrom, yearTo, singleYear);
  const filtered = filterByYears(all, filter.from, filter.to, timezone);

  const currentYear = currentYearKey(timezone);
  const currentYearTotal = all
    .filter((r) => yearKey(r.date, timezone) === currentYear)
    .reduce((sum, r) => sum + r.amount, 0);

  return {
    metrics: {
      periodTotal: filtered.reduce((sum, r) => sum + r.amount, 0),
      currentYearTotal,
      monthlyAverage: monthlyAverage(filtered, timezone),
    },
    availableYears,
    yearlyLine: sumByYear(filtered, timezone),
    byOrigen: sumByField(filtered, "origen"),
    byCategoria: sumByField(filtered, "categoria"),
    pivot: buildPivot(filtered, timezone),
    heatmap: buildHeatmap(filtered, timezone),
    filter: { mode, ...filter },
  };
}
