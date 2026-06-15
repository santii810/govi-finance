"use client";

import { formatEur } from "@/lib/persona";
import type { IngresosPivotRow } from "@/lib/types";

interface PivotHeatmapProps {
  origenKeys: string[];
  rows: IngresosPivotRow[];
  title?: string;
  signed?: boolean;
}

function cellBg(value: number, max: number, signed: boolean): string {
  const magnitude = signed ? Math.abs(value) : value;
  if (magnitude <= 0 || max <= 0) return "";
  const intensity = 0.08 + (magnitude / max) * 0.45;
  const green = "rgba(22, 163, 74, ";
  const blue = "rgba(37, 99, 235, ";
  if (signed && value < 0) return `${blue}${intensity})`;
  return `${green}${intensity})`;
}

export function PivotHeatmap({ origenKeys, rows, title = "Año × origen", signed = false }: PivotHeatmapProps) {
  const max = Math.max(
    ...rows.flatMap((r) => origenKeys.map((k) => (signed ? Math.abs(r.values[k] ?? 0) : (r.values[k] ?? 0)))),
    0,
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-muted">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-3 py-2 font-medium">Año</th>
              {origenKeys.map((k) => (
                <th key={k} className="px-3 py-2 text-right font-medium">
                  {k}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.year} className="border-b border-border/60">
                <td className="px-3 py-2 font-medium">{row.year}</td>
                {origenKeys.map((k) => {
                  const v = row.values[k] ?? 0;
                  const show = signed ? v !== 0 : v > 0;
                  return (
                    <td
                      key={k}
                      className="px-3 py-2 text-right tabular-nums"
                      style={{ background: cellBg(v, max, signed) }}
                    >
                      {show ? formatEur(v) : "·"}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right font-medium tabular-nums">{formatEur(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
