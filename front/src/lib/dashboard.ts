import type { NocoDbClient } from "./nocodb";
import { TABLES } from "./config";
import {
  aggregateByMonth,
  attributedAmount,
  getMonthRange,
  last12MonthKeys,
  monthLabel,
  monthStartIso,
  parseAmount,
  parseDate,
  personaFilter,
} from "./persona";
import {
  RESUMEN_GASTOS_FIELDS,
  RESUMEN_INGRESOS_FIELDS,
  RESUMEN_INVERSIONES_FIELDS,
} from "./table-fields";
import type { Persona, ResumenData, ResumenMetrics } from "./types";

interface MoneyRecord {
  date: Date | null;
  amount: number;
  persona: unknown;
}

function mapGastos(records: Record<string, unknown>[]): MoneyRecord[] {
  return records.map((r) => ({
    date: parseDate(r.Date),
    amount: attributedAmount(parseAmount(r.Cantidad), r.Persona),
    persona: r.Persona,
  }));
}

function mapIngresos(records: Record<string, unknown>[]): MoneyRecord[] {
  return records.map((r) => ({
    date: parseDate(r.Fecha),
    amount: attributedAmount(parseAmount(r.Ingreso), r.Persona),
    persona: r.Persona,
  }));
}

function mapInversiones(records: Record<string, unknown>[]): MoneyRecord[] {
  return records.map((r) => ({
    date: parseDate(r.Fecha),
    amount: attributedAmount(parseAmount(r.Importe), r.Persona),
    persona: r.Persona,
  }));
}

function computeMetrics(
  gastosByMonth: Record<string, number>,
  ingresosByMonth: Record<string, number>,
  timezone: string,
): ResumenMetrics {
  const current = getMonthRange(timezone, 0).key;
  const previous = getMonthRange(timezone, -1).key;

  const gastosCurrent = gastosByMonth[current] ?? 0;
  const gastosPrev = gastosByMonth[previous] ?? 0;
  const ingresosCurrent = ingresosByMonth[current] ?? 0;
  const ingresosPrev = ingresosByMonth[previous] ?? 0;

  return {
    gastos: gastosCurrent,
    ingresos: ingresosCurrent,
    balance: ingresosCurrent - gastosCurrent,
    gastosPrev,
    ingresosPrev,
    balancePrev: ingresosPrev - gastosPrev,
  };
}

export async function fetchResumen(
  client: NocoDbClient,
  persona: Persona,
  timezone: string,
): Promise<ResumenData> {
  const where = personaFilter(persona);
  const dateFrom = monthStartIso(timezone, -13);

  const [gastosRaw, ingresosRaw, inversionesRaw] = await Promise.all([
    client.listRecords(TABLES.gastos, {
      where,
      dateFrom: { field: "Date", iso: dateFrom },
      fields: [...RESUMEN_GASTOS_FIELDS],
    }),
    client.listRecords(TABLES.ingresos, {
      where,
      dateFrom: { field: "Fecha", iso: dateFrom },
      fields: [...RESUMEN_INGRESOS_FIELDS],
    }),
    client.listRecords(TABLES.inversiones, {
      where,
      dateFrom: { field: "Fecha", iso: dateFrom },
      fields: [...RESUMEN_INVERSIONES_FIELDS],
    }),
  ]);

  const gastos = mapGastos(gastosRaw);
  const ingresos = mapIngresos(ingresosRaw);
  const inversiones = mapInversiones(inversionesRaw);

  const gastosByMonth = aggregateByMonth(gastos, timezone);
  const ingresosByMonth = aggregateByMonth(ingresos, timezone);
  const inversionByMonth = aggregateByMonth(inversiones, timezone);
  const metrics = computeMetrics(gastosByMonth, ingresosByMonth, timezone);

  const monthKeys = last12MonthKeys(timezone);
  const chart = monthKeys.map((key) => ({
    month: key,
    label: monthLabel(key),
    ingresos: ingresosByMonth[key] ?? 0,
    gastos: gastosByMonth[key] ?? 0,
    inversion: inversionByMonth[key] ?? 0,
  }));

  return { metrics, chart };
}
