"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyBar } from "@/lib/types";
import { formatEur } from "@/lib/persona";

interface YearChartProps {
  data: MonthlyBar[];
}

type SeriesKey = "ingresos" | "gastos" | "inversion";

const SERIES: { key: SeriesKey; name: string; fill: string }[] = [
  { key: "ingresos", name: "Ingresos", fill: "#16a34a" },
  { key: "gastos", name: "Gastos", fill: "#dc2626" },
  { key: "inversion", name: "Inversión", fill: "#2563eb" },
];

export function YearChart({ data }: YearChartProps) {
  const [hidden, setHidden] = useState<Partial<Record<SeriesKey, boolean>>>({});

  function toggleSeries(dataKey: string | number | undefined) {
    if (dataKey === undefined) return;
    const key = String(dataKey) as SeriesKey;
    if (!SERIES.some((s) => s.key === key)) return;
    setHidden((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-medium text-muted">
          Ingresos, gastos e inversión — últimos 12 meses
        </p>
        <p className="mt-0.5 text-xs text-muted/80">Pulsa la leyenda para ocultar o mostrar series</p>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#64748b"
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              formatter={(value: number) => formatEur(value)}
              contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
            />
            <Legend
              wrapperStyle={{ cursor: "pointer" }}
              onClick={(entry) => toggleSeries(entry.dataKey as string | number | undefined)}
              formatter={(value, entry) => {
                const key = entry.dataKey as SeriesKey;
                const isHidden = hidden[key];
                return (
                  <span
                    style={{
                      color: isHidden ? "#94a3b8" : entry.color,
                      textDecoration: isHidden ? "line-through" : "none",
                    }}
                  >
                    {value}
                  </span>
                );
              }}
            />
            {SERIES.map((series) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.name}
                fill={series.fill}
                hide={hidden[series.key]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
