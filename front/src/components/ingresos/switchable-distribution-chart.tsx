"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorMapForKeys } from "@/components/gastos/colors";
import { Treemap } from "@/components/gastos/treemap";
import { formatEur } from "@/lib/persona";
import type { NamedAmount } from "@/lib/types";

type ChartView = "bar" | "donut" | "treemap";

const VIEWS: { id: ChartView; label: string }[] = [
  { id: "bar", label: "Barras" },
  { id: "donut", label: "Donut" },
  { id: "treemap", label: "Treemap" },
];

interface SwitchableDistributionChartProps {
  title: string;
  data: NamedAmount[];
  color?: string;
  signed?: boolean;
  /** En vista barras incluye valores negativos (p. ej. Hipoteca en patrimonio). Donut/treemap siguen solo positivos. */
  barSigned?: boolean;
  defaultView?: ChartView;
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

function DonutIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${active ? "text-white" : "text-muted"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="3" fill="var(--card)" stroke="none" />
    </svg>
  );
}

function TreemapIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${active ? "text-white" : "text-muted"}`}
      fill="currentColor"
      aria-hidden
    >
      <rect x="2" y="2" width="9" height="11" rx="1" />
      <rect x="13" y="2" width="5" height="6" rx="1" />
      <rect x="2" y="15" width="5" height="3" rx="0.5" />
      <rect x="9" y="15" width="9" height="3" rx="0.5" />
      <rect x="13" y="10" width="5" height="3" rx="0.5" />
    </svg>
  );
}

function viewIcon(view: ChartView, active: boolean) {
  switch (view) {
    case "bar":
      return <BarIcon active={active} />;
    case "donut":
      return <DonutIcon active={active} />;
    case "treemap":
      return <TreemapIcon active={active} />;
  }
}

function BarView({
  items,
  color,
  colorMap,
  signed = false,
}: {
  items: NamedAmount[];
  color: string;
  colorMap: Record<string, string>;
  signed?: boolean;
}) {
  const chartData = items.filter((d) => (signed ? d.total !== 0 : d.total > 0));

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">Sin datos</div>
    );
  }

  const maxLabelLen = Math.max(...chartData.map((d) => d.name.length));
  const yAxisWidth = Math.min(168, Math.max(90, maxLabelLen * 6.5));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          stroke="#64748b"
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={yAxisWidth}
          tick={{ fontSize: 11 }}
          stroke="#64748b"
          interval={0}
        />
        <Tooltip formatter={(value: number) => formatEur(value)} />
        <Bar dataKey="total" fill={color} radius={[0, 4, 4, 0]} barSize={20}>
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={
                signed && entry.total < 0
                  ? "#ca8a04"
                  : (colorMap[entry.name] ?? color)
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DonutView({
  items,
  signed,
  colorMap,
}: {
  items: NamedAmount[];
  signed: boolean;
  colorMap: Record<string, string>;
}) {
  const chartData = items
    .filter((d) => (signed ? d.total !== 0 : d.total > 0))
    .map((d) => ({
      name: d.name,
      value: signed ? Math.abs(d.total) : d.total,
      signedTotal: d.total,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">Sin datos</div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={1}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={colorMap[entry.name]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, _name: string, item: { payload?: { signedTotal?: number } }) =>
            formatEur(signed ? (item.payload?.signedTotal ?? value) : value)
          }
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SwitchableDistributionChart({
  title,
  data,
  color = "#16a34a",
  signed = false,
  barSigned = false,
  defaultView = "treemap",
}: SwitchableDistributionChartProps) {
  const [view, setView] = useState<ChartView>(defaultView);

  const keys = useMemo(
    () => data.filter((d) => (signed ? d.total !== 0 : d.total > 0)).map((d) => d.name),
    [data, signed],
  );
  const colorMap = useMemo(() => colorMapForKeys(keys), [keys]);
  const dataMap = useMemo(
    () =>
      Object.fromEntries(
        data.filter((d) => d.total > 0).map((d) => [d.name, d.total]),
      ),
    [data],
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{title}</p>
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
                  active
                    ? "bg-accent text-white"
                    : "bg-background text-muted hover:bg-card"
                }`}
              >
                {viewIcon(id, active)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-64 w-full">
        {view === "bar" && (
          <BarView items={data} color={color} colorMap={colorMap} signed={barSigned || signed} />
        )}
        {view === "donut" && <DonutView items={data} signed={signed} colorMap={colorMap} />}
        {view === "treemap" && (
          <Treemap data={dataMap} colorMap={colorMap} bare className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
