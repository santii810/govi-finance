"use client";

import { Fragment, useEffect, useState } from "react";
import { DateInput } from "@/components/date-input";
import type { GastosRowInput, ManualInsertOptions, PersonaValue } from "@/lib/manual-insert/types";
import { isGastosRowValid } from "@/lib/manual-insert/validation";
import { formatEur } from "@/lib/persona";
import type { PivotDrilldownMove } from "@/lib/pivot-drilldown";

export interface PivotDetailSelection {
  rowLabel: string;
  colLabel: string;
}

const PERSONA_OPTIONS: PersonaValue[] = ["Santi", "Sandra", "Común"];

interface PivotDetailModalProps {
  selection: PivotDetailSelection;
  moves: PivotDrilldownMove[];
  loading?: boolean;
  error?: string;
  labelHeader?: string;
  onClose: () => void;
  /** Permite editar filas con `recordId` + `gastosEdit` vía API del Log. */
  editable?: boolean;
  onAfterSave?: () => void;
}

export function PivotDetailModal({
  selection,
  moves,
  loading = false,
  error = "",
  labelHeader = "Concepto",
  onClose,
  editable = false,
  onAfterSave,
}: PivotDetailModalProps) {
  const total = moves.reduce((sum, move) => sum + move.amount, 0);
  const showTipo = moves.some((move) => move.tipo);
  const showOrigen = moves.some((move) => move.origen);
  const showNotas = moves.some((move) => move.notas);
  const canEditAny =
    editable && moves.some((move) => Boolean(move.recordId && move.gastosEdit));
  const wide = showTipo || showOrigen || showNotas || canEditAny;
  const distinctTipos = new Set(moves.map((move) => move.tipo).filter(Boolean));
  const showTotal = !loading && !error && moves.length > 0 && distinctTipos.size <= 1;

  const colCount =
    3 +
    (showTipo ? 1 : 0) +
    (showOrigen ? 1 : 0) +
    (showNotas ? 1 : 0) +
    (canEditAny ? 1 : 0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [options, setOptions] = useState<ManualInsertOptions | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (editingId) {
          setEditingId(null);
          setEditError("");
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, editingId]);

  useEffect(() => {
    setEditingId(null);
    setEditError("");
  }, [selection.rowLabel, selection.colLabel]);

  useEffect(() => {
    if (!canEditAny) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/manual-insert", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudieron cargar las opciones");
        const json = (await res.json()) as { options?: ManualInsertOptions };
        if (!cancelled && json.options) setOptions(json.options);
      } catch (err) {
        if (!cancelled) {
          setOptionsError(err instanceof Error ? err.message : "Error al cargar opciones");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canEditAny]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg ${
          wide ? "max-w-4xl" : "max-w-lg"
        }`}
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
                  {showTipo ? <th className="px-3 py-2 text-left font-medium">Tipo</th> : null}
                  {showOrigen ? <th className="px-3 py-2 text-left font-medium">Origen</th> : null}
                  <th className="px-3 py-2 text-left font-medium">{labelHeader}</th>
                  {showNotas ? <th className="px-3 py-2 text-left font-medium">Notas</th> : null}
                  <th className="px-3 py-2 text-right font-medium">Importe</th>
                  {canEditAny ? (
                    <th className="px-2 py-2 text-right font-medium">
                      <span className="sr-only">Editar</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {moves.map((move, index) => {
                  const rowKey = move.recordId ?? `${move.date}-${move.label}-${index}`;
                  const isEditing = Boolean(move.recordId && editingId === move.recordId);
                  return (
                    <Fragment key={rowKey}>
                      <tr className="border-b border-border/60">
                        <td className="px-3 py-2 whitespace-nowrap">{move.date}</td>
                        {showTipo ? (
                          <td className="px-3 py-2 whitespace-nowrap">{move.tipo ?? "—"}</td>
                        ) : null}
                        {showOrigen ? (
                          <td className="px-3 py-2 whitespace-nowrap">{move.origen ?? "—"}</td>
                        ) : null}
                        <td className="px-3 py-2">
                          <div>{move.label}</div>
                          {move.meta ? <div className="text-xs text-muted">{move.meta}</div> : null}
                        </td>
                        {showNotas ? (
                          <td className="px-3 py-2 text-muted">{move.notas ?? "—"}</td>
                        ) : null}
                        <td className="px-3 py-2 text-right tabular-nums">{formatEur(move.amount)}</td>
                        {canEditAny ? (
                          <td className="px-2 py-2 text-right">
                            {move.recordId && move.gastosEdit ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditError("");
                                  setEditingId(isEditing ? null : move.recordId!);
                                }}
                                className={`rounded px-1.5 py-0.5 text-xs transition ${
                                  isEditing
                                    ? "bg-accent/10 text-accent"
                                    : "text-muted hover:bg-background hover:text-foreground"
                                }`}
                                aria-label="Editar registro"
                                aria-expanded={isEditing}
                                title="Editar"
                              >
                                ✎
                              </button>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                      {isEditing && move.gastosEdit && move.recordId ? (
                        <tr className="border-b border-border/60 bg-background/50">
                          <td colSpan={colCount} className="px-3 py-3">
                            <GastosPivotEditForm
                              recordId={move.recordId}
                              initial={move.gastosEdit}
                              options={options}
                              optionsError={optionsError}
                              saving={saving}
                              error={editError}
                              onCancel={() => {
                                setEditingId(null);
                                setEditError("");
                              }}
                              onSavingChange={setSaving}
                              onError={setEditError}
                              onSaved={() => {
                                setEditingId(null);
                                setEditError("");
                                onAfterSave?.();
                              }}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {showTotal ? (
          <div className="border-t border-border px-4 py-3 text-right text-sm font-semibold tabular-nums">
            {`Total · ${formatEur(total)} · ${moves.length} mov.`}
          </div>
        ) : moves.length > 0 && !loading && !error ? (
          <div className="border-t border-border px-4 py-3 text-right text-sm text-muted">
            {`${moves.length} mov.`}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GastosPivotEditForm({
  recordId,
  initial,
  options,
  optionsError,
  saving,
  error,
  onCancel,
  onSavingChange,
  onError,
  onSaved,
}: {
  recordId: string;
  initial: GastosRowInput;
  options: ManualInsertOptions | null;
  optionsError: string;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSavingChange: (saving: boolean) => void;
  onError: (message: string) => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<GastosRowInput>(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial, recordId]);

  async function handleSave() {
    if (!isGastosRowValid(draft)) return;
    onSavingChange(true);
    onError("");
    try {
      const res = await fetch(`/api/log/gastos/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: draft }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Error al guardar");
      }
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      onSavingChange(false);
    }
  }

  if (optionsError) {
    return <p className="text-xs text-expense">{optionsError}</p>;
  }

  if (!options) {
    return <p className="text-xs text-muted">Cargando formulario…</p>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted">Fecha</span>
          <DateInput
            value={draft.fecha}
            onChange={(fecha) => setDraft({ ...draft, fecha })}
            className="rounded border border-border bg-card px-1.5 py-1 text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted">Cantidad</span>
          <input
            type="text"
            inputMode="decimal"
            value={draft.cantidad}
            onChange={(e) => setDraft({ ...draft, cantidad: e.target.value })}
            className="rounded border border-border bg-card px-1.5 py-1 text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5 sm:col-span-2">
          <span className="text-[10px] text-muted">Concepto</span>
          <input
            type="text"
            value={draft.destino}
            onChange={(e) => setDraft({ ...draft, destino: e.target.value })}
            className="rounded border border-border bg-card px-1.5 py-1 text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted">Fuente</span>
          <select
            value={draft.fuente}
            onChange={(e) => setDraft({ ...draft, fuente: e.target.value })}
            className="rounded border border-border bg-card px-1.5 py-1 text-xs"
          >
            <option value="">—</option>
            {options.fuenteGastos.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted">Categoría</span>
          <select
            value={draft.categoria}
            onChange={(e) => setDraft({ ...draft, categoria: e.target.value })}
            className="rounded border border-border bg-card px-1.5 py-1 text-xs"
          >
            <option value="">—</option>
            {options.categoriaGastos.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted">Persona</span>
          <select
            value={draft.persona}
            onChange={(e) =>
              setDraft({ ...draft, persona: e.target.value as PersonaValue })
            }
            className="rounded border border-border bg-card px-1.5 py-1 text-xs"
          >
            <option value="">—</option>
            {PERSONA_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="text-xs text-expense">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded border border-border px-2 py-0.5 text-xs hover:bg-card disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!isGastosRowValid(draft) || saving}
          onClick={() => void handleSave()}
          className="rounded bg-accent px-3 py-0.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
