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
  type DateParts,
} from "./persona";
import { resolvePeriodFilterRange } from "./period-filter";
import { buildPivotDetails, formatPivotDate, type PivotDrilldownMove } from "./pivot-drilldown";
import { INVERSIONES_FIELDS } from "./table-fields";
import type {
  IngresosHeatmapRow,
  IngresosPivotRow,
  IngresosYearPoint,
  GastosYtdComparison,
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
  year: string;
  monthIndex: number;
  monthKey: string;
  day: number;
}

function mapInversiones(records: Record<string, unknown>[], timezone: string): InversionRecord[] {
  return records
    .map((r) => {
      const date = parseDate(r.Fecha);
      if (!date) return null;
      const parts = getDateParts(date, timezone);
      return {
        date,
        amount: attributedAmount(parseAmount(r.Importe), r.Persona),
        entidad: String(r.Entidad ?? "Sin entidad"),
        tipo: String(r.Tipo ?? "Sin tipo"),
        nombre: String(r.Nombre ?? "Sin nombre"),
        year: parts.year,
        monthIndex: parts.monthIndex,
        monthKey: parts.monthKey,
        day: parts.day,
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
): { from: string; to: string } {
  return resolvePeriodFilterRange(mode, timezone, availableYears, yearFrom, yearTo);
}

function filterByYears(
  records: InversionRecord[],
  from: string,
  to: string,
): InversionRecord[] {
  return records.filter((r) => r.year >= from && r.year <= to);
}

function sumByYear(records: InversionRecord[]): IngresosYearPoint[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    totals.set(r.year, (totals.get(r.year) ?? 0) + r.amount);
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
): { entidadKeys: string[]; rows: IngresosPivotRow[]; details: Record<string, PivotDrilldownMove[]> } {
  const entidadSet = new Set<string>();
  const grid = new Map<string, Map<string, number>>();
  const entries: Array<{ rowKey: string; colKey: string; ts: number; move: PivotDrilldownMove }> = [];

  for (const r of records) {
    entidadSet.add(r.entidad);
    const y = r.year;
    if (!grid.has(y)) grid.set(y, new Map());
    const row = grid.get(y)!;
    row.set(r.entidad, (row.get(r.entidad) ?? 0) + r.amount);
    entries.push({
      rowKey: y,
      colKey: r.entidad,
      ts: r.date.getTime(),
      move: {
        date: formatPivotDate(r.date, timezone),
        label: r.nombre,
        amount: r.amount,
        meta: r.tipo,
      },
    });
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

  return { entidadKeys, rows, details: buildPivotDetails(entries) };
}

const HEATMAP_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function buildHeatmap(
  records: InversionRecord[],
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
        label: r.nombre,
        amount: r.amount,
        meta: r.entidad,
      },
    });
  }

  const rows = [...grid.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, months]) => ({ year, months }));

  return { rows, details: buildPivotDetails(entries) };
}

function isWithinYtdCutoff(record: InversionRecord, year: string, refParts: DateParts): boolean {
  if (record.year !== year) return false;
  return (
    record.monthIndex < refParts.monthIndex ||
    (record.monthIndex === refParts.monthIndex && record.day <= refParts.day)
  );
}

function sumYtd(records: InversionRecord[], year: string, refParts: DateParts): number {
  return records
    .filter((r) => isWithinYtdCutoff(r, year, refParts))
    .reduce((sum, r) => sum + r.amount, 0);
}

function buildYtdComparison(
  records: InversionRecord[],
  refParts: DateParts,
  refYear: string,
  availableYears: string[],
): GastosYtdComparison | null {
  const prevYear = String(Number(refYear) - 1);
  if (!availableYears.includes(prevYear)) return null;

  const currentYtd = sumYtd(records, refYear, refParts);
  const previousYtd = sumYtd(records, prevYear, refParts);
  const delta = currentYtd - previousYtd;
  const abs = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.abs(delta));
  let label: string;
  if (delta > 0) label = `+${abs} € vs año pasado a hoy`;
  else if (delta < 0) label = `−${abs} € vs año pasado a hoy`;
  else label = `±0 € vs año pasado a hoy`;
  return { delta, label };
}

function monthlyAverage(records: InversionRecord[]): number {
  const monthTotals = new Map<string, number>();
  for (const r of records) {
    monthTotals.set(r.monthKey, (monthTotals.get(r.monthKey) ?? 0) + r.amount);
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
): Promise<InversionesData> {
  const where = personaFilter(persona);
  const bounds = await client.availableYears(TABLES.inversiones, "Fecha", where);
  const availableYears = yearsFromDateBounds(bounds.min, bounds.max, timezone, currentYearKey(timezone));

  const filter = resolveFilterRange(mode, timezone, availableYears, yearFrom, yearTo);
  const currentYear = currentYearKey(timezone);
  const prevYear = String(Number(currentYear) - 1);
  let fetchFrom = Math.min(Number(filter.from), Number(currentYear));
  if (availableYears.includes(prevYear)) {
    fetchFrom = Math.min(fetchFrom, Number(prevYear));
  }
  const fetchTo = Math.max(Number(filter.to), Number(currentYear));
  const { from: apiFrom, to: apiTo } = yearBoundsIso(String(fetchFrom), String(fetchTo));

  const raw = await client.listRecords(TABLES.inversiones, {
    where,
    fields: [...INVERSIONES_FIELDS],
    dateFrom: { field: "Fecha", iso: apiFrom },
    dateTo: { field: "Fecha", iso: apiTo },
  });
  const all = mapInversiones(raw, timezone);
  const filtered = filterByYears(all, filter.from, filter.to);
  const refParts = getDateParts(new Date(), timezone);
  const currentYearTotal = sumYtd(all, currentYear, refParts);
  const ytdComparison = buildYtdComparison(all, refParts, currentYear, availableYears);
  const heatmapData = buildHeatmap(filtered, timezone);

  return {
    metrics: {
      periodTotal: filtered.reduce((sum, r) => sum + r.amount, 0),
      currentYearTotal,
      monthlyAverage: monthlyAverage(filtered),
    },
    ytdComparison,
    availableYears,
    yearlyLine: sumByYear(filtered),
    byEntidad: sumByField(filtered, "entidad"),
    byTipo: sumByField(filtered, "tipo"),
    byNombre: sumByField(filtered, "nombre"),
    pivot: buildPivot(filtered, timezone),
    heatmap: heatmapData.rows,
    heatmapDetails: heatmapData.details,
    filter: { mode, ...filter },
  };
}
