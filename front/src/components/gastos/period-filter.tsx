"use client";

import type { GastosFilterMode } from "@/lib/types";
import { previousYearLabel } from "@/lib/period-filter";

interface PeriodFilterProps {
  mode: GastosFilterMode;
  yearFrom: string;
  yearTo: string;
  availableYears: string[];
  onModeChange: (mode: GastosFilterMode) => void;
  onYearFromChange: (year: string) => void;
  onYearToChange: (year: string) => void;
}

export function PeriodFilter({
  mode,
  yearFrom,
  yearTo,
  availableYears,
  onModeChange,
  onYearFromChange,
  onYearToChange,
}: PeriodFilterProps) {
  const previousYear = previousYearLabel();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium">Período</span>
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as GastosFilterMode)}
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
    </div>
  );
}
