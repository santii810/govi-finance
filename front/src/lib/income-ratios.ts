import type { NocoDbClient } from "./nocodb";
import { TABLES } from "./config";
import {
  aggregateByMonth,
  attributedAmount,
  currentYearKey,
  last12MonthKeys,
  monthLabel,
  parseAmount,
  parseDate,
  personaFilter,
  yearBoundsIso,
  yearKey,
} from "./persona";
import {
  RESUMEN_GASTOS_FIELDS,
  RESUMEN_INGRESOS_FIELDS,
  RESUMEN_INVERSIONES_FIELDS,
} from "./table-fields";
import type { IncomeRatioPoint, IncomeRatioSeries, IngresosRatios, Persona } from "./types";

interface MoneyRecord {
  date: Date | null;
  amount: number;
}

function mapGastos(records: Record<string, unknown>[]): MoneyRecord[] {
  return records.map((r) => ({
    date: parseDate(r.Date),
    amount: attributedAmount(parseAmount(r.Cantidad), r.Persona),
  }));
}

function mapIngresos(records: Record<string, unknown>[]): MoneyRecord[] {
  return records.map((r) => ({
    date: parseDate(r.Fecha),
    amount: attributedAmount(parseAmount(r.Ingreso), r.Persona),
  }));
}

function mapInversiones(records: Record<string, unknown>[]): MoneyRecord[] {
  return records.map((r) => ({
    date: parseDate(r.Fecha),
    amount: attributedAmount(parseAmount(r.Importe), r.Persona),
  }));
}

function ratioPct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return (numerator / denominator) * 100;
}

function aggregateByYear(records: MoneyRecord[], timezone: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const r of records) {
    if (!r.date) continue;
    const y = yearKey(r.date, timezone);
    totals[y] = (totals[y] ?? 0) + r.amount;
  }
  return totals;
}

/**
 * Umbral de ingresos significativos vs gastos (data-decisions.md).
 * Si gastos ≥ 20 × ingresos, el ingreso del periodo se considera insignificante.
 */
const INCOME_SIGNIFICANCE_RATIO = 20;

/**
 * Columna de ratio solo si hay ingresos atribuidos significativos
 * (Persona + 50 % Común) frente a los gastos del mismo periodo.
 * Sin ingresos o con ingresos insignificantes: se omite el periodo.
 */
function periodHasRatioData(ingresos: number, gastos: number): boolean {
  if (ingresos <= 0) return false;
  return gastos < INCOME_SIGNIFICANCE_RATIO * ingresos;
}

function validMonthKeys(
  monthKeys: string[],
  ingresosByMonth: Record<string, number>,
  gastosByMonth: Record<string, number>,
): string[] {
  return monthKeys.filter((key) =>
    periodHasRatioData(ingresosByMonth[key] ?? 0, gastosByMonth[key] ?? 0),
  );
}

function validYears(
  years: string[],
  ingresosByYear: Record<string, number>,
  gastosByYear: Record<string, number>,
): string[] {
  return years.filter((year) =>
    periodHasRatioData(ingresosByYear[year] ?? 0, gastosByYear[year] ?? 0),
  );
}

function buildMonthlySeries(
  monthKeys: string[],
  numeratorByMonth: Record<string, number>,
  denominatorByMonth: Record<string, number>,
): IncomeRatioSeries {
  const monthly = monthKeys.map((key) => {
    const numerator = numeratorByMonth[key] ?? 0;
    const denominator = denominatorByMonth[key] ?? 0;
    return {
      key,
      label: monthLabel(key),
      numerator,
      denominator,
      pct: ratioPct(numerator, denominator),
    };
  });

  const totalNumerator = monthly.reduce((s, p) => s + p.numerator, 0);
  const totalDenominator = monthly.reduce((s, p) => s + p.denominator, 0);

  return {
    monthly,
    monthlyTotal: {
      key: "total-12m",
      label: "Total 12m",
      numerator: totalNumerator,
      denominator: totalDenominator,
      pct: ratioPct(totalNumerator, totalDenominator),
    },
    yearly: [],
    yearlyTotal: emptyYearlyTotal(),
  };
}

function emptyYearlyTotal(): IncomeRatioPoint {
  return { key: "historico", label: "Histórico", numerator: 0, denominator: 0, pct: null };
}

function buildYearlySeries(
  years: string[],
  numeratorByYear: Record<string, number>,
  denominatorByYear: Record<string, number>,
): Pick<IncomeRatioSeries, "yearly" | "yearlyTotal"> {
  const yearly = years.map((year) => {
    const numerator = numeratorByYear[year] ?? 0;
    const denominator = denominatorByYear[year] ?? 0;
    return {
      key: year,
      label: year,
      numerator,
      denominator,
      pct: ratioPct(numerator, denominator),
    };
  });

  const totalNumerator = yearly.reduce((s, p) => s + p.numerator, 0);
  const totalDenominator = yearly.reduce((s, p) => s + p.denominator, 0);

  return {
    yearly,
    yearlyTotal: {
      key: "historico",
      label: "Histórico",
      numerator: totalNumerator,
      denominator: totalDenominator,
      pct: ratioPct(totalNumerator, totalDenominator),
    },
  };
}

function mergeSeries(
  monthlyPart: IncomeRatioSeries,
  yearlyPart: Pick<IncomeRatioSeries, "yearly" | "yearlyTotal">,
): IncomeRatioSeries {
  return { ...monthlyPart, ...yearlyPart };
}

function buildRatioSeries(
  monthKeys: string[],
  years: string[],
  numeratorByMonth: Record<string, number>,
  denominatorByMonth: Record<string, number>,
  numeratorByYear: Record<string, number>,
  denominatorByYear: Record<string, number>,
): IncomeRatioSeries {
  const monthlyPart = buildMonthlySeries(monthKeys, numeratorByMonth, denominatorByMonth);
  const yearlyPart = buildYearlySeries(years, numeratorByYear, denominatorByYear);
  return mergeSeries(monthlyPart, yearlyPart);
}

function savingsAmount(ingresos: number, gastos: number, inversion: number): number {
  return ingresos - gastos - inversion;
}

function savingsPoint(
  key: string,
  label: string,
  ingresos: number,
  gastos: number,
  inversion: number,
): IncomeRatioPoint {
  const numerator = savingsAmount(ingresos, gastos, inversion);
  return {
    key,
    label,
    numerator,
    denominator: ingresos,
    pct: ratioPct(numerator, ingresos),
    gastos,
    inversion,
  };
}

function buildSavingsSeries(
  monthKeys: string[],
  years: string[],
  ingresosByMonth: Record<string, number>,
  gastosByMonth: Record<string, number>,
  inversionByMonth: Record<string, number>,
  ingresosByYear: Record<string, number>,
  gastosByYear: Record<string, number>,
  inversionByYear: Record<string, number>,
): IncomeRatioSeries {
  const monthly = monthKeys.map((key) =>
    savingsPoint(
      key,
      monthLabel(key),
      ingresosByMonth[key] ?? 0,
      gastosByMonth[key] ?? 0,
      inversionByMonth[key] ?? 0,
    ),
  );

  const monthlyIngresos = monthly.reduce((s, p) => s + p.denominator, 0);
  const monthlyGastos = monthly.reduce((s, p) => s + (p.gastos ?? 0), 0);
  const monthlyInversion = monthly.reduce((s, p) => s + (p.inversion ?? 0), 0);

  const yearly = years.map((year) =>
    savingsPoint(
      year,
      year,
      ingresosByYear[year] ?? 0,
      gastosByYear[year] ?? 0,
      inversionByYear[year] ?? 0,
    ),
  );

  const yearlyIngresos = yearly.reduce((s, p) => s + p.denominator, 0);
  const yearlyGastos = yearly.reduce((s, p) => s + (p.gastos ?? 0), 0);
  const yearlyInversion = yearly.reduce((s, p) => s + (p.inversion ?? 0), 0);

  return {
    monthly,
    monthlyTotal: savingsPoint(
      "total-12m",
      "Total 12m",
      monthlyIngresos,
      monthlyGastos,
      monthlyInversion,
    ),
    yearly,
    yearlyTotal: savingsPoint("historico", "Histórico", yearlyIngresos, yearlyGastos, yearlyInversion),
  };
}

export async function fetchIncomeRatios(
  client: NocoDbClient,
  persona: Persona,
  timezone: string,
): Promise<IngresosRatios> {
  const where = personaFilter(persona);

  const [ingBounds, gastBounds, invBounds] = await Promise.all([
    client.availableYears(TABLES.ingresos, "Fecha", where),
    client.availableYears(TABLES.gastos, "Date", where),
    client.availableYears(TABLES.inversiones, "Fecha", where),
  ]);

  const currentYear = currentYearKey(timezone);
  const allBounds = [ingBounds.min, gastBounds.min, invBounds.min].filter(Boolean) as string[];
  const minDate = allBounds.length > 0 ? allBounds.sort()[0] : null;
  const fromYear = minDate ? minDate.slice(0, 4) : currentYear;
  const { from: apiFrom, to: apiTo } = yearBoundsIso(fromYear, currentYear);

  const [gastosRaw, ingresosRaw, inversionesRaw] = await Promise.all([
    client.listRecords(TABLES.gastos, {
      where,
      fields: [...RESUMEN_GASTOS_FIELDS],
      dateFrom: { field: "Date", iso: apiFrom },
      dateTo: { field: "Date", iso: apiTo },
    }),
    client.listRecords(TABLES.ingresos, {
      where,
      fields: [...RESUMEN_INGRESOS_FIELDS],
      dateFrom: { field: "Fecha", iso: apiFrom },
      dateTo: { field: "Fecha", iso: apiTo },
    }),
    client.listRecords(TABLES.inversiones, {
      where,
      fields: [...RESUMEN_INVERSIONES_FIELDS],
      dateFrom: { field: "Fecha", iso: apiFrom },
      dateTo: { field: "Fecha", iso: apiTo },
    }),
  ]);

  const gastos = mapGastos(gastosRaw);
  const ingresos = mapIngresos(ingresosRaw);
  const inversiones = mapInversiones(inversionesRaw);

  const gastosByMonth = aggregateByMonth(gastos, timezone);
  const ingresosByMonth = aggregateByMonth(ingresos, timezone);
  const inversionByMonth = aggregateByMonth(inversiones, timezone);

  const gastosByYear = aggregateByYear(gastos, timezone);
  const ingresosByYear = aggregateByYear(ingresos, timezone);
  const inversionByYear = aggregateByYear(inversiones, timezone);

  const monthKeys = last12MonthKeys(timezone);
  // Años con algún movimiento atribuido (no rellenar huecos de calendario min→max).
  const allYears = [
    ...new Set([
      ...Object.keys(ingresosByYear),
      ...Object.keys(gastosByYear),
      ...Object.keys(inversionByYear),
    ]),
  ].sort((a, b) => a.localeCompare(b));

  const ratioMonthKeys = validMonthKeys(monthKeys, ingresosByMonth, gastosByMonth);
  const ratioYears = validYears(allYears, ingresosByYear, gastosByYear);

  return {
    gastosSobreIngresos: buildRatioSeries(
      ratioMonthKeys,
      ratioYears,
      gastosByMonth,
      ingresosByMonth,
      gastosByYear,
      ingresosByYear,
    ),
    inversionSobreIngresos: buildRatioSeries(
      ratioMonthKeys,
      ratioYears,
      inversionByMonth,
      ingresosByMonth,
      inversionByYear,
      ingresosByYear,
    ),
    ahorroSobreIngresos: buildSavingsSeries(
      ratioMonthKeys,
      ratioYears,
      ingresosByMonth,
      gastosByMonth,
      inversionByMonth,
      ingresosByYear,
      gastosByYear,
      inversionByYear,
    ),
  };
}
