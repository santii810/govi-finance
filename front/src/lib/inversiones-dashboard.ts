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
  IngresosHeatmapRow,
  IngresosPivotRow,
  IngresosYearPoint,
  InversionesData,
  InversionesFilterMode,
  NamedAmount,
  Persona,
} from "./types";

interface InversionRecord {
  date: Date;
  amount: number;
  entidad: string;
  tipo: string;
  nombre: string;
}

function mapInversiones(records: Record<string, unknown>[]): InversionRecord[] {
  return records
    .map((r) => {
      const date = parseDate(r.Fecha);
      if (!date) return null;
      return {
        date,
        amount: attributedAmount(parseAmount(r.Importe), r.Persona),
        entidad: String(r.Entidad ?? "Sin entidad"),
        tipo: String(r.Tipo ?? "Sin tipo"),
        nombre: String(r.Nombre ?? "Sin nombre"),
      };
    })
    .filter((r): r is InversionRecord => r !== null);
}

function resolveFilterRange(
  mode: InversionesFilterMode,
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

function filterByYears(
  records: InversionRecord[],
  from: string,
  to: string,
  timezone: string,
): InversionRecord[] {
  return records.filter((r) => {
    const y = yearKey(r.date, timezone);
    return y >= from && y <= to;
  });
}

function sumByYear(records: InversionRecord[], timezone: string): IngresosYearPoint[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    const y = yearKey(r.date, timezone);
    totals.set(y, (totals.get(y) ?? 0) + r.amount);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, total]) => ({ year, total }));
}

function sumByField(
  records: InversionRecord[],
  field: "entidad" | "tipo" | "nombre",
): NamedAmount[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    const key = r[field];
    totals.set(key, (totals.get(key) ?? 0) + r.amount);
  }
  return [...totals.entries()]
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .map(([name, total]) => ({ name, total }));
}

function buildPivot(
  records: InversionRecord[],
  timezone: string,
): { entidadKeys: string[]; rows: IngresosPivotRow[] } {
  const entidadSet = new Set<string>();
  const grid = new Map<string, Map<string, number>>();

  for (const r of records) {
    entidadSet.add(r.entidad);
    const y = yearKey(r.date, timezone);
    if (!grid.has(y)) grid.set(y, new Map());
    const row = grid.get(y)!;
    row.set(r.entidad, (row.get(r.entidad) ?? 0) + r.amount);
  }

  const entidadKeys = [...entidadSet].sort((a, b) => a.localeCompare(b));
  const rows: IngresosPivotRow[] = [...grid.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, valuesMap]) => {
      const values: Record<string, number> = {};
      let total = 0;
      for (const key of entidadKeys) {
        const v = valuesMap.get(key) ?? 0;
        values[key] = v;
        total += v;
      }
      return { year, values, total };
    });

  return { entidadKeys, rows };
}

function buildHeatmap(records: InversionRecord[], timezone: string): IngresosHeatmapRow[] {
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

function monthlyAverage(records: InversionRecord[], timezone: string): number {
  const monthTotals = new Map<string, number>();
  for (const r of records) {
    const key = `${yearKey(r.date, timezone)}-${monthIndex(r.date, timezone)}`;
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + r.amount);
  }
  const monthsWithData = [...monthTotals.values()].filter((v) => v !== 0);
  if (monthsWithData.length === 0) return 0;
  const total = monthsWithData.reduce((a, b) => a + b, 0);
  return total / monthsWithData.length;
}

export async function fetchInversiones(
  client: NocoDbClient,
  persona: Persona,
  timezone: string,
  mode: InversionesFilterMode = "all",
  yearFrom?: string,
  yearTo?: string,
  singleYear?: string,
): Promise<InversionesData> {
  const where = personaFilter(persona);
  const raw = await client.listRecords(TABLES.inversiones, where);
  const all = mapInversiones(raw);

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
    byEntidad: sumByField(filtered, "entidad"),
    byTipo: sumByField(filtered, "tipo"),
    byNombre: sumByField(filtered, "nombre"),
    pivot: buildPivot(filtered, timezone),
    heatmap: buildHeatmap(filtered, timezone),
    filter: { mode, ...filter },
  };
}
