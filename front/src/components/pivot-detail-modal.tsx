"use client";

import { useEffect } from "react";
import { formatEur } from "@/lib/persona";
import type { PivotDrilldownMove } from "@/lib/pivot-drilldown";

export interface PivotDetailSelection {
  rowLabel: string;
  colLabel: string;
}

interface PivotDetailModalProps {
  selection: PivotDetailSelection;
  moves: PivotDrilldownMove[];
  loading?: boolean;
  error?: string;
  labelHeader?: string;
  onClose: () => void;
}

export function PivotDetailModal({
  selection,
  moves,
  loading = false,
  error = "",
  labelHeader = "Concepto",
  onClose,
}: PivotDetailModalProps) {
  const total = moves.reduce((sum, move) => sum + move.amount, 0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="font-medium">{selection.rowLabel}</p>
            <p className="text-sm text-muted">{selection.colLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-background"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Cargando movimientos…</p>
          ) : error ? (
            <p className="px-4 py-8 text-center text-sm text-expense">{error}</p>
          ) : moves.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Sin movimientos.</p>
          ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border bg-background/80">
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-left font-medium">{labelHeader}</th>
                <th className="px-3 py-2 text-right font-medium">Importe</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((move, index) => (
                <tr key={`${move.date}-${move.label}-${index}`} className="border-b border-border/60">
                  <td className="px-3 py-2 whitespace-nowrap">{move.date}</td>
                  <td className="px-3 py-2">
                    <div>{move.label}</div>
                    {move.meta ? <div className="text-xs text-muted">{move.meta}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatEur(move.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
        <div className="border-t border-border px-4 py-3 text-right text-sm font-semibold tabular-nums">
          {loading ? "…" : `Total · ${formatEur(total)} · ${moves.length} mov.`}
        </div>
      </div>
    </div>
  );
}
