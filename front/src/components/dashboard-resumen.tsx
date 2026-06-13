"use client";

import { useEffect, useState } from "react";
import { MetricsGrid } from "@/components/metric-card";
import { YearChart } from "@/components/year-chart";
import type { ResumenData } from "@/lib/types";

export function DashboardResumen() {
  const [data, setData] = useState<ResumenData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/dashboard/resumen");
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "Error al cargar");
        }
        const json = (await res.json()) as ResumenData;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted">Cargando dashboard…</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-expense">{error || "No se pudo cargar el dashboard"}</p>;
  }

  return (
    <div className="space-y-6">
      <MetricsGrid metrics={data.metrics} />
      <YearChart data={data.chart} />
    </div>
  );
}
