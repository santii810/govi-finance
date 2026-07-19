"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { DateInput } from "@/components/date-input";
import type { LogEntry, LogTableType } from "@/lib/insert-log";
import type {
  GastosRowInput,
  IngresosRowInput,
  InversionesRowInput,
  ManualInsertOptions,
  PatrimonioRowInput,
  PersonaValue,
} from "@/lib/manual-insert/types";
import {
  isGastosRowValid,
  isIngresosRowValid,
  isInversionesRowValid,
  isPatrimonioRowValid,
} from "@/lib/manual-insert/validation";
import { formatEur } from "@/lib/persona";

const TIPO_OPTIONS: { value: "" | LogTableType; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "Gastos", label: "Gastos" },
  { value: "Ingresos", label: "Ingresos" },
  { value: "Inversiones", label: "Inversión" },
  { value: "Patrimonio", label: "Patrimonio" },
];

const PERSONA_OPTIONS: PersonaValue[] = ["Santi", "Sandra", "Común"];

const PAGE_SIZE = 50;

function DeleteConfirmModal({
  deleting,
  onCancel,
  onConfirm,
}: {
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, deleting]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!deleting) onCancel();
      }}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-labelledby="delete-confirm-title"
        aria-describedby="delete-confirm-desc"
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-4 py-3">
          <h3 id="delete-confirm-title" className="font-semibold">
            Borrar registro
          </h3>
        </div>
        <div className="px-4 py-4">
          <p id="delete-confirm-desc" className="text-sm text-foreground">
            ¿Seguro que quieres borrar este registro? Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="rounded-lg bg-expense px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {deleting ? "Borrando…" : "Borrar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

type SortColumn =
  | "createdAt"
  | "tableType"
  | "fecha"
  | "concepto"
  | "importe"
  | "categoria"
  | "persona";

type SortDir = "asc" | "desc";

const SORT_HEADERS: { key: SortColumn; label: string; align?: "right" }[] = [
  { key: "createdAt", label: "Insertado" },
  { key: "tableType", label: "Tipo" },
  { key: "fecha", label: "Fecha" },
  { key: "concepto", label: "Concepto" },
  { key: "importe", label: "Importe", align: "right" },
  { key: "categoria", label: "Categoría" },
  { key: "persona", label: "Persona" },
];

function compareLogEntries(a: LogEntry, b: LogEntry, column: SortColumn): number {
  switch (column) {
    case "createdAt":
      return a.createdAt.localeCompare(b.createdAt);
    case "tableType":
      return a.tableType.localeCompare(b.tableType, "es");
    case "fecha":
      return a.fecha.localeCompare(b.fecha);
    case "concepto":
      return a.concepto.localeCompare(b.concepto, "es", { sensitivity: "base" });
    case "importe":
      return a.importe - b.importe;
    case "categoria":
      return (a.categoria ?? "").localeCompare(b.categoria ?? "", "es", { sensitivity: "base" });
    case "persona":
      return a.persona.localeCompare(b.persona, "es");
  }
}

function SortHeader({
  column,
  label,
  align,
  active,
  dir,
  onSort,
}: {
  column: SortColumn;
  label: string;
  align?: "right";
  active: boolean;
  dir: SortDir;
  onSort: (column: SortColumn) => void;
}) {
  return (
    <th className={`px-2 py-1.5 ${align === "right" ? "text-right" : ""}`} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground ${
          align === "right" ? "ml-auto" : ""
        } ${active ? "text-foreground" : ""}`}
      >
        {label}
        <span className="inline-block w-2 text-[9px]" aria-hidden>
          {active ? (dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatDateFull(iso: string): string {
  if (!iso) return "";
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function tipoSlug(tableType: LogTableType): string {
  return tableType.toLowerCase();
}

function tipoLabel(tableType: LogTableType): string {
  if (tableType === "Inversiones") return "Inversión";
  return tableType;
}

function categoryOptionsForTipo(
  tipo: "" | LogTableType,
  options: ManualInsertOptions | null,
): string[] {
  if (!options) return [];
  if (tipo === "Gastos") return options.categoriaGastos;
  if (tipo === "Ingresos") return options.categoriaIngresos;
  if (tipo === "Inversiones") return options.tipoInversiones;
  if (tipo === "Patrimonio") return options.tipoPatrimonio;
  const seen = new Set<string>();
  const union: string[] = [];
  for (const value of [
    ...options.categoriaGastos,
    ...options.categoriaIngresos,
    ...options.tipoInversiones,
    ...options.tipoPatrimonio,
  ]) {
    if (seen.has(value)) continue;
    seen.add(value);
    union.push(value);
  }
  return union.sort((a, b) => a.localeCompare(b, "es"));
}

type EditDraft =
  | { tableType: "Gastos"; row: GastosRowInput }
  | { tableType: "Ingresos"; row: IngresosRowInput }
  | { tableType: "Inversiones"; row: InversionesRowInput }
  | { tableType: "Patrimonio"; fecha: string; row: PatrimonioRowInput };

function buildDraft(entry: LogEntry): EditDraft {
  if (entry.tableType === "Gastos") {
    return {
      tableType: "Gastos",
      row: {
        fecha: entry.fecha,
        cantidad: String(entry.importe),
        destino: entry.destino ?? entry.concepto,
        fuente: entry.fuente ?? "",
        persona: (entry.persona as PersonaValue) || "",
        categoria: entry.categoria ?? "",
      },
    };
  }
  if (entry.tableType === "Ingresos") {
    return {
      tableType: "Ingresos",
      row: {
        fecha: entry.fecha,
        ingreso: String(entry.importe),
        origen: entry.origen ?? entry.concepto,
        persona: (entry.persona as PersonaValue) || "",
        categoria: entry.categoria ?? "",
      },
    };
  }
  if (entry.tableType === "Inversiones") {
    return {
      tableType: "Inversiones",
      row: {
        fecha: entry.fecha,
        importe: String(entry.importe),
        nombre: entry.nombre ?? entry.concepto,
        tipo: entry.tipo ?? entry.categoria ?? "",
        entidad: entry.entidad ?? "",
        persona: (entry.persona as PersonaValue) || "",
      },
    };
  }
  return {
    tableType: "Patrimonio",
    fecha: entry.fecha,
    row: {
      nombre: entry.nombre ?? entry.concepto,
      valor: String(entry.importe),
      tipo: entry.tipo ?? entry.categoria ?? "",
      entidad: entry.entidad ?? "",
      persona: (entry.persona as PersonaValue) || "",
    },
  };
}

function isDraftValid(draft: EditDraft): boolean {
  if (draft.tableType === "Gastos") return isGastosRowValid(draft.row);
  if (draft.tableType === "Ingresos") return isIngresosRowValid(draft.row);
  if (draft.tableType === "Inversiones") return isInversionesRowValid(draft.row);
  return isPatrimonioRowValid(draft.row, draft.row.persona || "Santi");
}

interface LogRowProps {
  entry: LogEntry;
  options: ManualInsertOptions;
  editing: boolean;
  saving: boolean;
  onToggleEdit: (id: string) => void;
  onSaved: (entry: LogEntry) => void;
  onDeleted: (entry: LogEntry) => void;
  onError: (message: string) => void;
}

function LogRow({
  entry,
  options,
  editing,
  saving,
  onToggleEdit,
  onSaved,
  onDeleted,
  onError,
}: LogRowProps) {
  const [draft, setDraft] = useState<EditDraft>(() => buildDraft(entry));
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (editing) {
      setDraft(buildDraft(entry));
      setConfirmDelete(false);
    }
  }, [editing, entry]);

  async function handleSave() {
    if (!isDraftValid(draft)) return;

    const body =
      draft.tableType === "Patrimonio"
        ? { row: draft.row, fecha: draft.fecha }
        : { row: draft.row };

    try {
      const res = await fetch(`/api/log/${tipoSlug(entry.tableType)}/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string; entry?: LogEntry };
      if (!res.ok) {
        throw new Error(json.error ?? "Error al guardar");
      }
      if (json.entry) onSaved(json.entry);
      onToggleEdit(entry.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/log/${tipoSlug(entry.tableType)}/${entry.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Error al borrar");
      }
      onDeleted(entry);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al borrar");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <tr className="border-t border-border hover:bg-background/40">
        <td className="whitespace-nowrap px-2 py-1.5 text-xs text-muted tabular-nums">
          {formatDateTime(entry.createdAt)}
        </td>
        <td className="whitespace-nowrap px-2 py-1.5 text-xs">
          {tipoLabel(entry.tableType)}
        </td>
        <td
          className="whitespace-nowrap px-2 py-1.5 text-xs tabular-nums"
          title={formatDateFull(entry.fecha)}
        >
          {formatDate(entry.fecha)}
        </td>
        <td className="max-w-[14rem] truncate px-2 py-1.5 text-xs" title={entry.concepto}>
          {entry.concepto}
        </td>
        <td className="whitespace-nowrap px-2 py-1.5 text-right text-xs font-medium tabular-nums">
          {formatEur(entry.importe)}
        </td>
        <td className="max-w-[8rem] truncate px-2 py-1.5 text-xs text-muted" title={entry.categoria ?? undefined}>
          {entry.categoria ?? "—"}
        </td>
        <td className="whitespace-nowrap px-2 py-1.5 text-xs text-muted">
          {entry.persona}
        </td>
        <td className="px-1 py-1.5 text-right">
          <button
            type="button"
            onClick={() => onToggleEdit(entry.id)}
            className={`rounded px-1.5 py-0.5 text-xs transition ${
              editing
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-background hover:text-foreground"
            }`}
            aria-expanded={editing}
          >
            ✎
          </button>
        </td>
      </tr>

      {editing && (
        <tr className="border-t border-border bg-background/50">
          <td colSpan={8} className="px-2 py-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {draft.tableType === "Gastos" && (
              <>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Fecha</span>
                  <DateInput
                    value={draft.row.fecha}
                    onChange={(fecha) =>
                      setDraft({
                        tableType: "Gastos",
                        row: { ...draft.row, fecha },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Cantidad</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft.row.cantidad}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Gastos",
                        row: { ...draft.row, cantidad: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-0.5 sm:col-span-2">
                  <span className="text-[10px] text-muted">Concepto</span>
                  <input
                    type="text"
                    value={draft.row.destino}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Gastos",
                        row: { ...draft.row, destino: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Fuente</span>
                  <select
                    value={draft.row.fuente}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Gastos",
                        row: { ...draft.row, fuente: e.target.value },
                      })
                    }
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
                    value={draft.row.categoria}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Gastos",
                        row: { ...draft.row, categoria: e.target.value },
                      })
                    }
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
              </>
            )}

            {draft.tableType === "Ingresos" && (
              <>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Fecha</span>
                  <DateInput
                    value={draft.row.fecha}
                    onChange={(fecha) =>
                      setDraft({
                        tableType: "Ingresos",
                        row: { ...draft.row, fecha },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Ingreso</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft.row.ingreso}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Ingresos",
                        row: { ...draft.row, ingreso: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Origen</span>
                  <select
                    value={draft.row.origen}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Ingresos",
                        row: { ...draft.row, origen: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  >
                    <option value="">—</option>
                    {options.origenIngresos.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Categoría</span>
                  <select
                    value={draft.row.categoria}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Ingresos",
                        row: { ...draft.row, categoria: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  >
                    <option value="">—</option>
                    {options.categoriaIngresos.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {draft.tableType === "Inversiones" && (
              <>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Fecha</span>
                  <DateInput
                    value={draft.row.fecha}
                    onChange={(fecha) =>
                      setDraft({
                        tableType: "Inversiones",
                        row: { ...draft.row, fecha },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Importe</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft.row.importe}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Inversiones",
                        row: { ...draft.row, importe: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-0.5 sm:col-span-2">
                  <span className="text-[10px] text-muted">Nombre</span>
                  <input
                    type="text"
                    value={draft.row.nombre}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Inversiones",
                        row: { ...draft.row, nombre: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Tipo</span>
                  <select
                    value={draft.row.tipo}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Inversiones",
                        row: { ...draft.row, tipo: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  >
                    <option value="">—</option>
                    {options.tipoInversiones.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Entidad</span>
                  <input
                    type="text"
                    list={`entidad-inversion-${entry.id}`}
                    value={draft.row.entidad}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Inversiones",
                        row: { ...draft.row, entidad: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                  <datalist id={`entidad-inversion-${entry.id}`}>
                    {options.entidadInversiones.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </label>
              </>
            )}

            {draft.tableType === "Patrimonio" && (
              <>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Fecha snapshot</span>
                  <DateInput
                    value={draft.fecha}
                    onChange={(fecha) =>
                      setDraft({
                        tableType: "Patrimonio",
                        fecha,
                        row: draft.row,
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Valor</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft.row.valor}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Patrimonio",
                        fecha: draft.fecha,
                        row: { ...draft.row, valor: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-0.5 sm:col-span-2">
                  <span className="text-[10px] text-muted">Nombre</span>
                  <input
                    type="text"
                    value={draft.row.nombre}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Patrimonio",
                        fecha: draft.fecha,
                        row: { ...draft.row, nombre: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Tipo</span>
                  <select
                    value={draft.row.tipo}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Patrimonio",
                        fecha: draft.fecha,
                        row: { ...draft.row, tipo: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  >
                    <option value="">—</option>
                    {options.tipoPatrimonio.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Entidad</span>
                  <input
                    type="text"
                    list={`entidad-patrimonio-${entry.id}`}
                    value={draft.row.entidad}
                    onChange={(e) =>
                      setDraft({
                        tableType: "Patrimonio",
                        fecha: draft.fecha,
                        row: { ...draft.row, entidad: e.target.value },
                      })
                    }
                    className="rounded border border-border bg-card px-1.5 py-1 text-xs"
                  />
                  <datalist id={`entidad-patrimonio-${entry.id}`}>
                    {options.entidadPatrimonio.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </label>
              </>
            )}

            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted">Persona</span>
              <select
                value={
                  draft.tableType === "Patrimonio"
                    ? draft.row.persona
                    : draft.row.persona
                }
                onChange={(e) => {
                  const persona = e.target.value as PersonaValue;
                  if (draft.tableType === "Patrimonio") {
                    setDraft({
                      tableType: "Patrimonio",
                      fecha: draft.fecha,
                      row: { ...draft.row, persona },
                    });
                  } else {
                    setDraft({
                      tableType: draft.tableType,
                      row: { ...draft.row, persona },
                    } as EditDraft);
                  }
                }}
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

            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={saving || deleting}
                onClick={() => setConfirmDelete(true)}
                className="mr-auto rounded border border-border px-2 py-0.5 text-xs text-expense hover:bg-background disabled:opacity-50"
              >
                Borrar
              </button>
              <button
                type="button"
                disabled={saving || deleting}
                onClick={() => onToggleEdit(entry.id)}
                className="rounded border border-border px-2 py-0.5 text-xs hover:bg-card disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!isDraftValid(draft) || saving || deleting}
                onClick={() => void handleSave()}
                className="rounded bg-accent px-3 py-0.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </td>
        </tr>
      )}
      {confirmDelete && (
        <DeleteConfirmModal
          deleting={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </>
  );
}

export function LogEntriesTable({
  entries,
  options,
  onEntriesChange,
  onError,
  defaultSortColumn = "createdAt",
  defaultSortDir = "desc",
}: {
  entries: LogEntry[];
  options: ManualInsertOptions;
  onEntriesChange: (entries: LogEntry[] | ((prev: LogEntry[]) => LogEntry[])) => void;
  onError: (message: string) => void;
  defaultSortColumn?: SortColumn;
  defaultSortDir?: SortDir;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>(defaultSortColumn);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  const sortedEntries = useMemo(() => {
    const copy = [...entries];
    copy.sort((a, b) => {
      const cmp = compareLogEntries(a, b, sortColumn);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [entries, sortColumn, sortDir]);

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDir(column === "createdAt" || column === "fecha" || column === "importe" ? "desc" : "asc");
  }

  function toggleEdit(id: string) {
    setEditingId((prev) => (prev === id ? null : id));
  }

  function handleSaved(updated: LogEntry) {
    onEntriesChange((prev) =>
      prev.map((row) => (row.id === updated.id && row.tableType === updated.tableType ? updated : row)),
    );
    setSavingId(null);
  }

  function handleDeleted(deleted: LogEntry) {
    onEntriesChange((prev) =>
      prev.filter((row) => !(row.id === deleted.id && row.tableType === deleted.tableType)),
    );
    setEditingId((prev) => (prev === deleted.id ? null : prev));
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[52rem] text-left">
        <thead>
          <tr className="border-b border-border bg-background/60 text-[10px] font-medium tracking-wide text-muted">
            {SORT_HEADERS.map((header) => (
              <SortHeader
                key={header.key}
                column={header.key}
                label={header.label}
                align={header.align}
                active={sortColumn === header.key}
                dir={sortDir}
                onSort={handleSort}
              />
            ))}
            <th className="w-8 px-1 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {sortedEntries.map((entry) => (
            <LogRow
              key={`${entry.tableType}-${entry.id}`}
              entry={entry}
              options={options}
              editing={editingId === entry.id}
              saving={savingId === entry.id}
              onToggleEdit={toggleEdit}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
              onError={onError}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LogPanel({ defaultPersona }: { defaultPersona: PersonaValue }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [options, setOptions] = useState<ManualInsertOptions | null>(null);
  const [tipoFilter, setTipoFilter] = useState<"" | LogTableType>("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [personaFilter, setPersonaFilter] = useState<"" | PersonaValue>(defaultPersona);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const categoryOptions = useMemo(
    () => categoryOptionsForTipo(tipoFilter, options),
    [tipoFilter, options],
  );

  const fetchPage = useCallback(
    async (offset: number) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (tipoFilter) params.set("tipo", tipoFilter);
      if (categoriaFilter) params.set("categoria", categoriaFilter);
      if (personaFilter) params.set("persona", personaFilter);

      const res = await fetch(`/api/log?${params}`, { cache: "no-store" });
      const body = (await res.json()) as {
        error?: string;
        entries?: LogEntry[];
        options?: ManualInsertOptions;
        hasMore?: boolean;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Error al cargar el log");
      }
      return {
        entries: body.entries ?? [],
        options: body.options ?? null,
        hasMore: Boolean(body.hasMore),
      };
    },
    [tipoFilter, categoriaFilter, personaFilter],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void fetchPage(0)
      .then((page) => {
        if (cancelled) return;
        setEntries(page.entries);
        setOptions(page.options);
        setHasMore(page.hasMore);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error de conexión");
        setEntries([]);
        setHasMore(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  useEffect(() => {
    if (categoriaFilter && !categoryOptions.includes(categoriaFilter)) {
      setCategoriaFilter("");
    }
  }, [categoryOptions, categoriaFilter]);

  async function handleLoadMore() {
    setLoadingMore(true);
    setError("");
    try {
      const page = await fetchPage(entries.length);
      setEntries((prev) => {
        const seen = new Set(prev.map((e) => `${e.tableType}-${e.id}`));
        const appended = page.entries.filter((e) => !seen.has(`${e.tableType}-${e.id}`));
        return [...prev, ...appended];
      });
      if (page.options) setOptions(page.options);
      setHasMore(page.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Log</h1>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Tipo</span>
          <select
            value={tipoFilter}
            onChange={(e) => {
              const nextTipo = e.target.value as "" | LogTableType;
              const nextCategories = categoryOptionsForTipo(nextTipo, options);
              setTipoFilter(nextTipo);
              if (categoriaFilter && !nextCategories.includes(categoriaFilter)) {
                setCategoriaFilter("");
              }
            }}
            className="min-w-[9rem] rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            {TIPO_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Categoría / tipo</span>
          <select
            value={categoriaFilter}
            onChange={(e) => {
              setCategoriaFilter(e.target.value);
            }}
            className="min-w-[14rem] rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Persona</span>
          <select
            value={personaFilter}
            onChange={(e) => {
              setPersonaFilter(e.target.value as "" | PersonaValue);
            }}
            className="min-w-[9rem] rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {PERSONA_OPTIONS.map((persona) => (
              <option key={persona} value={persona}>
                {persona}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="text-sm text-muted">Cargando…</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-muted">No hay registros con estos filtros.</p>
      )}

      {!loading && entries.length > 0 && options && (
        <>
          <LogEntriesTable
            entries={entries}
            options={options}
            onEntriesChange={setEntries}
            onError={setError}
          />
          {hasMore && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void handleLoadMore()}
                className="rounded-lg border border-border px-4 py-1.5 text-sm hover:bg-background disabled:opacity-50"
              >
                {loadingMore ? "Cargando…" : "Cargar más"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
