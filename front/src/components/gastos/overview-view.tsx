"use client";

import { colorMapForKeys } from "@/components/gastos/colors";
import { GastosMetricCard } from "@/components/gastos/gastos-metric-card";
import { RankingBarChart } from "@/components/gastos/ranking-bar-chart";
import { TotalApuntadoCard } from "@/components/gastos/total-apuntado-card";
import { Treemap } from "@/components/gastos/treemap";
import { UsageBar } from "@/components/gastos/usage-bar";
import { useGastosDrilldown } from "@/components/gastos/use-gastos-drilldown";
import { PivotDetailModal } from "@/components/pivot-detail-modal";
import { PivotDrilldownCell } from "@/components/pivot-drilldown-cell";
import { formatEur } from "@/lib/persona";
import { computePivotColumnHeatRanges, pivotCellHeatBg } from "@/lib/pivot-drilldown";
import type { GastosOverviewData } from "@/lib/types";

interface OverviewViewProps {
  data: GastosOverviewData;
  filterQuery: string;
}

export function OverviewView({ data, filterQuery }: OverviewViewProps) {
  const { selection, moves, loading, error, openCell, close, reload } = useGastosDrilldown({
    filterQuery,
    view: "overview",
  });
  const dataMap = Object.fromEntries(data.byCategoria.map((c) => [c.name, c.total]));
  const keys = data.categoriaKeys.filter((k) => (dataMap[k] ?? 0) > 0);
  const total = data.total;
  const colors = colorMapForKeys(keys);

  const usageSegments = keys.map((k) => ({
    id: k,
    value: dataMap[k] ?? 0,
    color: colors[k]!,
  }));

  const tableHeaders = ["Mes", ...keys, "Total"];
  const categoryTotals = keys.reduce<Record<string, number>>((acc, k) => {
    acc[k] = data.monthlyTable.reduce((sum, row) => sum + (row.values[k] ?? 0), 0);
    return acc;
  }, {});
  const columnHeat = computePivotColumnHeatRanges(data.monthlyTable, keys);
  const grandTotal = data.monthlyTable.reduce((sum, row) => sum + row.total, 0);

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
          <RankingBarChart
            items={keys.map((k) => ({ name: k, total: dataMap[k] ?? 0 }))}
            colorMap={colors}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted">Participación (%)</p>
          <div className="space-y-3">
            {keys.slice(0, 6).map((k) => {
              const value = dataMap[k] ?? 0;
              const pct = total > 0 ? (value / total) * 100 : 0;
              return (
                <div key={k} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: colors[k] }}
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
                  {keys.map((k) => {
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
