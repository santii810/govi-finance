"use client";

import { useEffect, useState } from "react";
import {
  currentMonthValue,
  type GastosPlantillaSummary,
} from "@/lib/manual-insert/gastos-templates";

interface GastosTemplateModalProps {
  plantillas: GastosPlantillaSummary[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (plantillaId: string, month: string) => void;
}

function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNum - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function GastosTemplateModal({
  plantillas,
  loading = false,
  onClose,
  onConfirm,
}: GastosTemplateModalProps) {
  const [month, setMonth] = useState(currentMonthValue);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (plantillas.length > 0 && !selectedId) {
      setSelectedId(plantillas[0].id);
    }
  }, [plantillas, selectedId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selected = plantillas.find((p) => p.id === selectedId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold">Plantillas de gastos</h3>
          <p className="mt-0.5 text-sm text-muted">
            Precarga gastos fijos del mes. Podrás editarlos antes de guardar.
          </p>
        </div>

        <div className="flex flex-col gap-4 px-4 py-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Mes</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <span className="text-[11px] text-muted">{formatMonthLabel(month)}</span>
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted">Plantilla</span>
            {loading && <p className="text-sm text-muted">Cargando plantillas…</p>}
            {!loading && plantillas.length === 0 && (
              <p className="text-sm text-muted">
                No hay plantillas activas. Edítalas en NocoDB → tabla GastosPlantillas.
              </p>
            )}
            {!loading &&
              plantillas.map((plantilla) => (
                <PlantillaOption
                  key={plantilla.id}
                  plantilla={plantilla}
                  month={month}
                  selected={selectedId === plantilla.id}
                  onSelect={() => setSelectedId(plantilla.id)}
                />
              ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading || !selectedId || !month || plantillas.length === 0}
            onClick={() => onConfirm(selectedId, month)}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Cargar{selected ? ` (${selected.itemCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlantillaOption({
  plantilla,
  month,
  selected,
  onSelect,
}: {
  plantilla: GastosPlantillaSummary;
  month: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
        selected
          ? "border-accent bg-accent/10"
          : "border-border hover:border-accent/50 hover:bg-background/60"
      }`}
    >
      <span className="font-medium">{plantilla.name}</span>
      {plantilla.description && (
        <span className="mt-0.5 block text-xs text-muted">{plantilla.description}</span>
      )}
      <span className="mt-1 block text-[11px] text-muted">
        {plantilla.itemCount} filas · {formatMonthLabel(month)}
      </span>
    </button>
  );
}
