"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { formatEur } from "@/lib/persona";
import type { IngresosYearPoint } from "@/lib/types";

interface IngresosLineChartProps {
  data: IngresosYearPoint[];
  title?: string;
  seriesLabel?: string;
  stroke?: string;
}

function formatYoY(current: number, previous: number): string {
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const prefix = pct > 0 ? "+" : "";
  return `${prefix}${pct.toFixed(1)}% respecto año anterior`;
}

function previousYearTotal(data: IngresosYearPoint[], year: string): number | undefined {
  const prevYear = String(Number(year) - 1);
  return data.find((d) => d.year === prevYear)?.total;
}

function IngresosLineTooltip({
  active,
  payload,
  label,
  data,
  seriesLabel,
}: TooltipProps<number, string> & { data: IngresosYearPoint[]; seriesLabel: string }) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as IngresosYearPoint | undefined;
  if (!point) return null;

  const previous = previousYearTotal(data, point.year);
  const yoy =
    previous != null && previous !== 0 ? formatYoY(point.total, previous) : null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-2 font-medium text-foreground">{label}</p>
      <ul className="space-y-1">
        <li className="flex items-baseline justify-between gap-4">
          <span className="text-muted">{seriesLabel}</span>
          <span className="shrink-0 tabular-nums text-foreground">{formatEur(point.total)}</span>
        </li>
        {yoy && (
          <li className="text-muted tabular-nums">{yoy}</li>
        )}
      </ul>
    </div>
  );
}

export function IngresosLineChart({
  data,
  title = "Ingresos por año",
  seriesLabel = "Ingresos",
  stroke = "#16a34a",
}: IngresosLineChartProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-muted">{title}</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="#64748b" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#64748b"
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              content={
                <IngresosLineTooltip data={data} seriesLabel={seriesLabel} />
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              name={seriesLabel}
              stroke={stroke}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
