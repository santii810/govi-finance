"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { SwitchableDistributionChart } from "@/components/ingresos/switchable-distribution-chart";
import { IngresosLineChart } from "@/components/ingresos/line-chart";
import { MonthHeatmap } from "@/components/ingresos/month-heatmap";
import { PivotHeatmap } from "@/components/ingresos/pivot-heatmap";
import { YearFilter } from "@/components/ingresos/year-filter";
import type { IngresosData, IngresosFilterMode } from "@/lib/types";

function buildQuery(
  mode: IngresosFilterMode,
  yearFrom: string,
  yearTo: string,
): string {
  const params = new URLSearchParams({ mode });
  if (mode === "range") {
    params.set("from", yearFrom);
    params.set("to", yearTo);
  }
  return params.toString();
}

export function DashboardIngresos() {
  const [data, setData] = useState<IngresosData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<IngresosFilterMode>("all");
  const [yearFrom, setYearFrom] = useState("2012");
  const [yearTo, setYearTo] = useState("2025");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = buildQuery(mode, yearFrom, yearTo);
      const res = await fetch(`/api/dashboard/ingresos?${qs}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al cargar");
      }
      const json = (await res.json()) as IngresosData;
      setData(json);
      if (json.availableYears.length > 0) {
        const first = json.availableYears[0];
        const last = json.availableYears[json.availableYears.length - 1];
        setYearFrom((prev) => (json.availableYears.includes(prev) ? prev : first));
        setYearTo((prev) => (json.availableYears.includes(prev) ? prev : last));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [mode, yearFrom, yearTo]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <p className="text-sm text-muted">Cargando ingresos…</p>;
  }

  if (error && !data) {
    return <p className="text-sm text-expense">{error}</p>;
  }

  if (!data) return null;

  const currentYear = new Date().getFullYear().toString();
  const periodLabel = `${data.filter.from} – ${data.filter.to}`;

  return (
    <div className="space-y-6">
      <YearFilter
        mode={mode}
        yearFrom={yearFrom}
        yearTo={yearTo}
        availableYears={data.availableYears}
        onModeChange={setMode}
        onYearFromChange={setYearFrom}
        onYearToChange={setYearTo}
        periodLabel={periodLabel}
      />

      {loading && <p className="text-xs text-muted">Actualizando…</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total en período"
          value={data.metrics.periodTotal}
          hideComparison
          tone="income"
        />
        <MetricCard
          title={`Año en curso (${currentYear})`}
          value={data.metrics.currentYearTotal}
          hideComparison
          tone="income"
        />
        <MetricCard title="Media mensual" value={data.metrics.monthlyAverage} hideComparison />
      </div>

      <IngresosLineChart data={data.yearlyLine} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SwitchableDistributionChart title="Por origen" data={data.byOrigen} />
        <SwitchableDistributionChart title="Por categoría" data={data.byCategoria} />
      </div>

      {data.pivot.rows.length > 0 && (
        <PivotHeatmap
          origenKeys={data.pivot.origenKeys}
          rows={data.pivot.rows}
          details={data.pivot.details}
          colLabel="Origen"
          labelHeader="Categoría"
        />
      )}

      {data.heatmap.length > 0 && (
        <MonthHeatmap rows={data.heatmap} details={data.heatmapDetails} labelHeader="Categoría" />
      )}
    </div>
  );
}
