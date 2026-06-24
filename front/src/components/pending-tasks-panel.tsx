"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatEur, parseDate } from "@/lib/persona";
import type { ClassifiedPending, PersonaValue, TablaDestino } from "@/lib/import-rules/types";
import {
  applyPendingFilters,
  EMPTY_PENDING_FILTERS,
  type PendingTasksFilters,
} from "@/lib/pending-tasks-filters";
import { groupPendingByRegla, getReglaGroupSubtitle, sumPendingImportes } from "@/lib/pending-tasks-groups";
import { PendingTasksSidebar } from "@/components/pending-tasks-sidebar";
import { ImportRulesPanel } from "@/components/import-rules-panel";
import { SearchableSelect } from "@/components/searchable-select";
import type { FieldOptions } from "@/app/api/automatic-actions/options/route";

interface PendingResponse {
  total: number;
  items: ClassifiedPending[];
}

interface PendingTasksPanelProps {
  onCountChange?: (count: number) => void;
}

/** Edits staged by the user in the inline form (not yet committed) */
interface EditDraft {
  fecha: string;
  importe: string;
  concepto: string;
  persona: PersonaValue;
  tablaDestino: TablaDestino | "";
  categoria: string;
  tipo: string;
  nombre: string;
  entidad: string;
}

/** A staged action: either accept/ignore (no draft) or modify (with draft) */
interface StagedAction {
  action: "accept" | "ignore" | "modify";
  expiresAt: number;
  secondsLeft: number;
  draft?: EditDraft;
}

const COMMIT_MS = 5000;
const TICK_MS = 250;

const TABLA_DESTINO_OPTIONS: TablaDestino[] = ["Gastos", "Ingresos", "Inversiones"];
const PERSONA_OPTIONS: PersonaValue[] = ["Común", "Sandra", "Santi"];

function formatGitEur(amount: number): string {
  return formatEur(amount).replace(/\s/g, "");
}

function GroupImporteStats({ items }: { items: ClassifiedPending[] }) {
  const { incrementos, decrementos } = useMemo(() => sumPendingImportes(items), [items]);
  if (incrementos === 0 && decrementos === 0) return null;

  return (
    <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums">
      {incrementos > 0 && (
        <span className="text-income">+{formatGitEur(incrementos)}</span>
      )}
      {decrementos > 0 && (
        <span className="text-expense">-{formatGitEur(decrementos)}</span>
      )}
    </span>
  );
}

function formatFecha(fecha: string): string {
  const d = parseDate(fecha);
  if (!d) return fecha;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** ISO date string → "YYYY-MM-DD" for <input type="date"> */
function toInputDate(fecha: string): string {
  return fecha ? fecha.slice(0, 10) : "";
}

// ─── Fila individual ────────────────────────────────────────────────────────

interface PendingTaskRowProps {
  item: ClassifiedPending;
  staged: StagedAction | undefined;
  committing: boolean;
  fieldOptions: FieldOptions | null;
  onAccept: (id: string) => void;
  onIgnore: (id: string) => void;
  onModify: (id: string, draft: EditDraft) => void;
  onCancel: (id: string) => void;
  onOpenEdit: (id: string) => void;
  editingId: string | null;
}

function PendingTaskRow({
  item,
  staged,
  committing,
  fieldOptions,
  onAccept,
  onIgnore,
  onModify,
  onCancel,
  onOpenEdit,
  editingId,
}: PendingTaskRowProps) {
  const isEditing = editingId === item.id;
  const isStaged = staged !== undefined;
  const stagedDraft =
    isStaged && staged.action === "modify" ? staged.draft : undefined;

  const suggestedIgnore =
    isStaged && staged.action === "ignore" ? true : item.ignorar;
  const displayFecha = stagedDraft?.fecha ?? item.fecha;
  const displayImporte = stagedDraft
    ? (item.importe < 0
        ? -Math.abs(parseFloat(stagedDraft.importe) || 0)
        : Math.abs(parseFloat(stagedDraft.importe) || 0))
    : item.importe;
  const displayConcepto = stagedDraft?.concepto ?? item.concepto;
  const displayPersona = stagedDraft?.persona ?? item.persona;
  const displayTablaDestino = stagedDraft?.tablaDestino || item.tablaDestino;
  const displayCategoria = stagedDraft?.categoria ?? item.categoria;
  const displayTipo = stagedDraft?.tipo ?? item.tipo;
  const displayNombre = stagedDraft?.nombre ?? item.nombre;

  const sinCategorizar = !suggestedIgnore && !displayTablaDestino;
  const canAccept = !suggestedIgnore && Boolean(item.tablaDestino);

  // Local draft state — initialised from item when edit opens
  const [draft, setDraft] = useState<EditDraft>({
    fecha: toInputDate(item.fecha),
    importe: String(Math.abs(item.importe)),
    concepto: item.concepto ?? "",
    persona: item.persona,
    tablaDestino: item.tablaDestino ?? "",
    categoria: item.categoria ?? "",
    tipo: item.tipo ?? "",
    nombre: item.nombre ?? "",
    entidad: item.entidad ?? "",
  });

  // Sync draft when item changes externally (e.g. reload)
  useEffect(() => {
    if (!isEditing) {
      setDraft({
        fecha: toInputDate(item.fecha),
        importe: String(Math.abs(item.importe)),
        concepto: item.concepto ?? "",
        persona: item.persona,
        tablaDestino: item.tablaDestino ?? "",
        categoria: item.categoria ?? "",
        tipo: item.tipo ?? "",
        nombre: item.nombre ?? "",
        entidad: item.entidad ?? "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const categoriaOptions =
    draft.tablaDestino === "Gastos"
      ? (fieldOptions?.categoriaGastos ?? [])
      : draft.tablaDestino === "Ingresos"
        ? (fieldOptions?.categoriaIngresos ?? [])
        : [];

  const actionLabel =
    staged?.action === "accept"
      ? "Aceptando"
      : staged?.action === "ignore"
        ? "Ignorando"
        : "Guardando";

  return (
    <li className={`px-4 py-3 transition-colors ${isStaged ? "opacity-60" : ""}`}>
      {/* ── Fila principal ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-muted">{formatFecha(displayFecha)}</span>
            <span
              className={
                displayImporte < 0 ? "font-medium text-expense" : "font-medium text-income"
              }
            >
              {formatEur(displayImporte)}
            </span>
            <span className="truncate font-medium">{displayConcepto || "—"}</span>
            {item.banco && <span className="text-muted">{item.banco}</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            <span>
              Destino:{" "}
              <span className="text-foreground">
                {suggestedIgnore
                  ? "Transferencia (ignorar)"
                  : sinCategorizar
                    ? "Sin categorizar"
                    : (displayTablaDestino ?? "—")}
              </span>
            </span>
            {!suggestedIgnore && !sinCategorizar && displayTablaDestino === "Inversiones" ? (
              <>
                <span>
                  Tipo: <span className="text-foreground">{displayTipo ?? "—"}</span>
                </span>
                <span>
                  Nombre: <span className="text-foreground">{displayNombre ?? "—"}</span>
                </span>
              </>
            ) : !suggestedIgnore && !sinCategorizar ? (
              <span>
                Categoría:{" "}
                <span className="text-foreground">{displayCategoria ?? "—"}</span>
              </span>
            ) : null}
            <span>
              Persona:{" "}
              <span className="text-foreground">{displayPersona}</span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isStaged ? (
            <>
              <span className="text-sm text-muted">
                {committing ? "…" : `${actionLabel} (${staged.secondsLeft}s)`}
              </span>
              <button
                type="button"
                disabled={committing}
                onClick={() => onCancel(item.id)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-card disabled:opacity-50"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              {canAccept && (
                <button
                  type="button"
                  onClick={() => onAccept(item.id)}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Aceptar
                </button>
              )}
              {!canAccept && !suggestedIgnore && (
                <button
                  type="button"
                  onClick={() => onOpenEdit(item.id)}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Categorizar
                </button>
              )}
              <button
                type="button"
                onClick={() => onIgnore(item.id)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
              >
                Ignorar
              </button>
              {!suggestedIgnore && canAccept && (
                <button
                  type="button"
                  onClick={() => onOpenEdit(item.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                    isEditing
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border hover:bg-background"
                  }`}
                  aria-expanded={isEditing}
                >
                  ✎
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Formulario inline ── */}
      {isEditing && !isStaged && !suggestedIgnore && (
        <div className="mt-3 rounded-lg border border-border bg-background p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Editar antes de guardar
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Fecha */}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Fecha</span>
              <input
                type="date"
                value={draft.fecha}
                onChange={(e) => setDraft((d) => ({ ...d, fecha: e.target.value }))}
                className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>

            {/* Importe */}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Importe (€)</span>
              <input
                type="number"
                step="0.01"
                value={draft.importe}
                onChange={(e) => setDraft((d) => ({ ...d, importe: e.target.value }))}
                className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>

            {/* Concepto */}
            <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
              <span className="text-xs text-muted">Concepto</span>
              <input
                type="text"
                value={draft.concepto}
                onChange={(e) => setDraft((d) => ({ ...d, concepto: e.target.value }))}
                className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>

            {/* Tabla destino */}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Tabla destino</span>
              <select
                value={draft.tablaDestino}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    tablaDestino: e.target.value as TablaDestino | "",
                    categoria: "",
                    tipo: "",
                    nombre: "",
                    entidad: "",
                  }))
                }
                className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">— sin asignar —</option>
                {TABLA_DESTINO_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            {/* Categoría (Gastos/Ingresos) */}
            {draft.tablaDestino !== "Inversiones" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">Categoría</span>
                {categoriaOptions.length > 0 ? (
                  <SearchableSelect
                    value={draft.categoria}
                    onChange={(categoria) => setDraft((d) => ({ ...d, categoria }))}
                    options={categoriaOptions}
                  />
                ) : (
                  <input
                    type="text"
                    value={draft.categoria}
                    onChange={(e) => setDraft((d) => ({ ...d, categoria: e.target.value }))}
                    placeholder="Escribe una categoría"
                    className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                )}
              </label>
            )}

            {draft.tablaDestino === "Inversiones" && (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">Tipo inversión</span>
                  <select
                    value={draft.tipo}
                    onChange={(e) => setDraft((d) => ({ ...d, tipo: e.target.value }))}
                    className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">— sin tipo —</option>
                    {(fieldOptions?.tipoInversiones ?? []).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">Nombre activo</span>
                  <input
                    type="text"
                    value={draft.nombre}
                    onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
                    className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">Entidad (opcional)</span>
                  <input
                    type="text"
                    value={draft.entidad}
                    onChange={(e) => setDraft((d) => ({ ...d, entidad: e.target.value }))}
                    placeholder="Vacío = banco"
                    className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </label>
              </>
            )}

            {/* Persona */}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Persona</span>
              <select
                value={draft.persona}
                onChange={(e) => setDraft((d) => ({ ...d, persona: e.target.value as PersonaValue }))}
                className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {PERSONA_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenEdit(item.id)} // toggle off
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-card"
            >
              Descartar
            </button>
            <button
              type="button"
              disabled={!draft.tablaDestino}
              onClick={() => onModify(item.id, draft)}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

// ─── Panel principal ─────────────────────────────────────────────────────────

export function PendingTasksPanel({ onCountChange }: PendingTasksPanelProps) {
  const [items, setItems] = useState<ClassifiedPending[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<PendingTasksFilters>(EMPTY_PENDING_FILTERS);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldOptions, setFieldOptions] = useState<FieldOptions | null>(null);
  const [view, setView] = useState<"tasks" | "rules">("tasks");

  const stagedRef = useRef<
    Map<string, StagedAction & { timerId: number; tickId: number }>
  >(new Map());
  const [stagedSnapshot, setStagedSnapshot] = useState<Map<string, StagedAction>>(new Map());
  const [committingIds, setCommittingIds] = useState<Set<string>>(new Set());
  const [bulkGroupAction, setBulkGroupAction] = useState<{
    groupKey: string;
    ids: string[];
    action: "accept" | "ignore";
    expiresAt: number;
    secondsLeft: number;
    committing: boolean;
  } | null>(null);
  const bulkGroupTimerRef = useRef<number | null>(null);
  const bulkGroupTickRef = useRef<number | null>(null);

  const filteredItems = useMemo(
    () => applyPendingFilters(items, filters),
    [items, filters],
  );
  const ruleGroups = useMemo(
    () => groupPendingByRegla(filteredItems),
    [filteredItems],
  );
  function syncSnapshot() {
    const snap = new Map<string, StagedAction>();
    for (const [id, s] of stagedRef.current) {
      snap.set(id, {
        action: s.action,
        expiresAt: s.expiresAt,
        secondsLeft: s.secondsLeft,
        draft: s.draft,
      });
    }
    setStagedSnapshot(snap);
  }

  // Cargar opciones de campos al montar
  useEffect(() => {
    fetch("/api/automatic-actions/options")
      .then((r) => r.json())
      .then((data: FieldOptions) => setFieldOptions(data))
      .catch(() => {/* no bloquear si falla */});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/automatic-actions/pending");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al cargar");
      }
      const json = (await res.json()) as PendingResponse;
      setItems(json.items);
      setTotal(json.total);
      onCountChange?.(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const staged = stagedRef.current;
    return () => {
      for (const s of staged.values()) {
        window.clearTimeout(s.timerId);
        window.clearInterval(s.tickId);
      }
      if (bulkGroupTimerRef.current) window.clearTimeout(bulkGroupTimerRef.current);
      if (bulkGroupTickRef.current) window.clearInterval(bulkGroupTickRef.current);
    };
  }, []);

  function bumpCount(delta: number) {
    setTotal((prev) => {
      const next = Math.max(0, prev + delta);
      onCountChange?.(next);
      return next;
    });
  }

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleOpenEdit(id: string) {
    setEditingId((prev) => (prev === id ? null : id));
  }

  async function commitAction(id: string) {
    const staged = stagedRef.current.get(id);
    if (!staged) return;

    window.clearInterval(staged.tickId);
    window.clearTimeout(staged.timerId);
    stagedRef.current.delete(id);
    syncSnapshot();

    setCommittingIds((prev) => new Set(prev).add(id));
    setError("");

    try {
      let body: Record<string, unknown> = { action: staged.action };

      if (staged.action === "modify" && staged.draft) {
        const d = staged.draft;
        body = {
          action: "modify",
          fecha: d.fecha || undefined,
          importe: d.importe ? parseFloat(d.importe) : undefined,
          concepto: d.concepto || undefined,
          persona: d.persona || undefined,
          tablaDestino: d.tablaDestino || undefined,
          categoria: d.categoria || null,
          tipo: d.tipo || null,
          nombre: d.nombre || null,
          entidad: d.entidad || null,
        };
      }

      const res = await fetch(`/api/automatic-actions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const resBody = (await res.json()) as { error?: string };
        throw new Error(resBody.error ?? "Error al procesar");
      }

      setItems((prev) => prev.filter((row) => row.id !== id));
      bumpCount(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCommittingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function stageAction(id: string, action: "accept" | "ignore" | "modify", draft?: EditDraft) {
    if (action === "accept") {
      const item = items.find((row) => row.id === id);
      if (item && !item.ignorar && !item.tablaDestino) return;
    }
    cancelAction(id);

    const expiresAt = Date.now() + COMMIT_MS;

    const tickId = window.setInterval(() => {
      const entry = stagedRef.current.get(id);
      if (!entry) return;
      const left = Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
      entry.secondsLeft = left;
      syncSnapshot();
    }, TICK_MS);

    const timerId = window.setTimeout(() => {
      commitAction(id);
    }, COMMIT_MS);

    stagedRef.current.set(id, {
      action,
      expiresAt,
      secondsLeft: Math.ceil(COMMIT_MS / 1000),
      draft,
      timerId,
      tickId,
    });
    syncSnapshot();

    // Cerrar el formulario inline al stagear
    if (action === "modify") {
      setEditingId(null);
    }
  }

  function cancelBulkGroupAction() {
    if (bulkGroupTimerRef.current) window.clearTimeout(bulkGroupTimerRef.current);
    if (bulkGroupTickRef.current) window.clearInterval(bulkGroupTickRef.current);
    bulkGroupTimerRef.current = null;
    bulkGroupTickRef.current = null;
    setBulkGroupAction(null);
  }

  async function commitBulkGroupAction(
    groupKey: string,
    ids: string[],
    action: "accept" | "ignore",
  ) {
    cancelBulkGroupAction();
    setBulkGroupAction({
      groupKey,
      ids,
      action,
      expiresAt: 0,
      secondsLeft: 0,
      committing: true,
    });
    setError("");

    try {
      await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/automatic-actions/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          });
          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            throw new Error(body.error ?? "Error al procesar");
          }
        }),
      );
      setItems((prev) => prev.filter((row) => !ids.includes(row.id)));
      bumpCount(-ids.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setBulkGroupAction(null);
    }
  }

  function stageBulkGroupAction(
    groupKey: string,
    action: "accept" | "ignore",
    ids: string[],
  ) {
    const pendingIds = ids.filter((id) => !stagedRef.current.has(id));
    if (pendingIds.length === 0) return;

    cancelBulkGroupAction();
    const expiresAt = Date.now() + COMMIT_MS;

    bulkGroupTickRef.current = window.setInterval(() => {
      setBulkGroupAction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          secondsLeft: Math.max(0, Math.ceil((prev.expiresAt - Date.now()) / 1000)),
        };
      });
    }, TICK_MS);

    bulkGroupTimerRef.current = window.setTimeout(() => {
      commitBulkGroupAction(groupKey, pendingIds, action);
    }, COMMIT_MS);

    setBulkGroupAction({
      groupKey,
      ids: pendingIds,
      action,
      expiresAt,
      secondsLeft: Math.ceil(COMMIT_MS / 1000),
      committing: false,
    });
  }

  function cancelAction(id: string) {
    const entry = stagedRef.current.get(id);
    if (!entry) return;
    window.clearTimeout(entry.timerId);
    window.clearInterval(entry.tickId);
    stagedRef.current.delete(id);
    syncSnapshot();
  }

  return (
    <div className="flex flex-col">
      {view === "rules" ? (
        <ImportRulesPanel
          fieldOptions={fieldOptions}
          onBack={() => setView("tasks")}
          onRulesChanged={load}
        />
      ) : (
        <>
      <div className="flex items-center justify-between gap-4 border-b border-border px-0 py-3">
        <h2 id="pending-tasks-title" className="text-lg font-semibold">
          Tareas pendientes
          {!loading && <span className="text-muted"> ({total})</span>}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("rules")}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
          >
            Gestionar reglas
          </button>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background disabled:opacity-50"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 py-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {loading && items.length === 0 && (
            <p className="text-sm text-muted">Cargando tareas…</p>
          )}

          {error && <p className="mb-3 text-sm text-expense">{error}</p>}

          {!loading && !error && items.length === 0 && (
            <p className="text-sm text-muted">No hay tareas pendientes.</p>
          )}

          {!loading && !error && items.length > 0 && filteredItems.length === 0 && (
            <p className="text-sm text-muted">Ninguna tarea coincide con los filtros.</p>
          )}

          {ruleGroups.length > 0 && (
            <div className="space-y-3">
              {ruleGroups.map((group) => {
                const expanded = !collapsedGroups.has(group.key);
                const showBulk = !group.sinCategorizar;
                const bulkAction = group.ignorar ? "ignore" : "accept";
                const bulkLabel = group.ignorar ? "Ignorar todo" : "Aceptar todo";
                const bulkPending =
                  bulkGroupAction?.groupKey === group.key && !bulkGroupAction.committing;
                const bulkCommitting =
                  bulkGroupAction?.groupKey === group.key && bulkGroupAction.committing;
                const bulkProgressLabel =
                  bulkGroupAction?.action === "accept" ? "Aceptando todo" : "Ignorando todo";

                return (
                  <section
                    key={group.key}
                    className={`overflow-hidden rounded-lg border border-border ${
                      group.ignorar || group.sinCategorizar ? "bg-card/40" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        aria-expanded={expanded}
                        className="min-w-0 flex-1 text-left hover:opacity-90"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{group.label}</span>
                          <span className="text-sm font-normal text-muted">
                            ({group.items.length})
                          </span>
                          <GroupImporteStats items={group.items} />
                          <span className="shrink-0 text-muted" aria-hidden="true">
                            {expanded ? "▾" : "▸"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {getReglaGroupSubtitle(group.items)}
                        </p>
                      </button>
                      {showBulk && (
                      <div className="flex shrink-0 items-center gap-2">
                        {bulkPending ? (
                          <>
                            <span className="text-sm text-muted">
                              {bulkProgressLabel} ({bulkGroupAction?.secondsLeft}s)
                            </span>
                            <button
                              type="button"
                              onClick={cancelBulkGroupAction}
                              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={Boolean(bulkCommitting)}
                            onClick={() =>
                              stageBulkGroupAction(
                                group.key,
                                bulkAction,
                                group.items.map((item) => item.id),
                              )
                            }
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                              group.ignorar
                                ? "border border-border hover:bg-background"
                                : "bg-accent text-white hover:opacity-90"
                            }`}
                          >
                            {bulkCommitting ? "Procesando…" : bulkLabel}
                          </button>
                        )}
                      </div>
                      )}
                    </div>

                    {expanded && (
                      <ul className="divide-y divide-border">
                        {group.items.map((item) => (
                          <PendingTaskRow
                            key={item.id}
                            item={item}
                            staged={stagedSnapshot.get(item.id)}
                            committing={committingIds.has(item.id)}
                            fieldOptions={fieldOptions}
                            onAccept={(id) => stageAction(id, "accept")}
                            onIgnore={(id) => stageAction(id, "ignore")}
                            onModify={(id, draft) => stageAction(id, "modify", draft)}
                            onCancel={cancelAction}
                            onOpenEdit={handleOpenEdit}
                            editingId={editingId}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <PendingTasksSidebar
            items={items}
            filters={filters}
            filteredCount={filteredItems.length}
            onFiltersChange={setFilters}
          />
        )}
      </div>
        </>
      )}
    </div>
  );
}
