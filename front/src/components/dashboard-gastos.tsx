"use client";

import { useCallback, useEffect, useState } from "react";
import { GastosSidebar } from "@/components/gastos/sidebar";
import { NombreView } from "@/components/gastos/nombre-view";
import { OverviewView } from "@/components/gastos/overview-view";
import { PeriodFilter } from "@/components/gastos/period-filter";
import { RestauracionView } from "@/components/gastos/restauracion-view";
import { ViajesView } from "@/components/gastos/viajes-view";
import type { GastosData, GastosFilterMode, GastosSubTab } from "@/lib/types";

function buildQuery(
  subTab: GastosSubTab,
  mode: GastosFilterMode,
  yearFrom: string,
  yearTo: string,
): string {
  const params = new URLSearchParams({ subTab, mode });
  if (mode === "range") {
    params.set("from", yearFrom);
    params.set("to", yearTo);
  }
  return params.toString();
}

export function DashboardGastos() {
  const [data, setData] = useState<GastosData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [subTab, setSubTab] = useState<GastosSubTab>("vida");
  const [mode, setMode] = useState<GastosFilterMode>("current");
  const [yearFrom, setYearFrom] = useState("2012");
  const [yearTo, setYearTo] = useState(new Date().getFullYear().toString());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = buildQuery(subTab, mode, yearFrom, yearTo);
      const res = await fetch(`/api/dashboard/gastos?${qs}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al cargar");
      }
      const json = (await res.json()) as GastosData;
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
  }, [subTab, mode, yearFrom, yearTo]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <p className="text-sm text-muted">Cargando gastos…</p>;
  }

  if (error && !data) {
    return <p className="text-sm text-expense">{error}</p>;
  }

  if (!data) return null;

  const availableYears = data.availableYears;
  const filterQuery = buildQuery(subTab, mode, yearFrom, yearTo);

  function renderContent() {
    const { payload } = data!;
    if (payload.kind === "overview") {
      return <OverviewView data={payload.data} filterQuery={filterQuery} />;
    }
    if (payload.kind === "nombre") {
      const sectionLabel =
        data!.subTab === "supermercado" ? "Por supermercado" : "Por concepto";
      return (
        <NombreView
          data={payload.data}
          sectionLabel={sectionLabel}
          showMonthlyTable={data!.subTab === "piso"}
          filterQuery={filterQuery}
        />
      );
    }
    if (payload.kind === "viajes") {
      return <ViajesView data={payload.data} filterQuery={filterQuery} />;
    }
    return <RestauracionView data={payload.data} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex min-h-[480px] items-stretch">
        <GastosSidebar active={subTab} onSelect={setSubTab} />

        <div className="min-w-0 flex-1 space-y-4 p-4">
          <PeriodFilter
            mode={mode}
            yearFrom={yearFrom}
            yearTo={yearTo}
            availableYears={availableYears}
            onModeChange={setMode}
            onYearFromChange={setYearFrom}
            onYearToChange={setYearTo}
          />

          {loading && <p className="text-xs text-muted">Actualizando…</p>}

          {renderContent()}
        </div>
      </div>
    </div>
  );
}
