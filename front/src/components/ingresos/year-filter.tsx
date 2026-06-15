"use client";

import type { IngresosFilterMode } from "@/lib/types";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

interface YearFilterProps {
  mode: IngresosFilterMode;
  yearFrom: string;
  yearTo: string;
  singleYear: string;
  availableYears: string[];
  onModeChange: (mode: IngresosFilterMode) => void;
  onYearFromChange: (year: string) => void;
  onYearToChange: (year: string) => void;
  onSingleYearChange: (year: string) => void;
  periodLabel: string;
}

export function YearFilter({
  mode,
  yearFrom,
  yearTo,
  singleYear,
  availableYears,
  onModeChange,
  onYearFromChange,
  onYearToChange,
  onSingleYearChange,
  periodLabel,
}: YearFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-sm font-medium">Período</span>
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as IngresosFilterMode)}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
      >
        <option value="all">Todo el histórico</option>
        <option value="last5">Últimos 5 años</option>
        <option value="year">Año concreto</option>
        <option value="range">Rango personalizado</option>
      </select>

      {mode === "year" && (
        <select
          value={singleYear}
          onChange={(e) => onSingleYearChange(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      )}

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
