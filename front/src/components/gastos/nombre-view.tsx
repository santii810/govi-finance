"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { TotalApuntadoCard } from "@/components/gastos/total-apuntado-card";
import { GastosMetricCard } from "@/components/gastos/gastos-metric-card";
import { SwitchableDistributionChart } from "@/components/ingresos/switchable-distribution-chart";
import { MONTHS } from "@/components/ingresos/year-filter";
import { useGastosDrilldown } from "@/components/gastos/use-gastos-drilldown";
import { PivotDetailModal } from "@/components/pivot-detail-modal";
import { PivotDrilldownCell } from "@/components/pivot-drilldown-cell";
import { formatEur } from "@/lib/persona";
import { computePivotColumnHeatRanges, pivotCellHeatBg } from "@/lib/pivot-drilldown";
import type { GastosMove, GastosNombreData } from "@/lib/types";

interface NombreViewProps {
  data: GastosNombreData;
  sectionLabel: string;
  showMonthlyTable: boolean;
  filterQuery: string;
}

interface EvolutionChartRow {
  month: string;
  total: number;
  previous: number | null;
}

function EvolutionTooltip({
  active,
  payload,
  label,
  currentLabel,
  previousLabel,
}: TooltipProps<number, string> & { currentLabel: string; previousLabel: string | null }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as EvolutionChartRow | undefined;
  if (!row) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-2 font-medium text-foreground">{label}</p>
      <ul className="space-y-1">
        <li className="flex items-baseline justify-between gap-4">
          <span className="text-muted">{currentLabel}</span>
          <span className="shrink-0 tabular-nums text-foreground">{formatEur(row.total)}</span>
        </li>
        {row.previous != null && row.previous > 0 && previousLabel && (
          <li className="flex items-baseline justify-between gap-4">
            <span className="text-muted">{previousLabel}</span>
            <span className="shrink-0 tabular-nums text-muted">{formatEur(row.previous)}</span>
          </li>
        )}
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

export function NombreView({ data, sectionLabel, showMonthlyTable, filterQuery }: NombreViewProps) {
  const { selection, moves, loading, error, openCell, close, reload } = useGastosDrilldown({
    filterQuery,
    view: "nombre",
  });
  const dataMap = Object.fromEntries(data.byNombre.map((n) => [n.name, n.total]));
  const nameKeys = data.nameKeys.filter((k) => (dataMap[k] ?? 0) > 0);

  const lineData: EvolutionChartRow[] = MONTHS.map((month, idx) => ({
    month,
    total: data.monthlyEvolution[idx] ?? 0,
    previous: data.monthlyEvolutionPrevious?.[idx] ?? null,
  }));
  const showPreviousLine = data.monthlyEvolutionPrevious?.some((v) => v > 0) ?? false;

  const columnHeat = data.monthlyByNombre
    ? computePivotColumnHeatRanges(data.monthlyByNombre, nameKeys)
    : {};

  return (
    <div className="space-y-6">
      {selection && (
        <PivotDetailModal
          selection={selection}
          moves={moves}
          loading={loading}
          error={error}
          labelHeader="Concepto"
          onClose={close}
          editable
          onAfterSave={() => void reload()}
        />
      )}

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

      <SwitchableDistributionChart
        title={sectionLabel}
        data={nameKeys.map((k) => ({ name: k, total: dataMap[k] ?? 0 }))}
        color="#dc2626"
      />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-4 text-sm font-medium text-muted">Gasto medio mensual</p>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(v) => formatEur(v)} />
              <Tooltip
                content={
                  <EvolutionTooltip
                    currentLabel={data.currentPeriodLabel}
                    previousLabel={data.previousPeriodLabel}
                  />
                }
              />
              {showPreviousLine && (
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={{ r: 2, fill: "#94a3b8", strokeWidth: 0 }}
                  connectNulls
                />
              )}
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
                    {nameKeys.map((k) => {
                      const value = row.values[k] ?? 0;
                      if (value <= 0) {
                        return (
                          <td key={k} className="px-3 py-2 text-right tabular-nums text-muted">
                            ·
                          </td>
                        );
                      }
                      return (
                        <td
                          key={k}
                          className="p-0 text-right tabular-nums"
                          style={{ background: pivotCellHeatBg(value, columnHeat[k] ?? { min: 0, max: 0 }) }}
                        >
                          <PivotDrilldownCell
                            value={value}
                            onClick={() => openCell(row.month, k)}
                          />
                        </td>
                      );
                    })}
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
