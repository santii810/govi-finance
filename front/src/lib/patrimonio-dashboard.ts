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
} from "./persona";
import { resolvePeriodFilterRange } from "./period-filter";
import { PATRIMONIO_FIELDS } from "./table-fields";
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
  year: string;
}

function mapPatrimonio(records: Record<string, unknown>[], timezone: string): PatrimonioRecord[] {
  return records
    .map((r) => {
      const date = parseDate(r.Fecha);
      if (!date) return null;
      const parts = getDateParts(date, timezone);
      return {
        date,
        snapshotKey: parts.snapshotKey,
        amount: attributedAmount(parseAmount(r.Valor), r.Persona),
        tipo: String(r.Tipo ?? "Otro"),
        nombre: String(r.Nombre ?? "Sin nombre"),
        year: parts.year,
      };
    })
    .filter((r): r is PatrimonioRecord => r !== null);
}

export function formatSnapshotLabel(key: string, timezone: string): string {
  const d = new Date(`${key}T12:00:00`);
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: timezone,
    month: "short",
    year: "2-digit",
  }).format(d);
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
): { from: string; to: string } {
  return resolvePeriodFilterRange(mode, timezone, availableYears, yearFrom, yearTo);
}

function filterSnapshotsByYears(
  keys: string[],
  groups: Map<string, PatrimonioRecord[]>,
  from: string,
  to: string,
): string[] {
  return keys.filter((key) => {
    const sample = groups.get(key)?.[0];
    if (!sample) return false;
    return sample.year >= from && sample.year <= to;
  });
}

function collectTipoKeysFromSnapshots(
  keys: string[],
  groups: Map<string, PatrimonioRecord[]>,
  latestByTipo: NamedAmount[],
): string[] {
  const set = new Set<string>();
  for (const item of latestByTipo) set.add(item.name);
  for (const key of keys) {
    for (const record of groups.get(key) ?? []) {
      set.add(record.tipo);
    }
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
): Promise<PatrimonioData> {
  const where = personaFilter(persona);
  const bounds = await client.availableYears(TABLES.patrimonio, "Fecha", where);
  const availableYears = yearsFromDateBounds(bounds.min, bounds.max, timezone, currentYearKey(timezone));

  const raw = await client.listRecords(TABLES.patrimonio, {
    where,
    fields: [...PATRIMONIO_FIELDS],
  });
  const all = mapPatrimonio(raw, timezone);
  const groups = groupBySnapshot(all);
  const snapshotKeys = sortedSnapshotKeys(groups);

  const filter = resolveFilterRange(mode, timezone, availableYears, yearFrom, yearTo);
  const filteredKeys = filterSnapshotsByYears(snapshotKeys, groups, filter.from, filter.to);

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

  const tipoKeys = collectTipoKeysFromSnapshots(filteredKeys, groups, byTipo);

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
