"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { DistributionPie } from "@/components/ingresos/distribution-pie";
import { HorizontalBarChart } from "@/components/ingresos/horizontal-bar-chart";
import { IngresosLineChart } from "@/components/ingresos/line-chart";
import { MonthHeatmap } from "@/components/ingresos/month-heatmap";
import { PivotHeatmap } from "@/components/ingresos/pivot-heatmap";
import { YearFilter } from "@/components/ingresos/year-filter";
import type { InversionesData, InversionesFilterMode } from "@/lib/types";

function buildQuery(
  mode: InversionesFilterMode,
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

export function DashboardInversiones() {
  const [data, setData] = useState<InversionesData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<InversionesFilterMode>("all");
  const [yearFrom, setYearFrom] = useState("2021");
  const [yearTo, setYearTo] = useState("2025");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = buildQuery(mode, yearFrom, yearTo);
      const res = await fetch(`/api/dashboard/inversiones?${qs}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al cargar");
      }
      const json = (await res.json()) as InversionesData;
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
    return <p className="text-sm text-muted">Cargando inversión…</p>;
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
        <MetricCard title="Total neto en período" value={data.metrics.periodTotal} hideComparison />
        <MetricCard
          title={`Año en curso (${currentYear})`}
          value={data.metrics.currentYearTotal}
          hideComparison
        />
        <MetricCard title="Media mensual neta" value={data.metrics.monthlyAverage} hideComparison />
      </div>

      <IngresosLineChart
        data={data.yearlyLine}
        title="Inversión neta por año"
        seriesLabel="Neto invertido"
        stroke="#2563eb"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <HorizontalBarChart title="Por entidad" data={data.byEntidad} color="#2563eb" />
        <HorizontalBarChart title="Por tipo" data={data.byTipo} color="#2563eb" />
      </div>

      <HorizontalBarChart title="Por nombre (activo / producto)" data={data.byNombre} color="#2563eb" />

      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionPie title="Distribución por entidad" data={data.byEntidad} signed />
        <DistributionPie title="Distribución por tipo" data={data.byTipo} signed />
      </div>

      <DistributionPie title="Distribución por nombre" data={data.byNombre} signed />

      {data.pivot.rows.length > 0 && (
        <PivotHeatmap
          origenKeys={data.pivot.entidadKeys}
          rows={data.pivot.rows}
          title="Año × entidad"
          signed
          details={data.pivot.details}
          colLabel="Entidad"
          labelHeader="Nombre"
        />
      )}

      {data.heatmap.length > 0 && <MonthHeatmap rows={data.heatmap} signed />}
    </div>
  );
}
