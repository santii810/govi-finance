"use client";

import { formatEur } from "@/lib/persona";
import type { IngresosHeatmapRow } from "@/lib/types";
import { MONTHS } from "./year-filter";

interface MonthHeatmapProps {
  rows: IngresosHeatmapRow[];
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

function fmtShort(n: number, signed: boolean): string {
  const abs = Math.abs(n);
  const prefix = signed && n < 0 ? "−" : "";
  if (abs >= 1000) return `${prefix}${(abs / 1000).toFixed(1)}k`;
  return signed && n < 0 ? `−${Math.round(abs)}` : String(Math.round(abs));
}

export function MonthHeatmap({ rows, signed = false }: MonthHeatmapProps) {
  const max = Math.max(
    ...rows.flatMap((r) => r.months.map((v) => (signed ? Math.abs(v) : v))),
    0,
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-muted">Calendario mensual (mes × año)</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-2 py-2 text-left font-medium">Año</th>
              {MONTHS.map((m) => (
                <th key={m} className="px-2 py-2 text-right font-medium">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.year} className="border-b border-border/60">
                <td className="px-2 py-2 font-medium">{row.year}</td>
                {row.months.map((v, i) => {
                  const show = signed ? v !== 0 : v > 0;
                  return (
                    <td
                      key={i}
                      className="px-2 py-2 text-right tabular-nums"
                      style={{ background: cellBg(v, max, signed) }}
                      title={show ? formatEur(v) : undefined}
                    >
                      {show ? fmtShort(v, signed) : "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
