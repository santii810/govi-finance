"use client";

import { useState } from "react";
import { PivotDetailModal } from "@/components/pivot-detail-modal";
import { PivotDrilldownCell } from "@/components/pivot-drilldown-cell";
import { formatEur } from "@/lib/persona";
import { pivotDetailKey, type PivotDrilldownMove } from "@/lib/pivot-drilldown";
import type { IngresosPivotRow } from "@/lib/types";

interface PivotHeatmapProps {
  origenKeys: string[];
  rows: IngresosPivotRow[];
  title?: string;
  signed?: boolean;
  details?: Record<string, PivotDrilldownMove[]>;
  colLabel?: string;
  labelHeader?: string;
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

export function PivotHeatmap({
  origenKeys,
  rows,
  title = "Año × origen",
  signed = false,
  details,
  colLabel = "Origen",
  labelHeader = "Concepto",
}: PivotHeatmapProps) {
  const [selection, setSelection] = useState<{ rowLabel: string; colLabel: string; key: string } | null>(
    null,
  );
  const max = Math.max(
    ...rows.flatMap((r) => origenKeys.map((k) => (signed ? Math.abs(r.values[k] ?? 0) : (r.values[k] ?? 0)))),
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
                        className={`p-0 text-right tabular-nums ${show ? "" : "px-3 py-2 text-muted"}`}
                        style={{ background: cellBg(v, max, signed) }}
                      >
                        {show && details ? (
                          <PivotDrilldownCell
                            value={v}
                            signed={signed}
                            empty="·"
                            onClick={() =>
                              setSelection({
                                rowLabel: row.year,
                                colLabel: `${colLabel}: ${k}`,
                                key: pivotDetailKey(row.year, k),
                              })
                            }
                          />
                        ) : show ? (
                          <span className="block px-3 py-2">{formatEur(v)}</span>
                        ) : (
                          "·"
                        )}
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
    </>
  );
}
