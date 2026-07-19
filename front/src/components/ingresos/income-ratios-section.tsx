"use client";

import { Fragment, useState } from "react";
import {
  RatioAggregateModal,
  type RatioAggregateLine,
  type RatioAggregateSelection,
} from "@/components/ingresos/ratio-aggregate-modal";
import { formatEur } from "@/lib/persona";
import type { IncomeRatioPoint, IncomeRatioSeries, IngresosRatios } from "@/lib/types";

type RatioViewMode = "monthly" | "yearly";
type RatioTone = "expense" | "investment" | "savings";

const VIEW_MODES: { id: RatioViewMode; label: string }[] = [
  { id: "monthly", label: "Últimos 12 meses" },
  { id: "yearly", label: "Por año" },
];

interface RatioPanelConfig {
  title: string;
  series: IncomeRatioSeries;
  tone: RatioTone;
}

interface CellSelection {
  selection: RatioAggregateSelection;
  lines: RatioAggregateLine[];
  pct: number | null;
}

function aggregateLines(tone: RatioTone, point: IncomeRatioPoint): RatioAggregateLine[] {
  const lines: RatioAggregateLine[] = [{ label: "Ingresos", amount: point.denominator }];

  if (tone === "expense") {
    lines.push({ label: "Gastos", amount: point.numerator, emphasis: true });
  } else if (tone === "investment") {
    lines.push({ label: "Inversión", amount: point.numerator, emphasis: true });
  } else {
    lines.push(
      { label: "Gastos", amount: point.gastos ?? 0 },
      { label: "Inversión", amount: point.inversion ?? 0 },
      { label: "Ahorro", amount: point.numerator, emphasis: true },
    );
  }

  return lines;
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

function cellBg(pct: number | null, max: number, tone: RatioTone): string {
  if (pct === null || max <= 0) return "";
  if (tone === "savings") {
    const magnitude = Math.abs(pct);
    if (magnitude <= 0) return "";
    const intensity = 0.08 + (magnitude / max) * 0.45;
    if (pct < 0) return `rgba(220, 38, 38, ${intensity})`;
    return `rgba(22, 163, 74, ${intensity})`;
  }
  if (pct <= 0) return "";
  const intensity = 0.08 + (pct / max) * 0.45;
  if (tone === "expense") return `rgba(220, 38, 38, ${intensity})`;
  return `rgba(37, 99, 235, ${intensity})`;
}

function tooltipFor(point: IncomeRatioPoint, tone: RatioTone): string {
  const pct = point.pct !== null ? fmtPct(point.pct) : "sin ingresos";
  if (tone === "savings") {
    return `Ahorro: ${formatEur(point.numerator)} · Ingresos: ${formatEur(point.denominator)} · Gastos: ${formatEur(point.gastos ?? 0)} · Inversión: ${formatEur(point.inversion ?? 0)} · ${pct}`;
  }
  const numLabel = tone === "expense" ? "Gastos" : "Inversión";
  return `${numLabel}: ${formatEur(point.numerator)} · Ingresos: ${formatEur(point.denominator)} · ${pct}`;
}

function rowMax(points: IncomeRatioPoint[], total: IncomeRatioPoint, tone: RatioTone): number {
  if (tone === "savings") {
    return Math.max(...points.map((p) => Math.abs(p.pct ?? 0)), Math.abs(total.pct ?? 0), 0);
  }
  return Math.max(...points.map((p) => p.pct ?? 0), total.pct ?? 0, 0);
}

function RatioDataRow({
  points,
  total,
  tone,
  panelTitle,
  onCellClick,
  isFirst,
}: {
  points: IncomeRatioPoint[];
  total: IncomeRatioPoint;
  tone: RatioTone;
  panelTitle: string;
  onCellClick: (selection: CellSelection) => void;
  isFirst: boolean;
}) {
  const max = rowMax(points, total, tone);

  return (
    <tr className={isFirst ? "" : "border-t border-border/40"}>
      <td className="px-2 py-2 font-medium text-muted">%</td>
      {points.map((point) => (
        <td
          key={point.key}
          className="p-0 text-right tabular-nums"
          style={{ background: cellBg(point.pct, max, tone) }}
        >
          <button
            type="button"
            onClick={() =>
              onCellClick({
                selection: { panelTitle, periodLabel: point.label },
                lines: aggregateLines(tone, point),
                pct: point.pct,
              })
            }
            className="block w-full px-2 py-2 hover:bg-background/80 hover:text-foreground"
            title={`${tooltipFor(point, tone)} · Ver detalle`}
          >
            {fmtPct(point.pct)}
          </button>
        </td>
      ))}
      <td
        className="p-0 text-right font-semibold tabular-nums"
        style={{ background: cellBg(total.pct, max, tone) }}
      >
        <button
          type="button"
          onClick={() =>
            onCellClick({
              selection: { panelTitle, periodLabel: total.label },
              lines: aggregateLines(tone, total),
              pct: total.pct,
            })
          }
          className="block w-full px-2 py-2 hover:bg-background/80 hover:text-foreground"
          title={`${tooltipFor(total, tone)} · Ver detalle`}
        >
          {fmtPct(total.pct)}
        </button>
      </td>
    </tr>
  );
}

interface IncomeRatiosSectionProps {
  ratios: IngresosRatios;
}

export function IncomeRatiosSection({ ratios }: IncomeRatiosSectionProps) {
  const [viewMode, setViewMode] = useState<RatioViewMode>("monthly");
  const [modal, setModal] = useState<CellSelection | null>(null);

  const panels: RatioPanelConfig[] = [
    { title: "Gastos sobre ingresos", series: ratios.gastosSobreIngresos, tone: "expense" },
    { title: "Inversión sobre ingresos", series: ratios.inversionSobreIngresos, tone: "investment" },
    { title: "Ahorro sobre ingresos", series: ratios.ahorroSobreIngresos, tone: "savings" },
  ];

  const isMonthly = viewMode === "monthly";
  const referenceSeries = panels[0].series;
  const points = isMonthly ? referenceSeries.monthly : referenceSeries.yearly;
  const totalHeader = isMonthly ? "Total 12m" : "Histórico";
  const colSpan = points.length + 2;

  if (points.length === 0) return null;

  return (
    <div className="space-y-4">
      {modal && (
        <RatioAggregateModal
          selection={modal.selection}
          lines={modal.lines}
          pct={modal.pct}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Ratios sobre ingresos</span>
        <div
          className="flex rounded-lg border border-border"
          role="group"
          aria-label="Modo de visualización"
        >
          {VIEW_MODES.map(({ id, label }) => {
            const active = viewMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-sm transition first:rounded-l-lg last:rounded-r-lg ${
                  active ? "bg-accent text-white" : "bg-background text-muted hover:bg-card"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-8" />
              {points.map((point) => (
                <col key={point.key} />
              ))}
              <col className="w-[4.75rem]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-2 py-2 text-left font-medium" />
                {points.map((point) => (
                  <th key={point.key} className="px-2 py-2 text-center font-medium whitespace-nowrap">
                    {point.label}
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">{totalHeader}</th>
              </tr>
            </thead>
            <tbody>
              {panels.map((panel, index) => {
                const seriesPoints = isMonthly ? panel.series.monthly : panel.series.yearly;
                const total = isMonthly ? panel.series.monthlyTotal : panel.series.yearlyTotal;
                if (seriesPoints.length === 0) return null;

                return (
                  <Fragment key={panel.title}>
                    <tr>
                      <td
                        colSpan={colSpan}
                        className={`px-2 pb-1 text-sm font-medium text-muted ${index === 0 ? "pt-0" : "pt-5"}`}
                      >
                        {panel.title}
                      </td>
                    </tr>
                    <RatioDataRow
                      points={seriesPoints}
                      total={total}
                      tone={panel.tone}
                      panelTitle={panel.title}
                      onCellClick={setModal}
                      isFirst={index === 0}
                    />
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
