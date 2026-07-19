"use client";

import { Fragment } from "react";
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
import { colorMapForKeys } from "@/components/gastos/colors";
import { GastosMetricCard } from "@/components/gastos/gastos-metric-card";
import { TotalApuntadoCard } from "@/components/gastos/total-apuntado-card";
import { useGastosDrilldown } from "@/components/gastos/use-gastos-drilldown";
import { SwitchableDistributionChart } from "@/components/ingresos/switchable-distribution-chart";
import { PivotDetailModal } from "@/components/pivot-detail-modal";
import { PivotDrilldownCell } from "@/components/pivot-drilldown-cell";
import { formatEur } from "@/lib/persona";
import type { GastosViajesData } from "@/lib/types";

interface ViajesViewProps {
  data: GastosViajesData;
  filterQuery: string;
}

export function ViajesView({ data, filterQuery }: ViajesViewProps) {
  const { selection, moves, loading, error, openCell, close, reload } = useGastosDrilldown({
    filterQuery,
    view: "viajes",
  });
  const periodTotal = data.tripsByYear.reduce(
    (sum, block) => sum + block.trips.reduce((s, t) => s + t.total, 0),
    0,
  );
  const allTrips = data.tripsByYear.flatMap((block) => block.trips);
  const avgPerTrip = data.tripCount > 0 ? data.total / data.tripCount : null;
  const cheapestTrip =
    allTrips.length > 0
      ? allTrips.reduce((min, trip) => (trip.total < min.total ? trip : min), allTrips[0]!)
      : null;
  const priciestTrip =
    allTrips.length > 0
      ? allTrips.reduce((max, trip) => (trip.total > max.total ? trip : max), allTrips[0]!)
      : null;
  const ubicColors = colorMapForKeys(data.ubicacionKeys);

  return (
    <div className="space-y-6">
      {selection && (
        <PivotDetailModal
          selection={selection}
          moves={moves}
          loading={loading}
          error={error}
          labelHeader="Destino"
          onClose={close}
          editable
          onAfterSave={() => void reload()}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TotalApuntadoCard total={data.total} ytdComparison={data.ytdComparison} />
        <GastosMetricCard centered>
          <p className="text-sm font-medium text-muted">Viajes</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{data.tripCount}</p>
          <p className="mt-2 text-xs text-muted">en el período</p>
        </GastosMetricCard>
        <GastosMetricCard centered>
          <p className="text-sm font-medium text-muted">Gasto medio por viaje</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-expense">
            {avgPerTrip != null ? formatEur(avgPerTrip) : "—"}
          </p>
        </GastosMetricCard>
        <GastosMetricCard centered>
          {priciestTrip && cheapestTrip ? (
            <div className="grid w-full grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted">Más caro</p>
                <p className="font-semibold text-expense tabular-nums">{formatEur(priciestTrip.total)}</p>
                <p className="truncate text-xs text-muted" title={priciestTrip.nombre}>
                  {priciestTrip.nombre}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Más barato</p>
                <p className="font-semibold tabular-nums">{formatEur(cheapestTrip.total)}</p>
                <p className="truncate text-xs text-muted" title={cheapestTrip.nombre}>
                  {cheapestTrip.nombre}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-3xl font-semibold tracking-tight">—</p>
          )}
        </GastosMetricCard>
      </div>

      {data.stackedByYear.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted">Gasto por año</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.stackedByYear} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#64748b"
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip formatter={(value: number) => formatEur(value)} />
                <Legend />
                {data.ubicacionKeys.map((ubic) => (
                  <Bar
                    key={ubic}
                    dataKey={ubic}
                    name={ubic}
                    stackId="year"
                    fill={ubicColors[ubic]}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.pivot.categorias.length > 0 && (
        <SwitchableDistributionChart
          title="Por categoría"
          data={data.pivot.categorias.map((cat) => ({
            name: cat,
            total: data.pivot.colTotals[cat] ?? 0,
          }))}
          color="#dc2626"
        />
      )}

      {data.pivot.rows.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Desglose viaje × categoría</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/80">
                  <th className="px-3 py-2 text-left font-medium">Ubicación</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  {data.pivot.categorias.map((cat) => (
                    <th key={cat} className="px-3 py-2 text-right font-medium">
                      {cat}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.pivot.rows.map((row) => (
                  <tr key={row.ubicacion} className="border-b border-border/60">
                    <td className="px-3 py-2 font-medium">{row.ubicacion}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatEur(row.total)}
                    </td>
                    {data.pivot.categorias.map((cat) => {
                      const value = row.byCategoria[cat] ?? 0;
                      if (value <= 0) {
                        return (
                          <td key={cat} className="px-3 py-2 text-right tabular-nums text-muted">
                            —
                          </td>
                        );
                      }
                      return (
                        <td key={cat} className="p-0 text-right tabular-nums">
                          <PivotDrilldownCell
                            value={value}
                            empty="—"
                            onClick={() => openCell(row.ubicacion, cat)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-background/80 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatEur(data.pivot.grandTotal)}
                  </td>
                  {data.pivot.categorias.map((cat) => (
                    <td key={cat} className="px-3 py-2 text-right tabular-nums">
                      {formatEur(data.pivot.colTotals[cat] ?? 0)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Viajes por año</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/80">
                <th className="px-3 py-2 text-left font-medium">Año</th>
                <th className="px-3 py-2 text-left font-medium">Ubicación</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.tripsByYear.map((block) => {
                const yearTotal = block.trips.reduce((s, t) => s + t.total, 0);
                return (
                  <Fragment key={block.year}>
                    {block.trips.map((trip, i) => (
                      <tr key={`${block.year}-${trip.nombre}`} className="border-b border-border/60">
                        <td className={`px-3 py-2 align-top ${i === 0 ? "font-semibold" : ""}`}>
                          {i === 0 ? block.year : ""}
                        </td>
                        <td className="px-3 py-2">{trip.nombre}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatEur(trip.total)}</td>
                      </tr>
                    ))}
                    <tr key={`${block.year}-total`} className="border-b border-border bg-background/60">
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2 font-semibold">Total {block.year}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatEur(yearTotal)}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
              {data.tripsByYear.length > 1 && (
                <tr className="bg-background/80 font-semibold">
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2">Total período</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatEur(periodTotal)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
