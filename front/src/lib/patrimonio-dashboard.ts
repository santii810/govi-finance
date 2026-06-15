import type { NocoDbClient } from "./nocodb";
import { TABLES } from "./config";
import {
  attributedAmount,
  currentYearKey,
  lastNYearsKeys,
  parseAmount,
  parseDate,
  personaFilter,
  yearKey,
} from "./persona";
import type {
  InmobiliarioRow,
  NamedAmount,
  PatrimonioData,
  PatrimonioFilterMode,
  PatrimonioSnapshotPoint,
  PatrimonioTipoSnapshotRow,
  Persona,
} from "./types";

const TIPO_ORDER = ["Liquidez", "Renta variable", "Crypto", "Inmobiliario", "Otro"];
const RENTA_VARIABLE = "renta variable";
const INMOBILIARIO = "inmobiliario";

interface PatrimonioRecord {
  date: Date;
  snapshotKey: string;
  amount: number;
  tipo: string;
  nombre: string;
}

function snapshotKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatSnapshotLabel(key: string, timezone: string): string {
  const d = new Date(`${key}T12:00:00`);
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: timezone,
    month: "short",
    year: "2-digit",
  }).format(d);
}

function mapPatrimonio(records: Record<string, unknown>[], timezone: string): PatrimonioRecord[] {
  return records
    .map((r) => {
      const date = parseDate(r.Fecha);
      if (!date) return null;
      return {
        date,
        snapshotKey: snapshotKey(date, timezone),
        amount: attributedAmount(parseAmount(r.Valor), r.Persona),
        tipo: String(r.Tipo ?? "Otro"),
        nombre: String(r.Nombre ?? "Sin nombre"),
      };
    })
    .filter((r): r is PatrimonioRecord => r !== null);
}

function groupBySnapshot(records: PatrimonioRecord[]): Map<string, PatrimonioRecord[]> {
  const map = new Map<string, PatrimonioRecord[]>();
  for (const r of records) {
    const list = map.get(r.snapshotKey) ?? [];
    list.push(r);
    map.set(r.snapshotKey, list);
  }
  return map;
}

function sortedSnapshotKeys(map: Map<string, PatrimonioRecord[]>): string[] {
  return [...map.keys()].sort();
}

function sumRecords(records: PatrimonioRecord[]): number {
  return records.reduce((sum, r) => sum + r.amount, 0);
}

function sumByTipo(records: PatrimonioRecord[]): NamedAmount[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    totals.set(r.tipo, (totals.get(r.tipo) ?? 0) + r.amount);
  }
  return orderTipos(totals);
}

function orderTipos(totals: Map<string, number>): NamedAmount[] {
  const keys = [...totals.keys()].sort((a, b) => {
    const ia = TIPO_ORDER.indexOf(a);
    const ib = TIPO_ORDER.indexOf(b);
    const ra = ia === -1 ? TIPO_ORDER.length : ia;
    const rb = ib === -1 ? TIPO_ORDER.length : ib;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
  return keys.map((name) => ({ name, total: totals.get(name) ?? 0 }));
}

function collectTipoKeys(...lists: NamedAmount[][]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    for (const item of list) set.add(item.name);
  }
  return [...set].sort((a, b) => {
    const ia = TIPO_ORDER.indexOf(a);
    const ib = TIPO_ORDER.indexOf(b);
    const ra = ia === -1 ? TIPO_ORDER.length : ia;
    const rb = ib === -1 ? TIPO_ORDER.length : ib;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

function sumByNombre(records: PatrimonioRecord[]): NamedAmount[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    totals.set(r.nombre, (totals.get(r.nombre) ?? 0) + r.amount);
  }
  return [...totals.entries()]
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .map(([name, total]) => ({ name, total }));
}

function buildInmobiliario(records: PatrimonioRecord[]): InmobiliarioRow[] {
  const byNombre = new Map<string, PatrimonioRecord[]>();
  for (const r of records) {
    if (r.tipo.toLowerCase() !== INMOBILIARIO) continue;
    const list = byNombre.get(r.nombre) ?? [];
    list.push(r);
    byNombre.set(r.nombre, list);
  }

  return [...byNombre.entries()]
    .map(([nombre, rows]) => {
      let valorBruto = 0;
      let deuda = 0;
      for (const r of rows) {
        if (r.amount >= 0) valorBruto += r.amount;
        else deuda += Math.abs(r.amount);
      }
      const neto = valorBruto - deuda;
      const ltv = valorBruto > 0 ? (deuda / valorBruto) * 100 : null;
      return { nombre, valorBruto, deuda, neto, ltv };
    })
    .sort((a, b) => b.neto - a.neto);
}

function ltvInmobiliario(records: PatrimonioRecord[]): {
  ltv: number | null;
  deuda: number;
  activo: number;
} {
  let activo = 0;
  let deuda = 0;
  for (const r of records) {
    if (r.tipo.toLowerCase() !== INMOBILIARIO) continue;
    if (r.amount >= 0) activo += r.amount;
    else deuda += Math.abs(r.amount);
  }
  return {
    ltv: activo > 0 ? (deuda / activo) * 100 : null,
    deuda,
    activo,
  };
}

function resolveFilterRange(
  mode: PatrimonioFilterMode,
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

function filterSnapshotsByYears(
  keys: string[],
  groups: Map<string, PatrimonioRecord[]>,
  from: string,
  to: string,
  timezone: string,
): string[] {
  return keys.filter((key) => {
    const sample = groups.get(key)?.[0];
    if (!sample) return false;
    const y = yearKey(sample.date, timezone);
    return y >= from && y <= to;
  });
}

function buildEvolutionByTipo(
  keys: string[],
  groups: Map<string, PatrimonioRecord[]>,
  timezone: string,
  tipoKeys: string[],
): PatrimonioTipoSnapshotRow[] {
  return keys.map((key) => {
    const records = groups.get(key) ?? [];
    const byTipo = sumByTipo(records);
    const values: Record<string, number> = {};
    for (const k of tipoKeys) values[k] = 0;
    for (const { name, total } of byTipo) values[name] = total;
    return { label: formatSnapshotLabel(key, timezone), values };
  });
}

export async function fetchPatrimonio(
  client: NocoDbClient,
  persona: Persona,
  timezone: string,
  mode: PatrimonioFilterMode = "all",
  yearFrom?: string,
  yearTo?: string,
  singleYear?: string,
): Promise<PatrimonioData> {
  const where = personaFilter(persona);
  const raw = await client.listRecords(TABLES.patrimonio, where);
  const all = mapPatrimonio(raw, timezone);
  const groups = groupBySnapshot(all);
  const snapshotKeys = sortedSnapshotKeys(groups);

  const yearSet = new Set(snapshotKeys.map((k) => yearKey(groups.get(k)![0].date, timezone)));
  const availableYears = [...yearSet].sort();

  const filter = resolveFilterRange(mode, timezone, availableYears, yearFrom, yearTo, singleYear);
  const filteredKeys = filterSnapshotsByYears(snapshotKeys, groups, filter.from, filter.to, timezone);

  const latestKey = snapshotKeys[snapshotKeys.length - 1];
  const previousKey = snapshotKeys.length >= 2 ? snapshotKeys[snapshotKeys.length - 2] : null;

  const latestRecords = latestKey ? (groups.get(latestKey) ?? []) : [];
  const previousRecords = previousKey ? (groups.get(previousKey) ?? []) : [];

  const neto = sumRecords(latestRecords);
  const previousNeto = sumRecords(previousRecords);
  const delta = neto - previousNeto;
  const deltaPct = previousNeto !== 0 ? (delta / previousNeto) * 100 : 0;

  const { ltv, deuda: ltvDeuda, activo: ltvActivo } = ltvInmobiliario(latestRecords);

  const byTipo = sumByTipo(latestRecords);
  const rentaVariableByNombre = sumByNombre(
    latestRecords.filter((r) => r.tipo.toLowerCase() === RENTA_VARIABLE),
  );
  const inmobiliario = buildInmobiliario(latestRecords);

  const evolutionSnapshots = filteredKeys.map((key) => ({
    label: formatSnapshotLabel(key, timezone),
    total: sumRecords(groups.get(key) ?? []),
  }));

  const tipoKeys = collectTipoKeys(
    byTipo,
    ...filteredKeys.map((k) => sumByTipo(groups.get(k) ?? [])),
  );

  const evolutionByTipo = buildEvolutionByTipo(filteredKeys, groups, timezone, tipoKeys);

  return {
    metrics: {
      neto,
      delta,
      deltaPct,
      ltv,
      ltvDeuda,
      ltvActivo,
      latestSnapshotLabel: latestKey ? formatSnapshotLabel(latestKey, timezone) : "—",
      previousSnapshotLabel: previousKey ? formatSnapshotLabel(previousKey, timezone) : null,
    },
    byTipo,
    rentaVariableByNombre,
    inmobiliario,
    evolutionLine: evolutionSnapshots,
    evolutionByTipo,
    tipoKeys,
    availableYears,
    filter: { mode, ...filter },
  };
}
