"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FieldOptions } from "@/app/api/automatic-actions/options/route";
import { SearchableSelect } from "@/components/searchable-select";
import {
  buildCondition,
  DEFAULT_PRIORITY,
  formatRuleSummary,
  getConditionText,
  groupRulesByDestino,
  inferConditionKind,
  isIgnorarRule,
} from "@/lib/import-rules/helpers";
import type {
  ConditionKind,
  DestinoRegla,
  ImportRule,
  ImportRuleInput,
  RuleScope,
  TablaDestino,
} from "@/lib/import-rules/types";

interface RulesResponse {
  rules: ImportRule[];
}

interface ImportRulesPanelProps {
  fieldOptions: FieldOptions | null;
  onBack: () => void;
  onRulesChanged: () => void;
}

type RuleVisibilidad = "personal" | "comun";

interface RuleFormState {
  nombre: string;
  visibilidad: RuleVisibilidad;
  conditionKind: ConditionKind;
  conditionText: string;
  tablaDestino: DestinoRegla | "";
  categoria: string;
  origen: string;
  notas: string;
  tipo: string;
  nombreActivo: string;
  entidad: string;
  alcance: RuleScope;
  cuenta: string;
  prioridad: string;
  activa: boolean;
  invertirImporte: boolean;
}

function emptyForm(): RuleFormState {
  return {
    nombre: "",
    visibilidad: "personal",
    conditionKind: "exacto",
    conditionText: "",
    tablaDestino: "Inversiones",
    categoria: "",
    origen: "",
    notas: "",
    tipo: "",
    nombreActivo: "",
    entidad: "",
    alcance: "global",
    cuenta: "",
    prioridad: String(DEFAULT_PRIORITY.exacto),
    activa: true,
    invertirImporte: false,
  };
}

function formFromRule(rule: ImportRule): RuleFormState {
  const kind = inferConditionKind(rule.condition);
  return {
    nombre: rule.nombre,
    visibilidad: rule.persona === "Común" ? "comun" : "personal",
    conditionKind: kind,
    conditionText: getConditionText(rule.condition),
    tablaDestino: isIgnorarRule(rule)
      ? "__ignorar__"
      : (rule.actions.tabla_destino ?? ""),
    categoria: rule.actions.categoria ?? "",
    origen: rule.actions.origen ?? "",
    notas: rule.actions.notas ?? "",
    tipo: rule.actions.tipo ?? "",
    nombreActivo: rule.actions.nombre ?? "",
    entidad: rule.actions.entidad ?? "",
    alcance: rule.scope,
    cuenta: rule.accountId ?? "",
    prioridad: String(rule.priority),
    activa: rule.active,
    invertirImporte: rule.actions.invertir_importe === true,
  };
}

function formToInput(form: RuleFormState): ImportRuleInput {
  const actions: ImportRuleInput["actions"] =
    form.tablaDestino === "__ignorar__"
      ? { ignorar: true }
      : { tabla_destino: form.tablaDestino as TablaDestino };

  if (form.tablaDestino === "Gastos" && form.categoria) {
    actions.categoria = form.categoria;
  }
  if (form.tablaDestino === "Ingresos") {
    if (form.categoria) actions.categoria = form.categoria;
    if (form.origen) actions.origen = form.origen;
    if (form.notas) actions.notas = form.notas;
  }
  if (form.tablaDestino === "Inversiones") {
    if (form.tipo) actions.tipo = form.tipo;
    if (form.nombreActivo) actions.nombre = form.nombreActivo;
    if (form.entidad) actions.entidad = form.entidad;
  }
  if (form.invertirImporte) {
    actions.invertir_importe = true;
  }

  return {
    nombre: form.nombre.trim(),
    persona: form.visibilidad === "comun" ? "Común" : undefined,
    activa: form.activa,
    alcance: form.alcance,
    cuenta: form.alcance === "account" ? form.cuenta.trim() || null : null,
    prioridad: Number(form.prioridad) || 0,
    condition: buildCondition(form.conditionKind, form.conditionText),
    actions,
  };
}

export function ImportRulesPanel({
  fieldOptions,
  onBack,
  onRulesChanged,
}: ImportRulesPanelProps) {
  const [rules, setRules] = useState<ImportRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormState>(emptyForm);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const destinoGroups = useMemo(() => groupRulesByDestino(rules), [rules]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/import-rules");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al cargar reglas");
      }
      const json = (await res.json()) as RulesResponse;
      setRules(json.rules);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setView("form");
  }

  function openEdit(rule: ImportRule) {
    setEditingId(rule.id);
    setForm(formFromRule(rule));
    setView("form");
  }

  function handleConditionKindChange(kind: ConditionKind) {
    setForm((prev) => ({
      ...prev,
      conditionKind: kind,
      prioridad: String(DEFAULT_PRIORITY[kind]),
    }));
  }

  async function saveForm() {
    setSaving(true);
    setError("");
    try {
      const input = formToInput(form);
      const url = editingId ? `/api/import-rules/${editingId}` : "/api/import-rules";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: input.nombre,
          persona: input.persona,
          activa: input.activa,
          alcance: input.alcance,
          cuenta: input.cuenta,
          prioridad: input.prioridad,
          condition: input.condition,
          actions: input.actions,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al guardar");
      }

      await load();
      onRulesChanged();
      setView("list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rule: ImportRule) {
    setError("");
    try {
      const res = await fetch(`/api/import-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !rule.active }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al actualizar");
      }
      await load();
      onRulesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  async function removeRule(rule: ImportRule) {
    if (!window.confirm(`¿Eliminar la regla «${rule.nombre}»?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/import-rules/${rule.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al eliminar");
      }
      await load();
      onRulesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  const needsText =
    form.conditionKind === "exacto" || form.conditionKind === "contiene";

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (view === "form") {
    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-border py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView("list")}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
            >
              ← Reglas
            </button>
            <h2 className="text-lg font-semibold">
              {editingId ? "Editar regla" : "Nueva regla"}
            </h2>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-expense">{error}</p>}

        <div className="mt-4 space-y-4 rounded-lg border border-border p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Nombre</span>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              placeholder="Exacto — VANGUARD US 500 → SP500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Visibilidad</span>
            <select
              value={form.visibilidad}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  visibilidad: e.target.value as RuleVisibilidad,
                }))
              }
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="personal">Personal (solo yo)</option>
              <option value="comun">Común (ambos)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Tipo de condición</span>
            <select
              value={form.conditionKind}
              onChange={(e) => handleConditionKindChange(e.target.value as ConditionKind)}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="exacto">Nombre exacto</option>
              <option value="contiene">Contiene texto</option>
              <option value="importe_positivo">Importe positivo</option>
              <option value="importe_negativo">Importe negativo</option>
            </select>
          </label>

          {needsText && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Texto del concepto</span>
              <input
                type="text"
                value={form.conditionText}
                onChange={(e) => setForm((f) => ({ ...f, conditionText: e.target.value }))}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                placeholder="VANGUARD US 500 STOCK INDEX EU"
              />
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Destino</span>
            <select
              value={form.tablaDestino}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tablaDestino: e.target.value as DestinoRegla | "",
                  categoria: "",
                  origen: "",
                  notas: "",
                  tipo: "",
                  nombreActivo: "",
                  entidad: "",
                }))
              }
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="">— seleccionar —</option>
              <option value="__ignorar__">Ignorar (transferencia interna)</option>
              {(fieldOptions?.tablaDestino ?? ["Gastos", "Ingresos", "Inversiones"]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          {form.tablaDestino !== "__ignorar__" && form.tablaDestino === "Gastos" && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Categoría</span>
              <SearchableSelect
                value={form.categoria}
                onChange={(categoria) => setForm((f) => ({ ...f, categoria }))}
                options={fieldOptions?.categoriaGastos ?? []}
                allowCreate
                emptyLabel="— sin categoría —"
              />
            </label>
          )}

          {form.tablaDestino === "Ingresos" && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">Origen</span>
                <input
                  type="text"
                  list="origen-ingresos-options"
                  value={form.origen}
                  onChange={(e) => setForm((f) => ({ ...f, origen: e.target.value }))}
                  placeholder="Dividendos"
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
                <datalist id="origen-ingresos-options">
                  {(fieldOptions?.origenIngresos ?? []).map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">Categoría</span>
                <SearchableSelect
                  value={form.categoria}
                  onChange={(categoria) => setForm((f) => ({ ...f, categoria }))}
                  options={fieldOptions?.categoriaIngresos ?? []}
                  allowCreate
                  emptyLabel="— sin categoría —"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">Notas</span>
                <input
                  type="text"
                  value={form.notas}
                  onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                  placeholder="p. ej. emisor del dividendo"
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
              </label>
            </>
          )}

          {form.tablaDestino === "Inversiones" && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">Tipo inversión</span>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="">— seleccionar —</option>
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
                  value={form.nombreActivo}
                  onChange={(e) => setForm((f) => ({ ...f, nombreActivo: e.target.value }))}
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                  placeholder="SP500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">Entidad (opcional)</span>
                <input
                  type="text"
                  list="entidad-options"
                  value={form.entidad}
                  onChange={(e) => setForm((f) => ({ ...f, entidad: e.target.value }))}
                  placeholder="Vacío = heredar del banco"
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
                <datalist id="entidad-options">
                  {(fieldOptions?.entidadInversiones ?? []).map((e) => (
                    <option key={e} value={e} />
                  ))}
                </datalist>
              </label>
            </>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Alcance</span>
              <select
                value={form.alcance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, alcance: e.target.value as RuleScope }))
                }
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="global">Global</option>
                <option value="account">Cuenta</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Prioridad</span>
              <input
                type="number"
                value={form.prioridad}
                onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value }))}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              />
            </label>
          </div>

          {form.alcance === "account" && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">ID de cuenta</span>
              <input
                type="text"
                value={form.cuenta}
                onChange={(e) => setForm((f) => ({ ...f, cuenta: e.target.value }))}
                placeholder="trade-republic-santi"
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              />
            </label>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.invertirImporte}
              onChange={(e) => setForm((f) => ({ ...f, invertirImporte: e.target.checked }))}
            />
            Invertir cantidad
            <span className="text-xs text-muted">
              (multiplica el importe por −1; útil si el banco registra inversiones como gastos)
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activa}
              onChange={(e) => setForm((f) => ({ ...f, activa: e.target.checked }))}
            />
            Regla activa
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setView("list")}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || !form.nombre.trim() || !form.tablaDestino}
              onClick={saveForm}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
          >
            ← Tareas
          </button>
          <h2 className="text-lg font-semibold">Reglas de clasificación</h2>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          + Nueva regla
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-expense">{error}</p>}
      {loading && <p className="mt-4 text-sm text-muted">Cargando reglas…</p>}

      {!loading && rules.length === 0 && (
        <p className="mt-4 text-sm text-muted">No hay reglas. Crea la primera con «+ Nueva regla».</p>
      )}

      {!loading && rules.length > 0 && (
        <div className="mt-4 space-y-3">
          {destinoGroups.map((group) => {
            const expanded = !collapsedGroups.has(group.key);

            return (
              <section
                key={group.key}
                className="overflow-hidden rounded-lg border border-border"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-3 bg-background px-4 py-2.5 text-left text-sm font-medium hover:bg-card"
                >
                  <span>
                    {group.label}
                    <span className="ml-2 font-normal text-muted">
                      ({group.items.length})
                    </span>
                  </span>
                  <span className="shrink-0 text-muted" aria-hidden="true">
                    {expanded ? "▾" : "▸"}
                  </span>
                </button>

                {expanded && (
                  <ul className="divide-y divide-border border-t border-border">
                    {group.items.map((rule) => (
                      <li key={rule.id} className="px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  rule.active ? "bg-income" : "bg-muted"
                                }`}
                                title={rule.active ? "Activa" : "Inactiva"}
                              />
                              <span className="font-medium">{rule.nombre}</span>
                              {rule.persona === "Común" && (
                                <span className="rounded bg-background px-1.5 py-0.5 text-xs text-muted">
                                  Común
                                </span>
                              )}
                              <span className="text-xs text-muted">
                                {rule.scope} · prioridad {rule.priority}
                                {rule.actions.invertir_importe ? " · invierte signo" : ""}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-muted">{formatRuleSummary(rule)}</p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(rule)}
                              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActive(rule)}
                              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
                            >
                              {rule.active ? "Desactivar" : "Activar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRule(rule)}
                              className="rounded-lg border border-border px-3 py-1.5 text-sm text-expense hover:bg-background"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
