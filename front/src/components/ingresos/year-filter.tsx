"use client";

import type { IngresosFilterMode } from "@/lib/types";
import { previousYearLabel } from "@/lib/period-filter";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

interface YearFilterProps {
  mode: IngresosFilterMode;
  yearFrom: string;
  yearTo: string;
  availableYears: string[];
  onModeChange: (mode: IngresosFilterMode) => void;
  onYearFromChange: (year: string) => void;
  onYearToChange: (year: string) => void;
  periodLabel: string;
}

export function YearFilter({
  mode,
  yearFrom,
  yearTo,
  availableYears,
  onModeChange,
  onYearFromChange,
  onYearToChange,
  periodLabel,
}: YearFilterProps) {
  const previousYear = previousYearLabel();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-sm font-medium">Período</span>
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as IngresosFilterMode)}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
      >
        <option value="current">Año en curso</option>
        <option value="previous">Año pasado ({previousYear})</option>
        <option value="last3">Últimos 3 años</option>
        <option value="all">Todo el periodo</option>
        <option value="range">Rango personalizado</option>
      </select>

      {mode === "range" && (
        <>
          <span className="text-xs text-muted">Desde</span>
          <select
            value={yearFrom}
            onChange={(e) => onYearFromChange(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">Hasta</span>
          <select
            value={yearTo}
            onChange={(e) => onYearToChange(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </>
      )}

      <span className="text-xs text-muted">{periodLabel}</span>
    </div>
  );
}

export { MONTHS };
