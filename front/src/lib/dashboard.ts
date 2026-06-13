import type { NocoDbClient } from "./nocodb";
import { TABLES } from "./config";
import {
  attributedAmount,
  getMonthRange,
  last12MonthKeys,
  monthLabel,
  parseAmount,
  parseDate,
  personaFilter,
  sumInMonth,
} from "./persona";
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

function computeMetrics(
  gastos: MoneyRecord[],
  ingresos: MoneyRecord[],
  timezone: string,
): ResumenMetrics {
  const current = getMonthRange(timezone, 0).key;
  const previous = getMonthRange(timezone, -1).key;

  const gastosCurrent = sumInMonth(gastos, current, timezone);
  const gastosPrev = sumInMonth(gastos, previous, timezone);
  const ingresosCurrent = sumInMonth(ingresos, current, timezone);
  const ingresosPrev = sumInMonth(ingresos, previous, timezone);

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

  const [gastosRaw, ingresosRaw] = await Promise.all([
    client.listRecords(TABLES.gastos, where),
    client.listRecords(TABLES.ingresos, where),
  ]);

  const gastos = mapGastos(gastosRaw);
  const ingresos = mapIngresos(ingresosRaw);
  const metrics = computeMetrics(gastos, ingresos, timezone);

  const monthKeys = last12MonthKeys(timezone);
  const chart = monthKeys.map((key) => ({
    month: key,
    label: monthLabel(key),
    ingresos: sumInMonth(ingresos, key, timezone),
    gastos: sumInMonth(gastos, key, timezone),
  }));

  return { metrics, chart };
}
