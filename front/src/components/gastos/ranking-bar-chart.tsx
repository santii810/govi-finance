"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { formatEur } from "@/lib/persona";

const BAR_HEIGHT = 30;
const MIN_CHART_HEIGHT = 120;
const MAX_CHART_HEIGHT = 480;
const DEFAULT_LIMIT = 8;

interface RankingItem {
  name: string;
  total: number;
  count?: number;
}

interface RankingBarChartProps {
  items: RankingItem[];
  color?: string;
  colorMap?: Record<string, string>;
  limit?: number;
  formatValue?: (value: number) => string;
  formatAxis?: (value: number) => string;
}

function formatAxisK(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  if (value >= 100) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)} €`;
}

function RankingTooltip({
  active,
  payload,
  formatValue,
}: TooltipProps<number, string> & { formatValue: (value: number) => string }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as RankingItem | undefined;
  if (!row) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-2 font-medium text-foreground">{row.name}</p>
      <ul className="space-y-1">
        <li className="flex items-baseline justify-between gap-4">
          <span className="text-muted">Total</span>
          <span className="shrink-0 tabular-nums text-foreground">{formatValue(row.total)}</span>
        </li>
        {row.count != null && row.count > 0 && (
          <li className="flex items-baseline justify-between gap-4">
            <span className="text-muted">Gasto medio</span>
            <span className="shrink-0 tabular-nums text-foreground">
              {formatEur(row.total / row.count)}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

export function RankingBarChart({
  items,
  color = "#dc2626",
  colorMap,
  limit = DEFAULT_LIMIT,
  formatValue = formatEur,
  formatAxis = formatAxisK,
}: RankingBarChartProps) {
  const chartData = [...items]
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  if (chartData.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted">
        Sin datos
      </div>
    );
  }

  const maxLabelLen = Math.max(...chartData.map((d) => d.name.length));
  const yAxisWidth = Math.min(168, Math.max(96, maxLabelLen * 6.5));
  const chartHeight = Math.min(
    MAX_CHART_HEIGHT,
    Math.max(MIN_CHART_HEIGHT, chartData.length * BAR_HEIGHT + 20),
  );

  return (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            stroke="#64748b"
            tickFormatter={formatAxis}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={yAxisWidth}
            tick={{ fontSize: 11 }}
            stroke="#64748b"
            interval={0}
          />
          <Tooltip content={<RankingTooltip formatValue={formatValue} />} />
          <Bar dataKey="total" fill={color} radius={[0, 4, 4, 0]} barSize={20}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={colorMap?.[entry.name] ?? color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
