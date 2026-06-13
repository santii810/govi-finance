"use client";

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

export function YearChart({ data }: YearChartProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-muted">Ingresos vs Gastos — últimos 12 meses</p>
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
            <Legend />
            <Bar dataKey="ingresos" name="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gastos" name="Gastos" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
