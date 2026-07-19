import type { PersonaValue } from "./import-rules/types";
import type { Persona } from "./types";

const COMMON_FACTOR = 0.5;

export function personaFilter(persona: Persona): string {
  return `(Persona,in,${persona},Común)`;
}

/** ImportRules: propias del usuario y reglas comunes (Persona = Común). */
export function importRulesPersonaFilter(persona: Persona): string {
  return personaFilter(persona);
}

export function isVisible(recordPersona: unknown, userPersona: Persona): boolean {
  if (recordPersona === userPersona || recordPersona === "Común") return true;
  return false;
}

export function isImportRuleVisible(recordPersona: unknown, userPersona: Persona): boolean {
  return isVisible(recordPersona, userPersona);
}

export function filterByPersona<T extends { persona: PersonaValue }>(
  items: T[],
  userPersona: Persona,
): T[] {
  return items.filter((item) => isVisible(item.persona, userPersona));
}

export function attributedAmount(importe: number, recordPersona: unknown): number {
  if (recordPersona === "Común") return importe * COMMON_FACTOR;
  return importe;
}

export function parseAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    const d = new Date(Date.UTC(year, month, day, 12));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export interface DateParts {
  year: string;
  month: string;
  monthIndex: number;
  day: number;
  monthKey: string;
  snapshotKey: string;
}

const datePartsFormatters = new Map<string, Intl.DateTimeFormat>();

function getDatePartsFormatter(timezone: string): Intl.DateTimeFormat {
  let formatter = datePartsFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    datePartsFormatters.set(timezone, formatter);
  }
  return formatter;
}

/** Partes de fecha en zona horaria — una sola llamada a Intl por registro. */
export function getDateParts(date: Date, timezone: string): DateParts {
  const parts = getDatePartsFormatter(timezone).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const dayStr = parts.find((p) => p.type === "day")?.value ?? "01";
  const day = Number(dayStr);
  return {
    year,
    month,
    monthIndex: Number(month) - 1,
    day,
    monthKey: `${year}-${month}`,
    snapshotKey: `${year}-${month}-${dayStr}`,
  };
}

export function yearKey(date: Date, timezone: string): string {
  return getDateParts(date, timezone).year;
}

export function monthIndex(date: Date, timezone: string): number {
  return getDateParts(date, timezone).monthIndex;
}

export function currentYearKey(timezone: string): string {
  return yearKey(new Date(), timezone);
}

export function lastNYearsKeys(timezone: string, n: number): { from: string; to: string } {
  const to = currentYearKey(timezone);
  const from = String(Number(to) - n + 1);
  return { from, to };
}

function getMonthKeyFormatter(timezone: string): Intl.DateTimeFormat {
  return getDatePartsFormatter(timezone);
}

function monthKeyFromParts(parts: Intl.DateTimeFormatPart[]): string {
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export function monthKey(date: Date, timezone: string): string {
  return getDateParts(date, timezone).monthKey;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit" }).format(date);
}

export function getMonthRange(timezone: string, offsetMonths = 0): { start: Date; end: Date; key: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === "year")?.value ?? now.getFullYear());
  const month = Number(parts.find((p) => p.type === "month")?.value ?? now.getMonth() + 1);

  const target = new Date(Date.UTC(year, month - 1 + offsetMonths, 1));
  const start = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), 1));
  const end = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const key = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}`;

  return { start, end, key };
}

export function last12MonthKeys(timezone: string): string[] {
  const keys: string[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    keys.push(getMonthRange(timezone, -i).key);
  }
  return keys;
}

export function isInMonth(date: Date, monthKeyStr: string, timezone: string): boolean {
  return monthKey(date, timezone) === monthKeyStr;
}

export function sumInMonth(
  records: { date: Date | null; amount: number; persona: unknown }[],
  monthKeyStr: string,
  timezone: string,
): number {
  return aggregateByMonth(records, timezone)[monthKeyStr] ?? 0;
}

/** Suma importes por mes en una sola pasada (evita rescans repetidos con Intl). */
export function aggregateByMonth(
  records: { date: Date | null; amount: number }[],
  timezone: string,
): Record<string, number> {
  const formatter = getMonthKeyFormatter(timezone);
  const totals: Record<string, number> = {};

  for (const record of records) {
    if (!record.date) continue;
    const key = monthKeyFromParts(formatter.formatToParts(record.date));
    totals[key] = (totals[key] ?? 0) + record.amount;
  }

  return totals;
}

export function yearBoundsIso(fromYear: string, toYear: string): { from: string; to: string } {
  const from = fromYear <= toYear ? fromYear : toYear;
  const to = fromYear <= toYear ? toYear : fromYear;
  return { from: `${from}-01-01`, to: `${to}-12-31` };
}

/** Primer día del mes N meses atrás (p. ej. resumen: últimos 13 meses). */
export function monthStartIso(timezone: string, offsetMonths: number): string {
  return `${getMonthRange(timezone, offsetMonths).key}-01`;
}
