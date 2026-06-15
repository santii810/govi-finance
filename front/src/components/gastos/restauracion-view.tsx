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
import { NAME_COLORS } from "@/components/gastos/colors";
import { TotalApuntadoCard } from "@/components/gastos/total-apuntado-card";
import { formatEur } from "@/lib/persona";
import type { GastosMove, GastosRestauracionData } from "@/lib/types";

interface RestauracionViewProps {
  data: GastosRestauracionData;
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

export function RestauracionView({ data }: RestauracionViewProps) {
  const maxSlots = Math.max(0, ...data.stackedByMonth.map((m) => m.tickets.length));
  const chartRows = data.stackedByMonth.map((m) => {
    const row: Record<string, number | string> = { month: m.monthLabel };
    m.tickets.forEach((ticket, slot) => {
      row[`t${slot}`] = ticket;
    });
    return row;
  });

  const ticketTotal = data.monthlySummary.reduce((s, r) => s + r.tickets, 0);

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

      {chartRows.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted">Gasto mensual y diversificación</p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip formatter={(v: number) => formatEur(v)} />
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
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Resumen mensual</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/80">
                <th className="px-3 py-2 text-left font-medium">Mes</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Tickets</th>
              </tr>
            </thead>
            <tbody>
              {data.monthlySummary.map((row) => (
                <tr key={row.monthLabel} className="border-b border-border/60">
                  <td className="px-3 py-2">{row.monthLabel}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatEur(row.total)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.tickets}</td>
                </tr>
              ))}
              <tr className="bg-background/80 font-medium">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatEur(data.total)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{ticketTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Últimos movimientos</p>
        <MovesTable moves={data.recentMoves} />
      </div>
    </div>
  );
}
