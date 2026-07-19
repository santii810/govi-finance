"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorMapForKeys } from "@/components/gastos/colors";
import { formatEur } from "@/lib/persona";
import type { NamedAmount } from "@/lib/types";

interface HorizontalBarChartProps {
  title: string;
  data: NamedAmount[];
  color?: string;
  colorMap?: Record<string, string>;
}

export function HorizontalBarChart({
  title,
  data,
  color = "#16a34a",
  colorMap: colorMapProp,
}: HorizontalBarChartProps) {
  const keys = useMemo(() => data.map((d) => d.name), [data]);
  const colorMap = useMemo(
    () => colorMapProp ?? colorMapForKeys(keys),
    [colorMapProp, keys],
  );
  const chartData = data.map((d) => ({ name: d.name, total: d.total }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-muted">{title}</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} stroke="#64748b" />
            <Tooltip formatter={(value: number) => formatEur(value)} />
            <Bar
              dataKey="total"
              fill={color}
              radius={[0, 4, 4, 0]}
              label={{ position: "right", formatter: (v: number) => formatEur(v), fontSize: 10 }}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={colorMap[entry.name] ?? color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
