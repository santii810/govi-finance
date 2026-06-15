import type { NocoDbClient } from "./nocodb";
import { TABLES } from "./config";
import {
  attributedAmount,
  currentYearKey,
  lastNYearsKeys,
  monthIndex,
  monthKey,
  parseAmount,
  parseDate,
  personaFilter,
  yearKey,
} from "./persona";
import type {
  GastosData,
  GastosFilterMode,
  GastosMonthlyRow,
  GastosMove,
  GastosOverviewData,
  GastosNombreData,
  GastosRestauracionData,
  GastosSubTab,
  GastosViajesData,
  GastosYtdComparison,
  NamedAmount,
  Persona,
} from "./types";

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const CATEGORY_BY_SUBTAB: Partial<Record<GastosSubTab, string>> = {
  supermercado: "Supermercado",
  piso: "Piso",
  viajes: "Viaxes",
  restauracion: "Restauración",
};

interface GastoRecord {
  date: Date;
  amount: number;
  categoria: string;
  nombre: string;
}

function matchesCategory(categoria: string, target: string): boolean {
  return categoria === target || categoria.startsWith(`${target}_`);
}

function isViaxesCategory(categoria: string): boolean {
  return matchesCategory(categoria, "Viaxes");
}

function mapGastos(records: Record<string, unknown>[]): GastoRecord[] {
  return records
    .map((r) => {
      const date = parseDate(r.Date ?? r.Fecha);
      const rawAmount = parseAmount(r.Cantidad ?? r.Gasto);
      if (!date || rawAmount === 0) return null;
      return {
        date,
        amount: attributedAmount(rawAmount, r.Persona),
        categoria: String(r.Categoría ?? r.Categoria ?? "Sin categoría"),
        nombre: String(r.Destino ?? r.Nombre ?? "Sin nombre"),
      };
    })
    .filter((r): r is GastoRecord => r !== null);
}

function resolveFilterRange(
  mode: GastosFilterMode,
  timezone: string,
  availableYears: string[],
  yearFrom?: string,
  yearTo?: string,
): { from: string; to: string } {
  if (mode === "current") {
    const y = currentYearKey(timezone);
    return { from: y, to: y };
  }
  if (mode === "last5") {
    return lastNYearsKeys(timezone, 5);
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

function filterByYears(records: GastoRecord[], from: string, to: string, timezone: string): GastoRecord[] {
  return records.filter((r) => {
    const y = yearKey(r.date, timezone);
    return y >= from && y <= to;
  });
}

function filterForSubTab(records: GastoRecord[], subTab: GastosSubTab): GastoRecord[] {
  if (subTab === "general") return records;
  if (subTab === "vida") {
    return records.filter((r) => !isViaxesCategory(r.categoria) && r.categoria !== "ReformaPiso");
  }
  const cat = CATEGORY_BY_SUBTAB[subTab];
  return cat ? records.filter((r) => matchesCategory(r.categoria, cat)) : records;
}

function dayOfMonth(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, day: "numeric" }).formatToParts(date);
  return Number(parts.find((p) => p.type === "day")?.value ?? 1);
}

function isWithinYtdCutoff(date: Date, year: string, timezone: string): boolean {
  const now = new Date();
  const y = yearKey(date, timezone);
  if (y !== year) return false;
  const m = monthIndex(date, timezone);
  const d = dayOfMonth(date, timezone);
  const refM = monthIndex(now, timezone);
  const refD = dayOfMonth(now, timezone);
  return m < refM || (m === refM && d <= refD);
}

function sumYtd(records: GastoRecord[], year: string, timezone: string): number {
  return records
    .filter((r) => isWithinYtdCutoff(r.date, year, timezone))
    .reduce((sum, r) => sum + r.amount, 0);
}

function buildYtdComparison(records: GastoRecord[], timezone: string): GastosYtdComparison | null {
  const currentYear = currentYearKey(timezone);
  const prevYear = String(Number(currentYear) - 1);
  const currentYtd = sumYtd(records, currentYear, timezone);
  const previousYtd = sumYtd(records, prevYear, timezone);
  const delta = currentYtd - previousYtd;
  const abs = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.abs(delta));
  let label: string;
  if (delta > 0) label = `+${abs} € vs año pasado a hoy`;
  else if (delta < 0) label = `−${abs} € vs año pasado a hoy`;
  else label = `±0 € vs año pasado a hoy`;
  return { delta, label };
}

function sumByField(records: GastoRecord[], field: "categoria" | "nombre"): NamedAmount[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    const key = r[field];
    totals.set(key, (totals.get(key) ?? 0) + r.amount);
  }
  return [...totals.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([name, total]) => ({ name, total }));
}

function buildMonthlyTable(
  records: GastoRecord[],
  keys: string[],
  keyField: "categoria" | "nombre",
  timezone: string,
): GastosMonthlyRow[] {
  const grid = new Map<number, Map<string, number>>();

  for (const r of records) {
    const idx = monthIndex(r.date, timezone);
    const key = r[keyField];
    if (!keys.includes(key)) continue;
    if (!grid.has(idx)) grid.set(idx, new Map());
    const row = grid.get(idx)!;
    row.set(key, (row.get(key) ?? 0) + r.amount);
  }

  return MONTH_LABELS.map((month, idx) => {
    const values: Record<string, number> = {};
    let total = 0;
    for (const key of keys) {
      const v = grid.get(idx)?.get(key) ?? 0;
      values[key] = v;
      total += v;
    }
    return { month, values, total };
  }).filter((row) => row.total > 0);
}

function monthlyEvolution(records: GastoRecord[], timezone: string): number[] {
  const months = Array(12).fill(0);
  for (const r of records) {
    months[monthIndex(r.date, timezone)] += r.amount;
  }
  return months;
}

function monthlyAverage(records: GastoRecord[], timezone: string): number {
  const monthTotals = new Map<string, number>();
  for (const r of records) {
    const key = monthKey(r.date, timezone);
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + r.amount);
  }
  const monthsWithData = [...monthTotals.values()].filter((v) => v > 0);
  if (monthsWithData.length === 0) return 0;
  return monthsWithData.reduce((a, b) => a + b, 0) / monthsWithData.length;
}

function recentMoves(records: GastoRecord[], timezone: string, limit = 5): GastosMove[] {
  return [...records]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit)
    .map((r) => ({
      date: new Intl.DateTimeFormat("es-ES", {
        timeZone: timezone,
        day: "numeric",
        month: "short",
      }).format(r.date),
      concept: r.nombre,
      amount: r.amount,
    }));
}

function buildOverview(records: GastoRecord[], timezone: string): GastosOverviewData {
  const byCategoria = sumByField(records, "categoria");
  const keys = byCategoria.map((c) => c.name);
  const monthlyTable = buildMonthlyTable(records, keys, "categoria", timezone);
  const total = records.reduce((sum, r) => sum + r.amount, 0);

  return {
    total,
    records: records.length,
    ytdComparison: buildYtdComparison(records, timezone),
    byCategoria,
    categoriaKeys: keys,
    monthlyTable,
  };
}

function buildNombreDetail(
  records: GastoRecord[],
  timezone: string,
  showMonthlyTable: boolean,
): GastosNombreData {
  const byNombre = sumByField(records, "nombre");
  const nameKeys = byNombre.map((n) => n.name);
  const total = records.reduce((sum, r) => sum + r.amount, 0);

  return {
    total,
    monthlyAverage: monthlyAverage(records, timezone),
    ytdComparison: buildYtdComparison(records, timezone),
    byNombre,
    nameKeys,
    monthlyEvolution: monthlyEvolution(records, timezone),
    monthlyByNombre: showMonthlyTable
      ? buildMonthlyTable(records, nameKeys, "nombre", timezone)
      : undefined,
    recentMoves: recentMoves(records, timezone),
  };
}

function buildViajes(records: GastoRecord[], timezone: string): GastosViajesData {
  const byYearTrip = new Map<string, Map<string, number>>();

  for (const r of records) {
    const y = yearKey(r.date, timezone);
    if (!byYearTrip.has(y)) byYearTrip.set(y, new Map());
    const trips = byYearTrip.get(y)!;
    trips.set(r.nombre, (trips.get(r.nombre) ?? 0) + r.amount);
  }

  const tripsByYear = [...byYearTrip.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, tripsMap]) => ({
      year,
      trips: [...tripsMap.entries()]
        .sort(([, a], [, b]) => b - a)
        .map(([nombre, total]) => ({ nombre, total })),
    }));

  const tripCount = records.reduce((set, r) => {
    set.add(`${yearKey(r.date, timezone)}:${r.nombre}`);
    return set;
  }, new Set<string>()).size;

  return {
    total: records.reduce((sum, r) => sum + r.amount, 0),
    tripCount,
    ytdComparison: buildYtdComparison(records, timezone),
    tripsByYear,
  };
}

function buildRestauracion(records: GastoRecord[], timezone: string): GastosRestauracionData {
  const byMonth = new Map<string, number[]>();

  for (const r of records) {
    const key = monthKey(r.date, timezone);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(r.amount);
  }

  const sortedKeys = [...byMonth.keys()].sort();
  const stackedByMonth = sortedKeys.map((key) => {
    const tickets = [...(byMonth.get(key) ?? [])].sort((a, b) => b - a);
    const [year, month] = key.split("-");
    const monthLabel = `${MONTH_LABELS[Number(month) - 1]} ${year.slice(2)}`;
    return { monthKey: key, monthLabel, tickets };
  });

  const monthlySummary = stackedByMonth.map((row) => ({
    monthLabel: row.monthLabel,
    total: row.tickets.reduce((a, b) => a + b, 0),
    tickets: row.tickets.length,
  }));

  const total = records.reduce((sum, r) => sum + r.amount, 0);

  return {
    total,
    monthlyAverage: monthlyAverage(records, timezone),
    ytdComparison: buildYtdComparison(records, timezone),
    stackedByMonth,
    monthlySummary,
    recentMoves: recentMoves(records, timezone),
  };
}

function buildPayload(
  records: GastoRecord[],
  subTab: GastosSubTab,
  timezone: string,
): GastosData["payload"] {
  if (subTab === "general" || subTab === "vida") {
    return { kind: "overview", data: buildOverview(records, timezone) };
  }
  if (subTab === "supermercado") {
    return { kind: "nombre", data: buildNombreDetail(records, timezone, false) };
  }
  if (subTab === "piso") {
    return { kind: "nombre", data: buildNombreDetail(records, timezone, true) };
  }
  if (subTab === "viajes") {
    return { kind: "viajes", data: buildViajes(records, timezone) };
  }
  return { kind: "restauracion", data: buildRestauracion(records, timezone) };
}

export async function fetchGastos(
  client: NocoDbClient,
  persona: Persona,
  timezone: string,
  subTab: GastosSubTab,
  mode: GastosFilterMode = "current",
  yearFrom?: string,
  yearTo?: string,
): Promise<GastosData> {
  const where = personaFilter(persona);
  const raw = await client.listRecords(TABLES.gastos, where);
  const all = mapGastos(raw);

  const yearSet = new Set(all.map((r) => yearKey(r.date, timezone)));
  const availableYears = [...yearSet].sort();

  const filter = resolveFilterRange(mode, timezone, availableYears, yearFrom, yearTo);
  const yearFiltered = filterByYears(all, filter.from, filter.to, timezone);
  const filtered = filterForSubTab(yearFiltered, subTab);

  return {
    subTab,
    availableYears,
    filter: { mode, ...filter },
    payload: buildPayload(filtered, subTab, timezone),
  };
}
