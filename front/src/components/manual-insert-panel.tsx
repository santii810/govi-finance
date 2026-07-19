"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DateInput } from "@/components/date-input";
import { GastosTemplateModal } from "@/components/gastos-template-modal";
import { InsertRecentLog } from "@/components/insert-recent-log";
import { SearchableSelect } from "@/components/searchable-select";
import { displayToIso } from "@/lib/date-input";
import type { GastosPlantillaSummary } from "@/lib/manual-insert/gastos-templates";
import { formatEur } from "@/lib/persona";
import type {
  FieldErrors,
  GastosRowInput,
  IngresosRowInput,
  InsertTable,
  InversionesRowInput,
  ManualInsertOptions,
  PatrimonioRowInput,
  PersonaValue,
} from "@/lib/manual-insert/types";
import {
  countValidPatrimonioRows,
  isCryptoTipo,
  isGastosRowValid,
  isIngresosRowValid,
  isInversionesRowValid,
  isPatrimonioRowValid,
  patrimonioNetPreview,
  usesUnidades,
  validateDate,
  validateGastosRow,
  validateIngresosRow,
  validateInversionesRow,
  validatePatrimonioRow,
} from "@/lib/manual-insert/validation";
import { usesPropiedad } from "@/lib/patrimonio-helpers";
import type { Persona } from "@/lib/types";

interface ManualInsertPanelProps {
  defaultPersona: Persona;
  onInserted?: () => void;
}

const TABS: { id: InsertTable; label: string }[] = [
  { id: "Gastos", label: "Gasto" },
  { id: "Ingresos", label: "Ingreso" },
  { id: "Inversiones", label: "Inversión" },
  { id: "Patrimonio", label: "Patrimonio" },
];

const PERSONA_OPTIONS: PersonaValue[] = ["Común", "Sandra", "Santi"];

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Normaliza ISO o DD/MM/YYYY a YYYY-MM-DD para comparar con hoy. */
function normalizeFechaIso(fecha: string): string | null {
  const trimmed = fecha.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  return displayToIso(trimmed);
}

function hasTodayFecha(fechas: string[]): boolean {
  const today = todayIso();
  return fechas.some((f) => normalizeFechaIso(f) === today);
}

function TodayDateConfirmModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-labelledby="today-date-confirm-title"
        aria-describedby="today-date-confirm-desc"
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-4 py-3">
          <h3 id="today-date-confirm-title" className="font-semibold">
            Fecha de hoy
          </h3>
        </div>
        <div className="px-4 py-4">
          <p id="today-date-confirm-desc" className="text-sm text-foreground">
            Hay registros con la fecha de hoy. ¿Seguro que quieres guardar?
          </p>
          <p className="mt-2 text-xs text-muted">
            A menudo se deja por error el valor por defecto.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Guardar igualmente
          </button>
        </div>
      </div>
    </div>
  );
}

function emptyGastosRow(defaultPersona: PersonaValue): GastosRowInput {
  return {
    fecha: todayIso(),
    cantidad: "",
    destino: "",
    fuente: "",
    persona: defaultPersona,
    categoria: "",
  };
}

function emptyIngresosRow(defaultPersona: PersonaValue): IngresosRowInput {
  return {
    fecha: todayIso(),
    ingreso: "",
    origen: "",
    persona: defaultPersona,
    categoria: "",
  };
}

function emptyInversionesRow(defaultPersona: PersonaValue): InversionesRowInput {
  return {
    fecha: todayIso(),
    importe: "",
    nombre: "",
    tipo: "",
    entidad: "",
    persona: defaultPersona,
  };
}

function emptyPatrimonioRow(): PatrimonioRowInput {
  return {
    entidad: "",
    nombre: "",
    valor: "",
    tipo: "",
    persona: "",
    unidades: "",
    propiedad: "",
    porcentaje: "",
  };
}

function fieldClass(hasError: boolean): string {
  return `rounded-md border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${
    hasError
      ? "border-expense focus:ring-expense"
      : "border-border focus:ring-accent"
  }`;
}

function patrimonioFieldClass(hasError: boolean): string {
  return `h-7 w-full rounded-md border bg-card px-2 py-0 text-sm leading-tight focus:outline-none focus:ring-1 ${
    hasError
      ? "border-expense focus:ring-expense"
      : "border-border focus:ring-accent"
  }`;
}

function PatrimonioCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-2 py-0.5 align-middle">
      <div className="flex h-7 items-center">{children}</div>
    </td>
  );
}

function PatrimonioPlaceholder() {
  return <span className="px-1 text-xs leading-none text-muted">—</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="text-[11px] text-expense">{message}</span>;
}

interface RowFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

function RowField({ label, error, children, className = "" }: RowFieldProps) {
  return (
    <label className={`flex min-w-0 flex-col gap-0.5 ${className}`}>
      <span className="text-[11px] text-muted">{label}</span>
      {children}
      <FieldError message={error} />
    </label>
  );
}

interface SimpleInsertFormProps {
  table: "Gastos" | "Ingresos" | "Inversiones";
  options: ManualInsertOptions;
  defaultPersona: PersonaValue;
  saving: boolean;
  logRefreshKey: number;
  onSave: (
    rows: GastosRowInput[] | IngresosRowInput[] | InversionesRowInput[],
  ) => Promise<boolean>;
  onPlantillaLoaded?: (message: string) => void;
  onPlantillaError?: (message: string) => void;
  onFetchPlantillas?: () => Promise<GastosPlantillaSummary[]>;
  onExpandPlantilla?: (plantillaId: string, month: string) => Promise<GastosRowInput[] | null>;
}

function pruneUnsavedRows<T>(
  rows: T[],
  savedIndices: Set<number>,
  emptyRow: () => T,
): T[] {
  const remaining = rows.filter((_, i) => !savedIndices.has(i));
  return remaining.length > 0 ? remaining : [emptyRow()];
}

function SimpleInsertForm({
  table,
  options,
  defaultPersona,
  saving,
  logRefreshKey,
  onSave,
  onPlantillaLoaded,
  onPlantillaError,
  onFetchPlantillas,
  onExpandPlantilla,
}: SimpleInsertFormProps) {
  const [plantillaModalOpen, setPlantillaModalOpen] = useState(false);
  const [plantillas, setPlantillas] = useState<GastosPlantillaSummary[]>([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [applyingPlantilla, setApplyingPlantilla] = useState(false);
  const [todayConfirmOpen, setTodayConfirmOpen] = useState(false);
  const [gastosRows, setGastosRows] = useState<GastosRowInput[]>(() => [
    emptyGastosRow(defaultPersona),
  ]);
  const [ingresosRows, setIngresosRows] = useState<IngresosRowInput[]>(() => [
    emptyIngresosRow(defaultPersona),
  ]);
  const [inversionesRows, setInversionesRows] = useState<InversionesRowInput[]>(() => [
    emptyInversionesRow(defaultPersona),
  ]);

  useEffect(() => {
    setGastosRows([emptyGastosRow(defaultPersona)]);
    setIngresosRows([emptyIngresosRow(defaultPersona)]);
    setInversionesRows([emptyInversionesRow(defaultPersona)]);
  }, [defaultPersona, table]);

  const rows =
    table === "Gastos" ? gastosRows : table === "Ingresos" ? ingresosRows : inversionesRows;

  const rowErrors = useMemo(() => {
    if (table === "Gastos") return gastosRows.map(validateGastosRow);
    if (table === "Ingresos") return ingresosRows.map(validateIngresosRow);
    return inversionesRows.map(validateInversionesRow);
  }, [table, gastosRows, ingresosRows, inversionesRows]);

  const validCount = useMemo(() => {
    if (table === "Gastos") return gastosRows.filter(isGastosRowValid).length;
    if (table === "Ingresos") return ingresosRows.filter(isIngresosRowValid).length;
    return inversionesRows.filter(isInversionesRowValid).length;
  }, [table, gastosRows, ingresosRows, inversionesRows]);

  const hasPartialErrors = rowErrors.some((e) => Object.keys(e).length > 0);

  const previewPersona: PersonaValue | "" =
    table === "Gastos"
      ? gastosRows[0]?.persona ?? ""
      : table === "Ingresos"
        ? ingresosRows[0]?.persona ?? ""
        : inversionesRows[0]?.persona ?? "";

  const previewCategoria =
    table === "Gastos"
      ? gastosRows[0]?.categoria ?? ""
      : table === "Ingresos"
        ? ingresosRows[0]?.categoria ?? ""
        : inversionesRows[0]?.tipo ?? "";

  function addRow() {
    if (table === "Gastos") {
      setGastosRows((prev) => [...prev, emptyGastosRow(defaultPersona)]);
    } else if (table === "Ingresos") {
      setIngresosRows((prev) => [...prev, emptyIngresosRow(defaultPersona)]);
    } else {
      setInversionesRows((prev) => [...prev, emptyInversionesRow(defaultPersona)]);
    }
  }

  function removeRow(index: number) {
    if (table === "Gastos") {
      setGastosRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    } else if (table === "Ingresos") {
      setIngresosRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    } else {
      setInversionesRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    }
  }

  function updateGastos(index: number, patch: Partial<GastosRowInput>) {
    setGastosRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function updateIngresos(index: number, patch: Partial<IngresosRowInput>) {
    setIngresosRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function updateInversiones(index: number, patch: Partial<InversionesRowInput>) {
    setInversionesRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function applyGastosPlantilla(plantillaId: string, month: string) {
    if (!onExpandPlantilla) return;
    setApplyingPlantilla(true);
    void onExpandPlantilla(plantillaId, month)
      .then((rows) => {
        if (!rows || rows.length === 0) {
          onPlantillaError?.("La plantilla no tiene filas activas");
          return;
        }
        setGastosRows(rows);
        setPlantillaModalOpen(false);
        onPlantillaLoaded?.(`${rows.length} filas cargadas desde plantilla — revisa y guarda`);
      })
      .catch((err) => {
        onPlantillaError?.(err instanceof Error ? err.message : "Error al cargar plantilla");
      })
      .finally(() => setApplyingPlantilla(false));
  }

  async function openPlantillaModal() {
    setPlantillaModalOpen(true);
    if (!onFetchPlantillas || plantillas.length > 0) return;
    setLoadingPlantillas(true);
    try {
      const loaded = await onFetchPlantillas();
      setPlantillas(loaded);
    } catch (err) {
      onPlantillaError?.(err instanceof Error ? err.message : "Error al cargar plantillas");
      setPlantillaModalOpen(false);
    } finally {
      setLoadingPlantillas(false);
    }
  }

  async function handleSaveClick() {
    const fechas =
      table === "Gastos"
        ? (rows as GastosRowInput[]).filter(isGastosRowValid).map((r) => r.fecha)
        : table === "Ingresos"
          ? (rows as IngresosRowInput[]).filter(isIngresosRowValid).map((r) => r.fecha)
          : (rows as InversionesRowInput[]).filter(isInversionesRowValid).map((r) => r.fecha);
    if (hasTodayFecha(fechas)) {
      setTodayConfirmOpen(true);
      return;
    }
    await proceedSave();
  }

  async function proceedSave() {
    setTodayConfirmOpen(false);
    const isValid =
      table === "Gastos"
        ? isGastosRowValid
        : table === "Ingresos"
          ? isIngresosRowValid
          : isInversionesRowValid;
    const savedIndices = new Set(
      rows.map((row, i) => (isValid(row as never) ? i : -1)).filter((i) => i >= 0),
    );

    const ok = await onSave(rows as never);
    if (!ok) return;

    if (table === "Gastos") {
      setGastosRows((prev) =>
        pruneUnsavedRows(prev, savedIndices, () => emptyGastosRow(defaultPersona)),
      );
    } else if (table === "Ingresos") {
      setIngresosRows((prev) =>
        pruneUnsavedRows(prev, savedIndices, () => emptyIngresosRow(defaultPersona)),
      );
    } else {
      setInversionesRows((prev) =>
        pruneUnsavedRows(prev, savedIndices, () => emptyInversionesRow(defaultPersona)),
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {rows.map((_, index) => {
          const errors = rowErrors[index] ?? {};
          return (
            <div
              key={`${table}-${index}`}
              className="rounded-lg border border-border bg-background/40 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Registro {index + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="text-xs text-muted hover:text-expense"
                  >
                    Quitar
                  </button>
                )}
              </div>

              {table === "Gastos" && (
                <SimpleGastosRow
                  row={gastosRows[index]}
                  errors={errors}
                  options={options}
                  onChange={(patch) => updateGastos(index, patch)}
                />
              )}
              {table === "Ingresos" && (
                <SimpleIngresosRow
                  row={ingresosRows[index]}
                  errors={errors}
                  options={options}
                  onChange={(patch) => updateIngresos(index, patch)}
                />
              )}
              {table === "Inversiones" && (
                <SimpleInversionesRow
                  row={inversionesRows[index]}
                  errors={errors}
                  options={options}
                  onChange={(patch) => updateInversiones(index, patch)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
          >
            + Añadir fila
          </button>
          {table === "Gastos" && (
            <button
              type="button"
              disabled={applyingPlantilla}
              onClick={() => void openPlantillaModal()}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background disabled:opacity-50"
            >
              {applyingPlantilla ? "Cargando…" : "Plantillas"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            {validCount} {validCount === 1 ? "fila lista" : "filas listas"}
            {hasPartialErrors && " · revisa los errores"}
          </span>
          <button
            type="button"
            disabled={saving || validCount === 0}
            onClick={() => void handleSaveClick()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Guardando…" : `Guardar ${validCount || ""}`}
          </button>
        </div>
      </div>

      {table === "Gastos" && plantillaModalOpen && (
        <GastosTemplateModal
          plantillas={plantillas}
          loading={loadingPlantillas}
          onClose={() => setPlantillaModalOpen(false)}
          onConfirm={applyGastosPlantilla}
        />
      )}

      {todayConfirmOpen && (
        <TodayDateConfirmModal
          onCancel={() => setTodayConfirmOpen(false)}
          onConfirm={() => void proceedSave()}
        />
      )}

      <InsertRecentLog
        table={table}
        persona={previewPersona}
        categoria={previewCategoria}
        refreshKey={logRefreshKey}
        options={options}
      />
    </div>
  );
}

function SimpleGastosRow({
  row,
  errors,
  options,
  onChange,
}: {
  row: GastosRowInput;
  errors: FieldErrors;
  options: ManualInsertOptions;
  onChange: (patch: Partial<GastosRowInput>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <RowField label="Fecha" error={errors.fecha}>
        <DateInput
          value={row.fecha}
          onChange={(fecha) => onChange({ fecha })}
          aria-invalid={Boolean(errors.fecha)}
          className={fieldClass(Boolean(errors.fecha))}
        />
      </RowField>
      <RowField label="Cantidad" error={errors.cantidad}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={row.cantidad}
          onChange={(e) => onChange({ cantidad: e.target.value })}
          className={fieldClass(Boolean(errors.cantidad))}
        />
      </RowField>
      <RowField label="Persona" error={errors.persona}>
        <select
          value={row.persona}
          onChange={(e) => onChange({ persona: e.target.value as PersonaValue })}
          className={fieldClass(Boolean(errors.persona))}
        >
          <option value="">—</option>
          {PERSONA_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </RowField>
      <RowField label="Concepto">
        <input
          type="text"
          value={row.destino}
          onChange={(e) => onChange({ destino: e.target.value })}
          className={fieldClass(false)}
        />
      </RowField>
      <RowField label="Fuente" error={errors.fuente}>
        <SearchableSelect
          value={row.fuente}
          onChange={(fuente) => onChange({ fuente })}
          options={options.fuenteGastos}
          emptyLabel="—"
          placeholder="Buscar fuente…"
          hasError={Boolean(errors.fuente)}
        />
      </RowField>
      <RowField label="Categoría" error={errors.categoria}>
        <SearchableSelect
          value={row.categoria}
          onChange={(categoria) => onChange({ categoria })}
          options={options.categoriaGastos}
          allowCreate
          emptyLabel="—"
          hasError={Boolean(errors.categoria)}
        />
      </RowField>
    </div>
  );
}

function SimpleIngresosRow({
  row,
  errors,
  options,
  onChange,
}: {
  row: IngresosRowInput;
  errors: FieldErrors;
  options: ManualInsertOptions;
  onChange: (patch: Partial<IngresosRowInput>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <RowField label="Fecha" error={errors.fecha}>
        <DateInput
          value={row.fecha}
          onChange={(fecha) => onChange({ fecha })}
          aria-invalid={Boolean(errors.fecha)}
          className={fieldClass(Boolean(errors.fecha))}
        />
      </RowField>
      <RowField label="Ingreso" error={errors.ingreso}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={row.ingreso}
          onChange={(e) => onChange({ ingreso: e.target.value })}
          className={fieldClass(Boolean(errors.ingreso))}
        />
      </RowField>
      <RowField label="Persona" error={errors.persona}>
        <select
          value={row.persona}
          onChange={(e) => onChange({ persona: e.target.value as PersonaValue })}
          className={fieldClass(Boolean(errors.persona))}
        >
          <option value="">—</option>
          {PERSONA_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </RowField>
      <RowField label="Origen" error={errors.origen}>
        <SearchableSelect
          value={row.origen}
          onChange={(origen) => onChange({ origen })}
          options={options.origenIngresos}
          allowCreate
          emptyLabel="—"
          placeholder="Buscar origen…"
          hasError={Boolean(errors.origen)}
        />
      </RowField>
      <RowField label="Categoría" error={errors.categoria}>
        <SearchableSelect
          value={row.categoria}
          onChange={(categoria) => onChange({ categoria })}
          options={options.categoriaIngresos}
          allowCreate
          emptyLabel="—"
          hasError={Boolean(errors.categoria)}
        />
      </RowField>
    </div>
  );
}

function SimpleInversionesRow({
  row,
  errors,
  options,
  onChange,
}: {
  row: InversionesRowInput;
  errors: FieldErrors;
  options: ManualInsertOptions;
  onChange: (patch: Partial<InversionesRowInput>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <RowField label="Fecha" error={errors.fecha}>
        <DateInput
          value={row.fecha}
          onChange={(fecha) => onChange({ fecha })}
          aria-invalid={Boolean(errors.fecha)}
          className={fieldClass(Boolean(errors.fecha))}
        />
      </RowField>
      <RowField label="Importe" error={errors.importe}>
        <input
          type="number"
          step="0.01"
          value={row.importe}
          onChange={(e) => onChange({ importe: e.target.value })}
          className={fieldClass(Boolean(errors.importe))}
        />
      </RowField>
      <RowField label="Persona" error={errors.persona}>
        <select
          value={row.persona}
          onChange={(e) => onChange({ persona: e.target.value as PersonaValue })}
          className={fieldClass(Boolean(errors.persona))}
        >
          <option value="">—</option>
          {PERSONA_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </RowField>
      <RowField label="Nombre" error={errors.nombre}>
        <input
          type="text"
          value={row.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          className={fieldClass(Boolean(errors.nombre))}
        />
      </RowField>
      <RowField label="Tipo">
        <select
          value={row.tipo}
          onChange={(e) => onChange({ tipo: e.target.value })}
          className={fieldClass(false)}
        >
          <option value="">—</option>
          {options.tipoInversiones.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </RowField>
      <RowField label="Entidad">
        <input
          type="text"
          list="inversiones-entidad-list"
          value={row.entidad}
          onChange={(e) => onChange({ entidad: e.target.value })}
          className={fieldClass(false)}
        />
        <datalist id="inversiones-entidad-list">
          {options.entidadInversiones.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
      </RowField>
    </div>
  );
}

function initialPatrimonioRows(): PatrimonioRowInput[] {
  return [emptyPatrimonioRow(), emptyPatrimonioRow(), emptyPatrimonioRow()];
}

interface PatrimonioInsertFormProps {
  options: ManualInsertOptions;
  defaultPersona: PersonaValue;
  saving: boolean;
  logRefreshKey: number;
  onSave: (payload: {
    fecha: string;
    defaultPersona: PersonaValue | "";
    rows: PatrimonioRowInput[];
  }) => Promise<boolean>;
  onLoadTemplate: () => Promise<PatrimonioRowInput[] | null>;
  loadingTemplate: boolean;
}

function PatrimonioInsertForm({
  options,
  defaultPersona,
  saving,
  logRefreshKey,
  onSave,
  onLoadTemplate,
  loadingTemplate,
}: PatrimonioInsertFormProps) {
  const [fecha, setFecha] = useState(todayIso());
  const [defaultPersonaField, setDefaultPersonaField] = useState<PersonaValue | "">(
    defaultPersona,
  );
  const [rows, setRows] = useState<PatrimonioRowInput[]>(() => initialPatrimonioRows());
  const [todayConfirmOpen, setTodayConfirmOpen] = useState(false);

  useEffect(() => {
    setDefaultPersonaField(defaultPersona);
  }, [defaultPersona]);

  const fechaError = useMemo(() => validateDate(fecha), [fecha]);

  const rowErrors = useMemo(
    () => rows.map((row) => validatePatrimonioRow(row, defaultPersonaField)),
    [rows, defaultPersonaField],
  );

  const validCount = useMemo(
    () => countValidPatrimonioRows({ fecha, defaultPersona: defaultPersonaField, rows }),
    [fecha, defaultPersonaField, rows],
  );

  const netPreview = useMemo(
    () => patrimonioNetPreview({ fecha, defaultPersona: defaultPersonaField, rows }),
    [fecha, defaultPersonaField, rows],
  );

  const hasPartialErrors = rowErrors.some((e) => Object.keys(e).length > 0);

  function updateRow(index: number, patch: Partial<PatrimonioRowInput>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyPatrimonioRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function loadTemplate() {
    const templateRows = await onLoadTemplate();
    if (templateRows && templateRows.length > 0) {
      setRows(templateRows);
      setFecha(todayIso());
    }
  }

  async function proceedSavePatrimonio() {
    setTodayConfirmOpen(false);
    const savedIndices = new Set(
      rows
        .map((row, i) =>
          isPatrimonioRowValid(row, defaultPersonaField) ? i : -1,
        )
        .filter((i) => i >= 0),
    );
    const ok = await onSave({
      fecha,
      defaultPersona: defaultPersonaField,
      rows,
    });
    if (!ok) return;
    const remaining = rows.filter((_, i) => !savedIndices.has(i));
    if (remaining.length > 0) {
      setRows(remaining);
      return;
    }
    setFecha(todayIso());
    setDefaultPersonaField(defaultPersona);
    setRows(initialPatrimonioRows());
  }

  function handleSavePatrimonioClick() {
    if (hasTodayFecha([fecha])) {
      setTodayConfirmOpen(true);
      return;
    }
    void proceedSavePatrimonio();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-lg border border-border bg-background/40 p-3 sm:grid-cols-3">
        <RowField label="Fecha del snapshot" error={fechaError}>
          <DateInput
            value={fecha}
            onChange={setFecha}
            aria-invalid={Boolean(fechaError)}
            className={fieldClass(Boolean(fechaError))}
          />
        </RowField>
        <RowField label="Persona por defecto">
          <select
            value={defaultPersonaField}
            onChange={(e) => setDefaultPersonaField(e.target.value as PersonaValue)}
            className={fieldClass(false)}
          >
            {PERSONA_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </RowField>
        <div className="flex items-end">
          <button
            type="button"
            disabled={loadingTemplate}
            onClick={() => void loadTemplate()}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background disabled:opacity-50"
          >
            {loadingTemplate ? "Cargando…" : "Usar último snapshot"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-background/60 text-left text-xs text-muted">
            <tr>
              <th className="px-2 py-1.5 font-medium">Entidad</th>
              <th className="px-2 py-1.5 font-medium">Nombre</th>
              <th className="px-2 py-1.5 font-medium">Valor</th>
              <th className="px-2 py-1.5 font-medium">Tipo</th>
              <th className="px-2 py-1.5 font-medium">Propiedad / Unid.</th>
              <th className="px-2 py-1.5 font-medium">% tit.</th>
              <th className="px-2 py-1.5 font-medium">Persona</th>
              <th className="px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const errors = rowErrors[index] ?? {};
              return (
                <tr key={`pat-${index}`} className="border-b border-border/70">
                  <PatrimonioCell>
                    <input
                      list={`entidad-list-${index}`}
                      value={row.entidad}
                      onChange={(e) => updateRow(index, { entidad: e.target.value })}
                      className={`${patrimonioFieldClass(false)} min-w-[7rem]`}
                    />
                    <datalist id={`entidad-list-${index}`}>
                      {options.entidadPatrimonio.map((e) => (
                        <option key={e} value={e} />
                      ))}
                    </datalist>
                  </PatrimonioCell>
                  <PatrimonioCell>
                    <input
                      type="text"
                      value={row.nombre}
                      onChange={(e) => updateRow(index, { nombre: e.target.value })}
                      className={`${patrimonioFieldClass(Boolean(errors.nombre))} min-w-[8rem]`}
                    />
                  </PatrimonioCell>
                  <PatrimonioCell>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.valor}
                      disabled={usesUnidades(row)}
                      placeholder={
                        usesUnidades(row)
                          ? "auto (BTC)"
                          : usesPropiedad(row.tipo)
                            ? "Valor total €"
                            : undefined
                      }
                      onChange={(e) => updateRow(index, { valor: e.target.value })}
                      className={`${patrimonioFieldClass(Boolean(errors.valor))} min-w-[6rem] disabled:opacity-50`}
                    />
                  </PatrimonioCell>
                  <PatrimonioCell>
                    <select
                      value={row.tipo}
                      onChange={(e) => updateRow(index, { tipo: e.target.value })}
                      className={`${patrimonioFieldClass(Boolean(errors.tipo))} min-w-[8rem]`}
                    >
                      <option value="">—</option>
                      {options.tipoPatrimonio.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </PatrimonioCell>
                  <PatrimonioCell>
                    {isCryptoTipo(row.tipo) ? (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.unidades ?? ""}
                        placeholder="Unidades BTC"
                        onChange={(e) => updateRow(index, { unidades: e.target.value })}
                        className={`${patrimonioFieldClass(Boolean(errors.unidades))} min-w-[6rem]`}
                      />
                    ) : usesPropiedad(row.tipo) ? (
                      <>
                        <input
                          type="text"
                          list={`propiedad-list-${index}`}
                          value={row.propiedad ?? ""}
                          placeholder="Propiedad"
                          onChange={(e) => updateRow(index, { propiedad: e.target.value })}
                          className={`${patrimonioFieldClass(false)} min-w-[6rem]`}
                        />
                        <datalist id={`propiedad-list-${index}`}>
                          {options.propiedadesPatrimonio.map((p) => (
                            <option key={p} value={p} />
                          ))}
                        </datalist>
                      </>
                    ) : (
                      <PatrimonioPlaceholder />
                    )}
                  </PatrimonioCell>
                  <PatrimonioCell>
                    {usesPropiedad(row.tipo) ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={row.porcentaje ?? ""}
                        placeholder="100"
                        onChange={(e) => updateRow(index, { porcentaje: e.target.value })}
                        className={`${patrimonioFieldClass(Boolean(errors.porcentaje))} min-w-[4.5rem]`}
                      />
                    ) : (
                      <PatrimonioPlaceholder />
                    )}
                  </PatrimonioCell>
                  <PatrimonioCell>
                    <select
                      value={row.persona}
                      onChange={(e) =>
                        updateRow(index, { persona: e.target.value as PersonaValue | "" })
                      }
                      className={`${patrimonioFieldClass(Boolean(errors.persona))} min-w-[6rem]`}
                    >
                      <option value="">({defaultPersonaField || "def."})</option>
                      {PERSONA_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </PatrimonioCell>
                  <PatrimonioCell>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="text-xs leading-none text-muted hover:text-expense"
                      >
                        Quitar
                      </button>
                    )}
                  </PatrimonioCell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
        >
          + Añadir línea
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted">
            {validCount} líneas · neto {formatEur(netPreview)}
            {hasPartialErrors && " · revisa los errores"}
          </span>
          <button
            type="button"
            disabled={saving || validCount === 0 || Boolean(fechaError)}
            onClick={handleSavePatrimonioClick}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Guardando…" : `Guardar snapshot (${validCount})`}
          </button>
        </div>
      </div>

      {todayConfirmOpen && (
        <TodayDateConfirmModal
          onCancel={() => setTodayConfirmOpen(false)}
          onConfirm={() => void proceedSavePatrimonio()}
        />
      )}

      <InsertRecentLog
        table="Patrimonio"
        persona={defaultPersonaField}
        categoria={rows[0]?.tipo ?? ""}
        refreshKey={logRefreshKey}
        options={options}
      />
    </div>
  );
}

export function ManualInsertPanel({
  defaultPersona,
  onInserted,
}: ManualInsertPanelProps) {
  const [activeTab, setActiveTab] = useState<InsertTable>("Gastos");
  const [options, setOptions] = useState<ManualInsertOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [logRefreshKey, setLogRefreshKey] = useState(0);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/manual-insert");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al cargar opciones");
      }
      const json = (await res.json()) as { options: ManualInsertOptions };
      setOptions(json.options);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSuccess("");
    setError("");
    void loadOptions();
  }, [loadOptions]);

  async function handleSaveSimple(
    table: "Gastos" | "Ingresos" | "Inversiones",
    rows: GastosRowInput[] | IngresosRowInput[] | InversionesRowInput[],
  ): Promise<boolean> {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/manual-insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, rows }),
      });
      const json = (await res.json()) as { error?: string; inserted?: number };
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      const count = json.inserted ?? 0;
      setSuccess(
        count === 1 ? "1 registro insertado correctamente" : `${count} registros insertados correctamente`,
      );
      setLogRefreshKey((k) => k + 1);
      onInserted?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePatrimonio(payload: {
    fecha: string;
    defaultPersona: PersonaValue | "";
    rows: PatrimonioRowInput[];
  }): Promise<boolean> {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/manual-insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "Patrimonio",
          fecha: payload.fecha,
          defaultPersona: payload.defaultPersona,
          rows: payload.rows,
        }),
      });
      const json = (await res.json()) as { error?: string; inserted?: number };
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      const count = json.inserted ?? 0;
      setSuccess(
        count === 1
          ? "Snapshot guardado (1 línea)"
          : `Snapshot guardado (${count} líneas)`,
      );
      setLogRefreshKey((k) => k + 1);
      onInserted?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleLoadPatrimonioTemplate(): Promise<PatrimonioRowInput[] | null> {
    setLoadingTemplate(true);
    setError("");
    try {
      const res = await fetch("/api/manual-insert?template=last-patrimonio");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al cargar plantilla");
      }
      const json = (await res.json()) as {
        patrimonioTemplate: { rows: PatrimonioRowInput[] } | null;
      };
      if (!json.patrimonioTemplate) {
        setError("No hay snapshot anterior para usar como plantilla");
        return null;
      }
      setSuccess("Plantilla cargada — actualiza valores y fecha del nuevo snapshot");
      return json.patrimonioTemplate.rows;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar plantilla");
      return null;
    } finally {
      setLoadingTemplate(false);
    }
  }

  async function handleFetchGastosPlantillas() {
    const res = await fetch("/api/manual-insert?template=gastos-plantillas");
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      throw new Error(body.error ?? "Error al cargar plantillas");
    }
    const json = (await res.json()) as { gastosPlantillas: GastosPlantillaSummary[] | null };
    return json.gastosPlantillas ?? [];
  }

  async function handleExpandGastosPlantilla(
    plantillaId: string,
    month: string,
  ): Promise<GastosRowInput[] | null> {
    const params = new URLSearchParams({
      template: "gastos-plantilla",
      plantillaId,
      month,
    });
    const res = await fetch(`/api/manual-insert?${params}`);
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      throw new Error(body.error ?? "Error al cargar plantilla");
    }
    const json = (await res.json()) as { gastosPlantillaRows: GastosRowInput[] | null };
    return json.gastosPlantillaRows;
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-border py-3">
        <h2 className="text-lg font-semibold">Insertar registros</h2>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSuccess("");
                setError("");
              }}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="py-4">
        {loading && <p className="text-sm text-muted">Cargando opciones…</p>}
        {error && (
          <p className="mb-3 rounded-lg border border-expense/30 bg-expense/10 px-3 py-2 text-sm text-expense">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-3 rounded-lg border border-income/30 bg-income/10 px-3 py-2 text-sm text-income">
            {success}
          </p>
        )}

        {!loading && options && activeTab !== "Patrimonio" && (
          <SimpleInsertForm
            key={activeTab}
            table={activeTab}
            options={options}
            defaultPersona={defaultPersona}
            saving={saving}
            logRefreshKey={logRefreshKey}
            onSave={(rows) => handleSaveSimple(activeTab, rows)}
            onPlantillaLoaded={(message) => {
              setError("");
              setSuccess(message);
            }}
            onPlantillaError={(message) => {
              setSuccess("");
              setError(message);
            }}
            onFetchPlantillas={activeTab === "Gastos" ? handleFetchGastosPlantillas : undefined}
            onExpandPlantilla={activeTab === "Gastos" ? handleExpandGastosPlantilla : undefined}
          />
        )}

        {!loading && options && activeTab === "Patrimonio" && (
          <PatrimonioInsertForm
            options={options}
            defaultPersona={defaultPersona}
            saving={saving}
            logRefreshKey={logRefreshKey}
            onSave={handleSavePatrimonio}
            onLoadTemplate={handleLoadPatrimonioTemplate}
            loadingTemplate={loadingTemplate}
          />
        )}
      </div>
    </div>
  );
}
