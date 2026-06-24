import { currentYearKey, lastNYearsKeys } from "@/lib/persona";

export type PeriodFilterMode = "current" | "previous" | "last3" | "all" | "range";

export function previousYearKey(timezone: string): string {
  return String(Number(currentYearKey(timezone)) - 1);
}

export function resolvePeriodFilterRange(
  mode: PeriodFilterMode,
  timezone: string,
  availableYears: string[],
  yearFrom?: string,
  yearTo?: string,
): { from: string; to: string } {
  if (mode === "current") {
    const y = currentYearKey(timezone);
    return { from: y, to: y };
  }
  if (mode === "previous") {
    const y = previousYearKey(timezone);
    return { from: y, to: y };
  }
  if (mode === "last3") {
    return lastNYearsKeys(timezone, 3);
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

export function parsePeriodFilterMode(
  value: string | null,
  defaultMode: PeriodFilterMode = "all",
): PeriodFilterMode {
  if (
    value === "current" ||
    value === "previous" ||
    value === "last3" ||
    value === "all" ||
    value === "range"
  ) {
    return value;
  }
  if (value === "last5") return "last3";
  if (value === "year") return "previous";
  return defaultMode;
}

export function previousYearLabel(referenceDate = new Date()): string {
  return String(referenceDate.getFullYear() - 1);
}
