"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatEur } from "@/lib/persona";
import type { NamedAmount } from "@/lib/types";

const COLORS = ["#16a34a", "#2563eb", "#ca8a04", "#9333ea", "#dc2626", "#0891b2", "#ea580c", "#64748b"];

interface DistributionPieProps {
  title: string;
  data: NamedAmount[];
  signed?: boolean;
}

export function DistributionPie({ title, data, signed = false }: DistributionPieProps) {
  const chartData = data
    .filter((d) => (signed ? d.total !== 0 : d.total > 0))
    .map((d) => ({
      name: d.name,
      value: signed ? Math.abs(d.total) : d.total,
      signedTotal: d.total,
    }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-muted">{title}</p>
      <div className="h-64 w-full">
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
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
      </div>
    </div>
  );
}
