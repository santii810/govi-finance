"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { categoryColor, colorMapForKeys, fmtK } from "@/components/gastos/colors";
import { TotalApuntadoCard } from "@/components/gastos/total-apuntado-card";
import { Treemap } from "@/components/gastos/treemap";
import { UsageBar } from "@/components/gastos/usage-bar";
import { formatEur } from "@/lib/persona";
import type { GastosOverviewData } from "@/lib/types";

interface OverviewViewProps {
  data: GastosOverviewData;
}

export function OverviewView({ data }: OverviewViewProps) {
  const dataMap = Object.fromEntries(data.byCategoria.map((c) => [c.name, c.total]));
  const keys = data.categoriaKeys;
  const total = data.total;
  const colors = colorMapForKeys(keys);

  const usageSegments = keys.map((k, i) => ({
    id: k,
    value: dataMap[k] ?? 0,
    color: categoryColor(k, i),
  }));

  const rankedKeys = [...keys].sort((a, b) => (dataMap[b] ?? 0) - (dataMap[a] ?? 0));
  const rankedChart = rankedKeys.map((k) => ({ name: k, total: fmtK(dataMap[k] ?? 0) }));

  const tableHeaders = ["Mes", ...keys, "Total"];
  const categoryTotals = keys.reduce<Record<string, number>>((acc, k) => {
    acc[k] = data.monthlyTable.reduce((sum, row) => sum + (row.values[k] ?? 0), 0);
    return acc;
  }, {});
  const grandTotal = data.monthlyTable.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TotalApuntadoCard total={data.total} ytdComparison={data.ytdComparison} />
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Registros</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{data.records}</p>
          <p className="mt-2 text-xs text-muted">movimientos</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Distribución por categoría</p>
        <UsageBar
          segments={usageSegments}
          total={total}
          topLeftLabel={`${keys.length} categorías`}
        />
        <Treemap data={dataMap} colorMap={colors} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted">Ranking por categoría</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankedChart} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip formatter={(v: number) => `${v} k`} />
                <Bar dataKey="total" fill="#dc2626" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted">Participación (%)</p>
          <div className="space-y-3">
            {keys.slice(0, 6).map((k, i) => {
              const value = dataMap[k] ?? 0;
              const pct = total > 0 ? (value / total) * 100 : 0;
              return (
                <div key={k} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: categoryColor(k, i) }}
                  />
                  <span className="flex-1 truncate">{k}</span>
                  <span className="font-medium">{pct.toFixed(0)} %</span>
                  <span className="text-xs text-muted">{formatEur(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Categoría × cantidad</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border bg-background/80">
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    className={`px-3 py-2 font-medium ${h === "Mes" ? "text-left" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.monthlyTable.map((row) => (
                <tr key={row.month} className="border-b border-border/60">
                  <td className="px-3 py-2">{row.month}</td>
                  {keys.map((k) => (
                    <td key={k} className="px-3 py-2 text-right tabular-nums">
                      {(row.values[k] ?? 0) > 0 ? formatEur(row.values[k]) : "·"}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {row.total > 0 ? formatEur(row.total) : "·"}
                  </td>
                </tr>
              ))}
              <tr className="bg-background/80 font-medium">
                <td className="px-3 py-2">Total</td>
                {keys.map((k) => (
                  <td key={k} className="px-3 py-2 text-right tabular-nums">
                    {formatEur(categoryTotals[k])}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{formatEur(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
