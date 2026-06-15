import { Fragment } from "react";
import { TotalApuntadoCard } from "@/components/gastos/total-apuntado-card";
import { formatEur } from "@/lib/persona";
import type { GastosViajesData } from "@/lib/types";

interface ViajesViewProps {
  data: GastosViajesData;
}

export function ViajesView({ data }: ViajesViewProps) {
  const periodTotal = data.tripsByYear.reduce(
    (sum, block) => sum + block.trips.reduce((s, t) => s + t.total, 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TotalApuntadoCard total={data.total} ytdComparison={data.ytdComparison} />
        <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
          <p className="text-sm font-medium text-muted">Viajes</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{data.tripCount}</p>
          <p className="mt-2 text-xs text-muted">en el período</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Viajes por año</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/80">
                <th className="px-3 py-2 text-left font-medium">Año</th>
                <th className="px-3 py-2 text-left font-medium">Viaje</th>
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
