"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { NAME_COLORS } from "@/components/gastos/colors";
import { MONTHS } from "@/components/ingresos/year-filter";
import { formatEur } from "@/lib/persona";
import type { GastosRestauracionMonthStack } from "@/lib/types";

type ChartView = "bars" | "lines";

const VIEWS: { id: ChartView; label: string }[] = [
  { id: "bars", label: "Barras" },
  { id: "lines", label: "Líneas" },
];

interface RestauracionChartRow {
  month: string;
  [key: string]: number | string | null;
}

interface SwitchableRestauracionChartProps {
  stackedByMonth: GastosRestauracionMonthStack[];
  monthlyTotals: number[];
  monthlyTotalsPrevious: number[] | null;
  currentPeriodLabel: string;
  previousPeriodLabel: string | null;
}

function BarIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${active ? "text-white" : "text-muted"}`}
      fill="currentColor"
      aria-hidden
    >
      <rect x="2" y="10" width="4" height="8" rx="0.5" />
      <rect x="8" y="6" width="4" height="12" rx="0.5" />
      <rect x="14" y="2" width="4" height="16" rx="0.5" />
    </svg>
  );
}

function LineIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${active ? "text-white" : "text-muted"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="2,14 7,9 11,12 18,4" />
    </svg>
  );
}

function viewIcon(view: ChartView, active: boolean) {
  return view === "bars" ? <BarIcon active={active} /> : <LineIcon active={active} />;
}

function StackedBarsTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as RestauracionChartRow | undefined;
  if (!row) return null;

  const entries = payload
    .filter((entry) => typeof entry.value === "number" && entry.value > 0)
    .map((entry) => {
      const slot = String(entry.dataKey ?? "").replace(/^t/, "");
      const concept = row[`c${slot}`];
      return {
        key: String(entry.dataKey),
        concept: typeof concept === "string" && concept ? concept : String(entry.dataKey),
        amount: entry.value as number,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-2 font-medium text-foreground">{label}</p>
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li key={entry.key} className="flex items-baseline justify-between gap-4">
            <span className="truncate text-foreground">{entry.concept}</span>
            <span className="shrink-0 tabular-nums text-muted">{formatEur(entry.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonTooltip({
  active,
  payload,
  label,
  currentLabel,
  previousLabel,
}: TooltipProps<number, string> & { currentLabel: string; previousLabel: string | null }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as RestauracionChartRow | undefined;
  if (!row) return null;

  const current = row.current as number;
  const previous = row.previous as number | null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-2 font-medium text-foreground">{label}</p>
      <ul className="space-y-1">
        <li className="flex items-baseline justify-between gap-4">
          <span className="text-muted">{currentLabel}</span>
          <span className="shrink-0 tabular-nums text-foreground">{formatEur(current)}</span>
        </li>
        {previous != null && previous > 0 && previousLabel && (
          <li className="flex items-baseline justify-between gap-4">
            <span className="text-muted">{previousLabel}</span>
            <span className="shrink-0 tabular-nums text-muted">{formatEur(previous)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

export function SwitchableRestauracionChart({
  stackedByMonth,
  monthlyTotals,
  monthlyTotalsPrevious,
  currentPeriodLabel,
  previousPeriodLabel,
}: SwitchableRestauracionChartProps) {
  const [view, setView] = useState<ChartView>("bars");

  const maxSlots = Math.max(0, ...stackedByMonth.map((m) => m.tickets.length));
  const barRows: RestauracionChartRow[] = stackedByMonth.map((m) => {
    const row: RestauracionChartRow = { month: m.monthLabel };
    m.tickets.forEach((ticket, slot) => {
      row[`t${slot}`] = ticket.amount;
      row[`c${slot}`] = ticket.concept;
    });
    return row;
  });

  const lineRows: RestauracionChartRow[] = MONTHS.map((month, idx) => ({
    month,
    current: monthlyTotals[idx] ?? 0,
    previous: monthlyTotalsPrevious?.[idx] ?? null,
  }));

  const showPreviousLine = monthlyTotalsPrevious?.some((v) => v > 0) ?? false;
  const hasData = barRows.length > 0 || monthlyTotals.some((v) => v > 0);

  if (!hasData) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">Gasto mensual y diversificación</p>
        <div
          className="flex shrink-0 rounded-lg border border-border"
          role="group"
          aria-label="Tipo de gráfica"
        >
          {VIEWS.map(({ id, label }) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={active}
                onClick={() => setView(id)}
                className={`px-2 py-1.5 transition first:rounded-l-lg last:rounded-r-lg ${
                  active ? "bg-accent text-white" : "bg-background text-muted hover:bg-card"
                }`}
              >
                {viewIcon(id, active)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-60 w-full">
        {view === "bars" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
              <Tooltip content={<StackedBarsTooltip />} />
              {Array.from({ length: maxSlots }, (_, slot) => (
                <Bar
                  key={slot}
                  dataKey={`t${slot}`}
                  stackId="tickets"
                  fill={NAME_COLORS[slot % NAME_COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(v) => formatEur(v)} />
              <Tooltip
                content={
                  <ComparisonTooltip
                    currentLabel={currentPeriodLabel}
                    previousLabel={previousPeriodLabel}
                  />
                }
              />
              {showPreviousLine && (
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={{ r: 2, fill: "#94a3b8", strokeWidth: 0 }}
                  connectNulls
                />
              )}
              <Line
                type="monotone"
                dataKey="current"
                stroke="#db2777"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
