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
import {
  formatPivotDate,
  type PivotDrilldownMove,
} from "./pivot-drilldown";
import { GASTOS_FIELDS } from "./table-fields";
import type {
  GastosData,
  GastosFilterMode,
  GastosMonthlyRow,
  GastosMove,
  GastosOverviewData,
  GastosNombreData,
  GastosRankingMeal,
  GastosRestauracionData,
  GastosRankingSite,
  GastosSubTab,
  GastosViajesData,
  GastosViajesStackedYearRow,
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
  ubicacion: string | null;
  year: string;
  monthIndex: number;
  monthKey: string;
  day: number;
}

function mapGastos(records: Record<string, unknown>[], timezone: string): GastoRecord[] {
  return records
    .map((r) => {
      const date = parseDate(r.Date ?? r.Fecha);
      const rawAmount = parseAmount(r.Cantidad ?? r.Gasto);
      if (!date || rawAmount === 0) return null;
      const parts = getDateParts(date, timezone);
      return {
        date,
        amount: attributedAmount(rawAmount, r.Persona),
        categoria: String(r.Categoría ?? r.Categoria ?? "Sin categoría"),
        nombre: String(r.Destino ?? r.Nombre ?? "Sin nombre"),
        ubicacion: String(r.Ubicación ?? r.Ubicacion ?? "").trim() || null,
        year: parts.year,
        monthIndex: parts.monthIndex,
        monthKey: parts.monthKey,
        day: parts.day,
      };
    })
    .filter((r): r is GastoRecord => r !== null);
}

function matchesCategory(categoria: string, target: string): boolean {
  return categoria === target || categoria.startsWith(`${target}_`);
}

function isViaxesCategory(categoria: string): boolean {
  return matchesCategory(categoria, "Viaxes");
}

function isReformaPisoCategory(categoria: string): boolean {
  return matchesCategory(categoria, "ReformaPiso");
}

function resolveFilterRange(
  mode: GastosFilterMode,
  timezone: string,
  availableYears: string[],
  yearFrom?: string,
  yearTo?: string,
): { from: string; to: string } {
  return resolvePeriodFilterRange(mode, timezone, availableYears, yearFrom, yearTo);
}

function filterByYears(records: GastoRecord[], from: string, to: string): GastoRecord[] {
  return records.filter((r) => r.year >= from && r.year <= to);
}

function filterForSubTab(records: GastoRecord[], subTab: GastosSubTab): GastoRecord[] {
  if (subTab === "general") return records;
  if (subTab === "vida") {
    return records.filter(
      (r) => !isViaxesCategory(r.categoria) && !isReformaPisoCategory(r.categoria),
    );
  }
  if (subTab === "viajes") {
    return records.filter((r) => matchesCategory(r.categoria, "Viaxes") && r.ubicacion);
  }
  const cat = CATEGORY_BY_SUBTAB[subTab];
  return cat ? records.filter((r) => matchesCategory(r.categoria, cat)) : records;
}

function isWithinYtdCutoff(record: GastoRecord, year: string, refParts: DateParts): boolean {
  if (record.year !== year) return false;
  return (
    record.monthIndex < refParts.monthIndex ||
    (record.monthIndex === refParts.monthIndex && record.day <= refParts.day)
  );
}

function sumYtd(records: GastoRecord[], year: string, refParts: DateParts): number {
  return records
    .filter((r) => isWithinYtdCutoff(r, year, refParts))
    .reduce((sum, r) => sum + r.amount, 0);
}

function buildYtdComparison(
  records: GastoRecord[],
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

interface YtdContext {
  comparisonRecords: GastoRecord[];
  refYear: string;
  refParts: DateParts;
  availableYears: string[];
  enabled: boolean;
}

function ytdFromContext(ctx: YtdContext): GastosYtdComparison | null {
  if (!ctx.enabled) return null;
  return buildYtdComparison(ctx.comparisonRecords, ctx.refParts, ctx.refYear, ctx.availableYears);
}

function sumByKey(records: GastoRecord[], keyFn: (r: GastoRecord) => string): NamedAmount[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    const key = keyFn(r);
    totals.set(key, (totals.get(key) ?? 0) + r.amount);
  }
  return [...totals.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([name, total]) => ({ name, total }));
}

function sumByField(records: GastoRecord[], field: "categoria" | "nombre"): NamedAmount[] {
  return sumByKey(records, (r) => r[field]);
}

function countByField(records: GastoRecord[], field: "nombre"): NamedAmount[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    const key = r[field];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([name, total]) => ({ name, total }));
}

function sumAndCountByField(records: GastoRecord[], field: "nombre"): GastosRankingSite[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const r of records) {
    const key = r[field];
    const prev = totals.get(key) ?? { total: 0, count: 0 };
    totals.set(key, { total: prev.total + r.amount, count: prev.count + 1 });
  }
  return [...totals.entries()]
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([name, { total, count }]) => ({ name, total, count }));
}

function categoriaNivel1(categoria: string): string {
  return categoria.split("_")[0] || categoria;
}

function buildMonthlyTable(
  records: GastoRecord[],
  keys: string[],
  keyFn: (r: GastoRecord) => string,
): GastosMonthlyRow[] {
  const grid = new Map<number, Map<string, number>>();

  for (const r of records) {
    const idx = r.monthIndex;
    const key = keyFn(r);
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

function gastoPivotMove(record: GastoRecord, timezone: string): PivotDrilldownMove {
  return {
    date: formatPivotDate(record.date, timezone),
    label: record.nombre,
    amount: record.amount,
    meta: record.categoria,
  };
}

export type GastosDrilldownView = "overview" | "nombre" | "viajes";

function filterDrilldownRecords(
  records: GastoRecord[],
  view: GastosDrilldownView,
  row: string,
  col: string,
): GastoRecord[] {
  return records.filter((record) => {
    if (view === "overview") {
      return MONTH_LABELS[record.monthIndex] === row && categoriaNivel1(record.categoria) === col;
    }
    if (view === "nombre") {
      return MONTH_LABELS[record.monthIndex] === row && record.nombre === col;
    }
    return record.ubicacion === row && viajeCategoriaNivel1(record.categoria) === col;
  });
}

async function prepareGastosDataset(
  client: NocoDbClient,
  persona: Persona,
  timezone: string,
  subTab: GastosSubTab,
  mode: GastosFilterMode,
  yearFrom?: string,
  yearTo?: string,
): Promise<{
  filtered: GastoRecord[];
  availableYears: string[];
  filter: { mode: GastosFilterMode; from: string; to: string };
  ytd: YtdContext;
}> {
  const where = personaFilter(persona);
  const bounds = await client.availableYears(TABLES.gastos, "Date", where);
  const availableYears = yearsFromDateBounds(bounds.min, bounds.max, timezone, currentYearKey(timezone));
  const filter = resolveFilterRange(mode, timezone, availableYears, yearFrom, yearTo);
  const singleYearFilter = filter.from === filter.to;
  let fetchFrom = Number(filter.from);
  const fetchTo = Number(filter.to);
  if (singleYearFilter) {
    const comparisonYear = String(Number(filter.to) - 1);
    if (availableYears.includes(comparisonYear)) {
      fetchFrom = Math.min(fetchFrom, Number(comparisonYear));
    }
  }
  const { from: apiFrom, to: apiTo } = yearBoundsIso(String(fetchFrom), String(fetchTo));

  const raw = await client.listRecords(TABLES.gastos, {
    where,
    fields: [...GASTOS_FIELDS],
    dateFrom: { field: "Date", iso: apiFrom },
    dateTo: { field: "Date", iso: apiTo },
  });
  const all = mapGastos(raw, timezone);
  const comparisonRecords = filterForSubTab(all, subTab);
  const yearFiltered = filterByYears(all, filter.from, filter.to);
  const filtered = filterForSubTab(yearFiltered, subTab);
  const ytd: YtdContext = {
    comparisonRecords,
    refYear: filter.to,
    refParts: getDateParts(new Date(), timezone),
    availableYears,
    enabled: singleYearFilter,
  };

  return { filtered, availableYears, filter: { mode, ...filter }, ytd };
}

async function loadFilteredGastosRecords(
  client: NocoDbClient,
  persona: Persona,
  timezone: string,
  subTab: GastosSubTab,
  mode: GastosFilterMode,
  yearFrom?: string,
  yearTo?: string,
): Promise<GastoRecord[]> {
  const { filtered } = await prepareGastosDataset(
    client,
    persona,
    timezone,
    subTab,
    mode,
    yearFrom,
    yearTo,
  );
  return filtered;
}

export async function fetchGastosDrilldown(
  client: NocoDbClient,
  persona: Persona,
  timezone: string,
  subTab: GastosSubTab,
  mode: GastosFilterMode,
  view: GastosDrilldownView,
  row: string,
  col: string,
  yearFrom?: string,
  yearTo?: string,
): Promise<PivotDrilldownMove[]> {
  const records = await loadFilteredGastosRecords(
    client,
    persona,
    timezone,
    subTab,
    mode,
    yearFrom,
    yearTo,
  );
  return filterDrilldownRecords(records, view, row, col)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((record) => gastoPivotMove(record, timezone));
}

function monthlyEvolution(records: GastoRecord[]): number[] {
  const byYearMonth = new Map<string, number>();
  for (const r of records) {
    const key = `${r.year}-${r.monthIndex}`;
    byYearMonth.set(key, (byYearMonth.get(key) ?? 0) + r.amount);
  }

  const totalsByMonth: number[][] = Array.from({ length: 12 }, () => []);
  for (const [key, total] of byYearMonth) {
    const idx = Number(key.split("-").pop());
    totalsByMonth[idx].push(total);
  }

  return totalsByMonth.map((totals) =>
    totals.length === 0 ? 0 : totals.reduce((a, b) => a + b, 0) / totals.length,
  );
}

function monthlyAverage(records: GastoRecord[]): number {
  const monthTotals = new Map<string, number>();
  for (const r of records) {
    monthTotals.set(r.monthKey, (monthTotals.get(r.monthKey) ?? 0) + r.amount);
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
      date: formatMoveDate(r.date, timezone),
      concept: r.nombre,
      amount: r.amount,
    }));
}

function formatMoveDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
  }).format(date);
}

function topExpensiveMeals(records: GastoRecord[], timezone: string, limit = 10): GastosRankingMeal[] {
  return [...records]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((r) => ({
      name: `${r.nombre} · ${formatMoveDate(r.date, timezone)}`,
      total: r.amount,
      site: r.nombre,
    }));
}

function buildOverview(records: GastoRecord[], ytd: YtdContext): GastosOverviewData {
  const keyFn = (r: GastoRecord) => categoriaNivel1(r.categoria);
  const byCategoria = sumByKey(records, keyFn);
  const keys = byCategoria.map((c) => c.name);
  const monthlyTable = buildMonthlyTable(records, keys, keyFn);
  const total = records.reduce((sum, r) => sum + r.amount, 0);

  return {
    total,
    records: records.length,
    ytdComparison: ytdFromContext(ytd),
    byCategoria,
    categoriaKeys: keys,
    monthlyTable,
  };
}

function buildNombreDetail(
  records: GastoRecord[],
  timezone: string,
  showMonthlyTable: boolean,
  ytd: YtdContext,
): GastosNombreData {
  const byNombre = sumByField(records, "nombre");
  const nameKeys = byNombre.map((n) => n.name);
  const total = records.reduce((sum, r) => sum + r.amount, 0);

  return {
    total,
    monthlyAverage: monthlyAverage(records),
    ytdComparison: ytdFromContext(ytd),
    byNombre,
    nameKeys,
    monthlyEvolution: monthlyEvolution(records),
    monthlyByNombre: showMonthlyTable
      ? buildMonthlyTable(records, nameKeys, (r) => r.nombre)
      : undefined,
    recentMoves: recentMoves(records, timezone),
  };
}

function viajeCategoriaNivel1(categoria: string): string {
  const rest = categoria.startsWith("Viaxes_") ? categoria.slice("Viaxes_".length) : categoria;
  return rest.split("_")[0] || categoria;
}

function buildViajes(records: GastoRecord[], ytd: YtdContext): GastosViajesData {
  const byYearTrip = new Map<string, Map<string, number>>();
  const ubicTotals = new Map<string, number>();
  const pivotMap = new Map<string, Map<string, number>>();

  for (const r of records) {
    const trip = r.ubicacion!;
    const y = r.year;
    const cat = viajeCategoriaNivel1(r.categoria);

    if (!byYearTrip.has(y)) byYearTrip.set(y, new Map());
    const trips = byYearTrip.get(y)!;
    trips.set(trip, (trips.get(trip) ?? 0) + r.amount);

    ubicTotals.set(trip, (ubicTotals.get(trip) ?? 0) + r.amount);

    if (!pivotMap.has(trip)) pivotMap.set(trip, new Map());
    const pivotRow = pivotMap.get(trip)!;
    pivotRow.set(cat, (pivotRow.get(cat) ?? 0) + r.amount);
  }

  const ubicacionKeys = [...ubicTotals.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => name);

  const tripsByYear = [...byYearTrip.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, tripsMap]) => ({
      year,
      trips: [...tripsMap.entries()]
        .sort(([, a], [, b]) => b - a)
        .map(([nombre, total]) => ({ nombre, total })),
    }));

  const stackedByYear = [...byYearTrip.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, tripsMap]) => {
      const row: GastosViajesStackedYearRow = { year, total: 0 };
      for (const ubic of ubicacionKeys) {
        const amount = tripsMap.get(ubic) ?? 0;
        if (amount > 0) row[ubic] = amount;
        row.total += amount;
      }
      return row;
    });

  const colTotals: Record<string, number> = {};
  for (const cats of pivotMap.values()) {
    for (const [cat, amount] of cats) {
      colTotals[cat] = (colTotals[cat] ?? 0) + amount;
    }
  }
  const categorias = Object.entries(colTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([cat]) => cat);

  const pivotRows = [...pivotMap.entries()]
    .sort(([, a], [, b]) => {
      const sum = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0);
      return sum(b) - sum(a);
    })
    .map(([ubicacion, cats]) => {
      const byCategoria: Record<string, number> = Object.fromEntries(categorias.map((c) => [c, 0]));
      let total = 0;
      for (const [cat, amount] of cats) {
        byCategoria[cat] = (byCategoria[cat] ?? 0) + amount;
        total += amount;
      }
      return { ubicacion, byCategoria, total };
    });

  const tripCount = records.reduce((set, r) => {
    set.add(`${r.year}:${r.ubicacion}`);
    return set;
  }, new Set<string>()).size;

  const grandTotal = pivotRows.reduce((sum, row) => sum + row.total, 0);

  return {
    total: records.reduce((sum, r) => sum + r.amount, 0),
    tripCount,
    ytdComparison: ytdFromContext(ytd),
    tripsByYear,
    stackedByYear,
    ubicacionKeys,
    pivot: { categorias, rows: pivotRows, colTotals, grandTotal },
  };
}

function buildRestauracion(records: GastoRecord[], timezone: string, ytd: YtdContext): GastosRestauracionData {
  const byMonth = new Map<string, GastoRecord[]>();

  for (const r of records) {
    if (!byMonth.has(r.monthKey)) byMonth.set(r.monthKey, []);
    byMonth.get(r.monthKey)!.push(r);
  }

  const sortedKeys = [...byMonth.keys()].sort();
  const stackedByMonth = sortedKeys.map((key) => {
    const monthRecords = byMonth.get(key) ?? [];
    const byConcept = new Map<string, number>();
    for (const r of monthRecords) {
      byConcept.set(r.nombre, (byConcept.get(r.nombre) ?? 0) + r.amount);
    }
    const tickets = [...byConcept.entries()]
      .map(([concept, amount]) => ({ concept, amount }))
      .sort((a, b) => b.amount - a.amount);
    const [year, month] = key.split("-");
    const monthLabel = `${MONTH_LABELS[Number(month) - 1]} ${year.slice(2)}`;
    return { monthKey: key, monthLabel, tickets };
  });

  const monthlySummary = sortedKeys.map((key) => {
    const monthRecords = byMonth.get(key) ?? [];
    const [year, month] = key.split("-");
    const monthLabel = `${MONTH_LABELS[Number(month) - 1]} ${year.slice(2)}`;
    return {
      monthLabel,
      total: monthRecords.reduce((sum, r) => sum + r.amount, 0),
      tickets: monthRecords.length,
    };
  });

  const total = records.reduce((sum, r) => sum + r.amount, 0);

  return {
    total,
    monthlyAverage: monthlyAverage(records),
    ytdComparison: ytdFromContext(ytd),
    stackedByMonth,
    monthlySummary,
    topByVisits: countByField(records, "nombre").slice(0, 10),
    topBySpending: sumAndCountByField(records, "nombre").slice(0, 10),
    topExpensiveMeals: topExpensiveMeals(records, timezone),
    recentMoves: recentMoves(records, timezone),
  };
}

function buildPayload(
  records: GastoRecord[],
  subTab: GastosSubTab,
  timezone: string,
  ytd: YtdContext,
): GastosData["payload"] {
  if (subTab === "general" || subTab === "vida") {
    return { kind: "overview", data: buildOverview(records, ytd) };
  }
  if (subTab === "supermercado") {
    return { kind: "nombre", data: buildNombreDetail(records, timezone, false, ytd) };
  }
  if (subTab === "piso") {
    return { kind: "nombre", data: buildNombreDetail(records, timezone, true, ytd) };
  }
  if (subTab === "viajes") {
    return { kind: "viajes", data: buildViajes(records, ytd) };
  }
  return { kind: "restauracion", data: buildRestauracion(records, timezone, ytd) };
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
  const { filtered, availableYears, filter, ytd } = await prepareGastosDataset(
    client,
    persona,
    timezone,
    subTab,
    mode,
    yearFrom,
    yearTo,
  );

  return {
    subTab,
    availableYears,
    filter,
    payload: buildPayload(filtered, subTab, timezone, ytd),
  };
}
