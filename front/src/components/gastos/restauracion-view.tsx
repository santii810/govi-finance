"use client";

import { siteColorMap } from "@/components/gastos/colors";
import { RankingBarChart } from "@/components/gastos/ranking-bar-chart";
import { SwitchableRestauracionChart } from "@/components/gastos/switchable-restauracion-chart";
import { TotalApuntadoCard } from "@/components/gastos/total-apuntado-card";
import { GastosMetricCard } from "@/components/gastos/gastos-metric-card";
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
  const ticketTotal = data.monthlySummary.reduce((s, r) => s + r.tickets, 0);
  const topSiteColors = siteColorMap([
    ...data.topByVisits.map((item) => item.name),
    ...data.topBySpending.map((item) => item.name),
    ...data.topExpensiveMeals.map((item) => item.site),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <TotalApuntadoCard total={data.total} ytdComparison={data.ytdComparison} />
        <GastosMetricCard centered>
          <p className="text-sm font-medium text-muted">Registros</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{data.records}</p>
          <p className="mt-2 text-xs text-muted">movimientos</p>
        </GastosMetricCard>
        <GastosMetricCard centered>
          <p className="text-sm font-medium text-muted">Media mensual</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-expense">
            {formatEur(Math.round(data.monthlyAverage))}
          </p>
        </GastosMetricCard>
      </div>

      <SwitchableRestauracionChart
        stackedByMonth={data.stackedByMonth}
        monthlyTotals={data.monthlyTotals}
        monthlyTotalsPrevious={data.monthlyTotalsPrevious}
        currentPeriodLabel={data.currentPeriodLabel}
        previousPeriodLabel={data.previousPeriodLabel}
      />

      <div className="grid gap-4 overflow-visible lg:grid-cols-3">
        <div className="overflow-visible rounded-2xl border border-border bg-card p-5 shadow-sm">
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

        <div className="overflow-visible rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted">Top 10 sitios por gasto</p>
          <RankingBarChart
            items={data.topBySpending}
            color="#db2777"
            colorMap={topSiteColors}
            limit={10}
          />
        </div>

        <div className="overflow-visible rounded-2xl border border-border bg-card p-5 shadow-sm">
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
