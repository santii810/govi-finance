"use client";

import { useState } from "react";
import { PivotDetailModal } from "@/components/pivot-detail-modal";
import { formatEur } from "@/lib/persona";
import { pivotDetailKey, type PivotDrilldownMove } from "@/lib/pivot-drilldown";
import type { IngresosHeatmapRow } from "@/lib/types";
import { MONTHS } from "./year-filter";

interface MonthHeatmapProps {
  rows: IngresosHeatmapRow[];
  signed?: boolean;
  details?: Record<string, PivotDrilldownMove[]>;
  labelHeader?: string;
}

function cellBg(value: number, max: number, signed: boolean): string {
  const magnitude = signed ? Math.abs(value) : value;
  if (magnitude <= 0 || max <= 0) return "";
  const intensity = (magnitude / max) * 0.52;
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

export function MonthHeatmap({
  rows,
  signed = false,
  details,
  labelHeader = "Concepto",
}: MonthHeatmapProps) {
  const [selection, setSelection] = useState<{ rowLabel: string; colLabel: string; key: string } | null>(
    null,
  );
  const max = Math.max(
    ...rows.flatMap((r) => r.months.map((v) => (signed ? Math.abs(v) : v))),
    0,
  );
  const selectedMoves = selection && details ? (details[selection.key] ?? []) : [];

  return (
    <>
      {selection && details && (
        <PivotDetailModal
          selection={{ rowLabel: selection.rowLabel, colLabel: selection.colLabel }}
          moves={selectedMoves}
          labelHeader={labelHeader}
          onClose={() => setSelection(null)}
        />
      )}
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
                    const month = MONTHS[i];
                    const show = signed ? v !== 0 : v > 0;
                    return (
                      <td
                        key={i}
                        className={`text-right tabular-nums ${show && details ? "p-0" : "px-2 py-2"}`}
                        style={{ background: cellBg(v, max, signed) }}
                        title={show && !details ? formatEur(v) : undefined}
                      >
                        {show && details ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelection({
                                rowLabel: row.year,
                                colLabel: month,
                                key: pivotDetailKey(row.year, month),
                              })
                            }
                            className="block w-full px-2 py-2 hover:bg-background/80 hover:text-foreground"
                            title="Ver movimientos"
                          >
                            {fmtShort(v, signed)}
                          </button>
                        ) : show ? (
                          fmtShort(v, signed)
                        ) : (
                          "·"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
