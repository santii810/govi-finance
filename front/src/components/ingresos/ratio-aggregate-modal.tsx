"use client";

import { useEffect } from "react";
import { formatEur } from "@/lib/persona";

export interface RatioAggregateSelection {
  panelTitle: string;
  periodLabel: string;
}

export interface RatioAggregateLine {
  label: string;
  amount: number;
  emphasis?: boolean;
}

interface RatioAggregateModalProps {
  selection: RatioAggregateSelection;
  lines: RatioAggregateLine[];
  pct: number | null;
  onClose: () => void;
}

function fmtPct(value: number | null): string {
  if (value === null) return "—";
  return (
    new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value) + " %"
  );
}

export function RatioAggregateModal({
  selection,
  lines,
  pct,
  onClose,
}: RatioAggregateModalProps) {
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
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="font-medium">{selection.panelTitle}</p>
            <p className="text-sm text-muted">{selection.periodLabel}</p>
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

        <div className="divide-y divide-border/60">
          {lines.map((line) => (
            <div
              key={line.label}
              className={`flex items-center justify-between px-4 py-3 text-sm ${
                line.emphasis ? "font-semibold" : ""
              }`}
            >
              <span className={line.emphasis ? "text-foreground" : "text-muted"}>{line.label}</span>
              <span className="tabular-nums">{formatEur(line.amount)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-4 py-3 text-right text-sm font-semibold tabular-nums">
          Ratio · {fmtPct(pct)}
        </div>
      </div>
    </div>
  );
}
