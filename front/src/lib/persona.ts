import type { Persona } from "./types";

const COMMON_FACTOR = 0.5;

export function personaFilter(persona: Persona): string {
  return `(Persona,in,${persona},Común)`;
}

export function isVisible(recordPersona: unknown, userPersona: Persona): boolean {
  if (recordPersona === userPersona || recordPersona === "Común") return true;
  return false;
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
  const d = new Date(String(value));
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

export function yearKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  return parts.find((p) => p.type === "year")?.value ?? "0000";
}

export function monthIndex(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    month: "numeric",
  }).formatToParts(date);
  return Number(parts.find((p) => p.type === "month")?.value ?? 1) - 1;
}

export function currentYearKey(timezone: string): string {
  return yearKey(new Date(), timezone);
}

export function lastNYearsKeys(timezone: string, n: number): { from: string; to: string } {
  const to = currentYearKey(timezone);
  const from = String(Number(to) - n + 1);
  return { from, to };
}

export function monthKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
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
  return records.reduce((sum, r) => {
    if (!r.date || !isInMonth(r.date, monthKeyStr, timezone)) return sum;
    return sum + r.amount;
  }, 0);
}
