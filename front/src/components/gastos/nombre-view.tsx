"use client";

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
} from "recharts";
import { colorMapForKeys, fmtK } from "@/components/gastos/colors";
import { TotalApuntadoCard } from "@/components/gastos/total-apuntado-card";
import { Treemap } from "@/components/gastos/treemap";
import { UsageBar } from "@/components/gastos/usage-bar";
import { MONTHS } from "@/components/ingresos/year-filter";
import { formatEur } from "@/lib/persona";
import type { GastosMove, GastosNombreData } from "@/lib/types";

interface NombreViewProps {
  data: GastosNombreData;
  sectionLabel: string;
  showMonthlyTable: boolean;
}

function MovesTable({ moves }: { moves: GastosMove[] }) {
  if (moves.length === 0) {
    return <p className="text-sm text-muted">Sin movimientos recientes.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background/80">
            <th className="px-3 py-2 text-left font-medium">Fecha</th>
            <th className="px-3 py-2 text-left font-medium">Concepto</th>
            <th className="px-3 py-2 text-right font-medium">Importe</th>
          </tr>
        </thead>
        <tbody>
          {moves.map((m, i) => (
            <tr key={i} className="border-b border-border/60">
              <td className="px-3 py-2">{m.date}</td>
              <td className="px-3 py-2">{m.concept}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatEur(m.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NombreView({ data, sectionLabel, showMonthlyTable }: NombreViewProps) {
  const dataMap = Object.fromEntries(data.byNombre.map((n) => [n.name, n.total]));
  const nameKeys = data.nameKeys;
  const colors = colorMapForKeys(nameKeys);
  const total = data.total;

  const usageSegments = nameKeys.map((k) => ({
    id: k,
    value: dataMap[k] ?? 0,
    color: colors[k],
  }));

  const lineData = MONTHS.map((month, idx) => ({
    month,
    total: data.monthlyEvolution[idx] ?? 0,
  }));

  const rankedChart = nameKeys.map((k) => ({ name: k, total: fmtK(dataMap[k] ?? 0) }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TotalApuntadoCard total={data.total} ytdComparison={data.ytdComparison} />
        <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
          <p className="text-sm font-medium text-muted">Media mensual</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-expense">
            {formatEur(Math.round(data.monthlyAverage))}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">{sectionLabel}</p>
        <UsageBar segments={usageSegments} total={total} />
        <Treemap data={dataMap} colorMap={colors} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-4 text-sm font-medium text-muted">Ranking por nombre</p>
        <div className="h-52 w-full">
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
        <p className="mb-4 text-sm font-medium text-muted">Evolución mensual</p>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatEur(v)} />
              <Line type="monotone" dataKey="total" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showMonthlyTable && data.monthlyByNombre && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Gastos mensuales</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-border bg-background/80">
                  <th className="px-3 py-2 text-left font-medium">Mes</th>
                  {nameKeys.map((k) => (
                    <th key={k} className="px-3 py-2 text-right font-medium">
                      {k}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyByNombre.map((row) => (
                  <tr key={row.month} className="border-b border-border/60">
                    <td className="px-3 py-2">{row.month}</td>
                    {nameKeys.map((k) => (
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
                  {nameKeys.map((k) => {
                    const colTotal = data.monthlyByNombre!.reduce((s, r) => s + (r.values[k] ?? 0), 0);
                    return (
                      <td key={k} className="px-3 py-2 text-right tabular-nums">
                        {formatEur(colTotal)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatEur(data.monthlyByNombre.reduce((s, r) => s + r.total, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Últimos movimientos</p>
        <MovesTable moves={data.recentMoves} />
      </div>
    </div>
  );
}
