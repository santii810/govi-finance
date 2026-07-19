"use client";

import { useCallback, useEffect, useState } from "react";
import { SwitchableDistributionChart } from "@/components/ingresos/switchable-distribution-chart";
import { IngresosLineChart } from "@/components/ingresos/line-chart";
import { YearFilter } from "@/components/ingresos/year-filter";
import { GroupedTipoBarChart, InmobiliarioBarChart } from "@/components/patrimonio/grouped-bar-charts";
import { formatEur } from "@/lib/persona";
import type { PatrimonioData, PatrimonioFilterMode } from "@/lib/types";

function buildQuery(
  mode: PatrimonioFilterMode,
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

function formatPct(n: number, signed = false): string {
  const prefix = signed && n > 0 ? "+" : "";
  return `${prefix}${n.toFixed(1)} %`;
}

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {subtitle && <p className="mt-2 text-xs text-muted">{subtitle}</p>}
    </div>
  );
}

export function DashboardPatrimonio() {
  const [data, setData] = useState<PatrimonioData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<PatrimonioFilterMode>("all");
  const [yearFrom, setYearFrom] = useState("2021");
  const [yearTo, setYearTo] = useState("2025");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = buildQuery(mode, yearFrom, yearTo);
      const res = await fetch(`/api/dashboard/patrimonio?${qs}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al cargar");
      }
      const json = (await res.json()) as PatrimonioData;
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
    return <p className="text-sm text-muted">Cargando patrimonio…</p>;
  }

  if (error && !data) {
    return <p className="text-sm text-expense">{error}</p>;
  }

  if (!data) return null;

  const periodLabel = `${data.filter.from} – ${data.filter.to}`;
  const { metrics } = data;
  const lineData = data.evolutionLine.map((p) => ({ year: p.label, total: p.total }));

  const variacionSubtitle = metrics.previousSnapshotLabel
    ? `${formatPct(metrics.deltaPct, true)} · respecto a ${metrics.previousSnapshotLabel}`
    : undefined;

  const ltvSubtitle =
    metrics.ltv != null
      ? `Deuda ${formatEur(metrics.ltvDeuda)} / Activo ${formatEur(metrics.ltvActivo)}`
      : undefined;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Patrimonio actual</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            title="Patrimonio neto"
            value={formatEur(metrics.neto)}
            subtitle={`EUR · ${metrics.latestSnapshotLabel}`}
          />
          <KpiCard
            title="Variación vs snapshot anterior"
            value={formatEur(metrics.delta)}
            subtitle={variacionSubtitle}
          />
          <KpiCard
            title="LTV inmobiliario"
            value={metrics.ltv != null ? formatPct(metrics.ltv) : "—"}
            subtitle={ltvSubtitle}
          />
        </div>

        <SwitchableDistributionChart
          title="Diversificación por tipo"
          data={data.byTipo}
          color="#2563eb"
          defaultView="bar"
        />

        {(data.rentaVariableByNombre.length > 0 || data.inmobiliario.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.rentaVariableByNombre.length > 0 && (
              <SwitchableDistributionChart
                title="Renta variable por activo"
                data={data.rentaVariableByNombre}
                color="#2563eb"
                defaultView="bar"
              />
            )}
            {data.inmobiliario.length > 0 && (
              <InmobiliarioBarChart title="Inmobiliario por activo" data={data.inmobiliario} />
            )}
          </div>
        )}

        {data.accionesByEmpresa.length > 0 && (
          <SwitchableDistributionChart
            title="Acciones por entidad"
            data={data.accionesByEmpresa}
            color="#2563eb"
            defaultView="bar"
          />
        )}

        {data.inmobiliario.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-5 py-3 font-medium">Activo</th>
                  <th className="px-5 py-3 text-right font-medium">Valor bruto</th>
                  <th className="px-5 py-3 text-right font-medium">Deuda</th>
                  <th className="px-5 py-3 text-right font-medium">Neto</th>
                  <th className="px-5 py-3 text-right font-medium">LTV</th>
                </tr>
              </thead>
              <tbody>
                {data.inmobiliario.map((row) => (
                  <tr key={row.nombre} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">{row.nombre}</td>
                    <td className="px-5 py-3 text-right">{formatEur(row.valorBruto)}</td>
                    <td className="px-5 py-3 text-right">{row.deuda > 0 ? formatEur(row.deuda) : "—"}</td>
                    <td className="px-5 py-3 text-right">{formatEur(row.neto)}</td>
                    <td className="px-5 py-3 text-right">{row.ltv != null ? formatPct(row.ltv) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="text-lg font-semibold">Evolución</h2>

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

        {data.evolutionLine.length > 0 && (
          <IngresosLineChart
            data={lineData}
            title="Patrimonio neto total por snapshot"
            seriesLabel="Patrimonio neto"
            stroke="#2563eb"
          />
        )}

        {data.evolutionByTipo.length > 0 && data.tipoKeys.length > 0 && (
          <GroupedTipoBarChart
            title="Patrimonio por tipo"
            rows={data.evolutionByTipo}
            tipoKeys={data.tipoKeys}
          />
        )}
      </section>
    </div>
  );
}
