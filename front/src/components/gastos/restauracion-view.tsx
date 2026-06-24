"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { NAME_COLORS, siteColorMap } from "@/components/gastos/colors";
import { RankingBarChart } from "@/components/gastos/ranking-bar-chart";
import { TotalApuntadoCard } from "@/components/gastos/total-apuntado-card";
import { formatEur } from "@/lib/persona";
import type { GastosMove, GastosRestauracionData } from "@/lib/types";

interface RestauracionViewProps {
  data: GastosRestauracionData;
}

interface RestauracionChartRow {
  month: string;
  [key: string]: number | string;
}

function RestauracionTooltip({ active, payload, label }: TooltipProps<number, string>) {
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
  const chartRows: RestauracionChartRow[] = data.stackedByMonth.map((m) => {
    const row: RestauracionChartRow = { month: m.monthLabel };
    m.tickets.forEach((ticket, slot) => {
      row[`t${slot}`] = ticket.amount;
      row[`c${slot}`] = ticket.concept;
    });
    return row;
  });

  const ticketTotal = data.monthlySummary.reduce((s, r) => s + r.tickets, 0);
  const topSiteColors = siteColorMap([
    ...data.topByVisits.map((item) => item.name),
    ...data.topBySpending.map((item) => item.name),
    ...data.topExpensiveMeals.map((item) => item.site),
  ]);

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
                <Tooltip content={<RestauracionTooltip />} />
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted">Top 10 sitios más visitados</p>
          <RankingBarChart
            items={data.topByVisits}
            color="#db2777"
            colorMap={topSiteColors}
            limit={10}
            formatValue={(value) => `${value} ${value === 1 ? "visita" : "visitas"}`}
            formatAxis={(value) => String(Math.round(value))}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted">Top 10 sitios por gasto</p>
          <RankingBarChart
            items={data.topBySpending}
            color="#db2777"
            colorMap={topSiteColors}
            limit={10}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted">Top 10 comidas más caras</p>
          <RankingBarChart
            items={data.topExpensiveMeals}
            color="#db2777"
            colorMap={topSiteColors}
            limit={10}
          />
        </div>
      </div>

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
