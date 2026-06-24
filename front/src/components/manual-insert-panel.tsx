"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  isGastosRowValid,
  isIngresosRowValid,
  isInversionesRowValid,
  patrimonioNetPreview,
  validateDate,
  validateGastosRow,
  validateIngresosRow,
  validateInversionesRow,
  validatePatrimonioRow,
} from "@/lib/manual-insert/validation";
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
  };
}

function fieldClass(hasError: boolean): string {
  return `rounded-md border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${
    hasError
      ? "border-expense focus:ring-expense"
      : "border-border focus:ring-accent"
  }`;
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
  onSave: (rows: GastosRowInput[] | IngresosRowInput[] | InversionesRowInput[]) => void;
}

function SimpleInsertForm({
  table,
  options,
  defaultPersona,
  saving,
  onSave,
}: SimpleInsertFormProps) {
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

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Añade una o varias filas. La validación es inmediata; solo se guardan las filas completas.
      </p>

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
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
        >
          + Añadir fila
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            {validCount} {validCount === 1 ? "fila lista" : "filas listas"}
            {hasPartialErrors && " · revisa los errores"}
          </span>
          <button
            type="button"
            disabled={saving || validCount === 0 || hasPartialErrors}
            onClick={() => onSave(rows as never)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Guardando…" : `Guardar ${validCount || ""}`}
          </button>
        </div>
      </div>
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
        <input
          type="date"
          value={row.fecha}
          onChange={(e) => onChange({ fecha: e.target.value })}
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
      <RowField label="Destino">
        <input
          type="text"
          value={row.destino}
          onChange={(e) => onChange({ destino: e.target.value })}
          className={fieldClass(false)}
        />
      </RowField>
      <RowField label="Fuente">
        <select
          value={row.fuente}
          onChange={(e) => onChange({ fuente: e.target.value })}
          className={fieldClass(false)}
        >
          <option value="">—</option>
          {options.fuenteGastos.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </RowField>
      <RowField label="Categoría">
        <select
          value={row.categoria}
          onChange={(e) => onChange({ categoria: e.target.value })}
          className={fieldClass(false)}
        >
          <option value="">—</option>
          {options.categoriaGastos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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
        <input
          type="date"
          value={row.fecha}
          onChange={(e) => onChange({ fecha: e.target.value })}
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
      <RowField label="Origen">
        <select
          value={row.origen}
          onChange={(e) => onChange({ origen: e.target.value })}
          className={fieldClass(false)}
        >
          <option value="">—</option>
          {options.origenIngresos.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </RowField>
      <RowField label="Categoría">
        <select
          value={row.categoria}
          onChange={(e) => onChange({ categoria: e.target.value })}
          className={fieldClass(false)}
        >
          <option value="">—</option>
          {options.categoriaIngresos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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
        <input
          type="date"
          value={row.fecha}
          onChange={(e) => onChange({ fecha: e.target.value })}
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
        <select
          value={row.entidad}
          onChange={(e) => onChange({ entidad: e.target.value })}
          className={fieldClass(false)}
        >
          <option value="">—</option>
          {options.entidadInversiones.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </RowField>
    </div>
  );
}

interface PatrimonioInsertFormProps {
  options: ManualInsertOptions;
  defaultPersona: PersonaValue;
  saving: boolean;
  onSave: (payload: {
    fecha: string;
    defaultPersona: PersonaValue | "";
    rows: PatrimonioRowInput[];
  }) => void;
  onLoadTemplate: () => Promise<PatrimonioRowInput[] | null>;
  loadingTemplate: boolean;
}

function PatrimonioInsertForm({
  options,
  defaultPersona,
  saving,
  onSave,
  onLoadTemplate,
  loadingTemplate,
}: PatrimonioInsertFormProps) {
  const [fecha, setFecha] = useState(todayIso());
  const [defaultPersonaField, setDefaultPersonaField] = useState<PersonaValue | "">(
    defaultPersona,
  );
  const [rows, setRows] = useState<PatrimonioRowInput[]>(() => [
    emptyPatrimonioRow(),
    emptyPatrimonioRow(),
    emptyPatrimonioRow(),
  ]);

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

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Guarda un snapshot completo: todas las filas comparten la misma fecha. Usa valores negativos
        para deudas (p. ej. hipoteca).
      </p>

      <div className="grid gap-3 rounded-lg border border-border bg-background/40 p-3 sm:grid-cols-3">
        <RowField label="Fecha del snapshot" error={fechaError}>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
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
              <th className="px-2 py-2 font-medium">Entidad</th>
              <th className="px-2 py-2 font-medium">Nombre</th>
              <th className="px-2 py-2 font-medium">Valor</th>
              <th className="px-2 py-2 font-medium">Tipo</th>
              <th className="px-2 py-2 font-medium">Persona</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const errors = rowErrors[index] ?? {};
              return (
                <tr key={`pat-${index}`} className="border-b border-border/70 align-top">
                  <td className="px-2 py-2">
                    <input
                      list={`entidad-list-${index}`}
                      value={row.entidad}
                      onChange={(e) => updateRow(index, { entidad: e.target.value })}
                      className={`${fieldClass(false)} w-full min-w-[7rem]`}
                    />
                    <datalist id={`entidad-list-${index}`}>
                      {options.entidadPatrimonio.map((e) => (
                        <option key={e} value={e} />
                      ))}
                    </datalist>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.nombre}
                      onChange={(e) => updateRow(index, { nombre: e.target.value })}
                      className={`${fieldClass(Boolean(errors.nombre))} w-full min-w-[8rem]`}
                    />
                    <FieldError message={errors.nombre} />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.valor}
                      onChange={(e) => updateRow(index, { valor: e.target.value })}
                      className={`${fieldClass(Boolean(errors.valor))} w-full min-w-[6rem]`}
                    />
                    <FieldError message={errors.valor} />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.tipo}
                      onChange={(e) => updateRow(index, { tipo: e.target.value })}
                      className={`${fieldClass(Boolean(errors.tipo))} w-full min-w-[8rem]`}
                    >
                      <option value="">—</option>
                      {options.tipoPatrimonio.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <FieldError message={errors.tipo} />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.persona}
                      onChange={(e) =>
                        updateRow(index, { persona: e.target.value as PersonaValue | "" })
                      }
                      className={`${fieldClass(Boolean(errors.persona))} w-full min-w-[6rem]`}
                    >
                      <option value="">({defaultPersonaField || "def."})</option>
                      {PERSONA_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <FieldError message={errors.persona} />
                  </td>
                  <td className="px-2 py-2">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="text-xs text-muted hover:text-expense"
                      >
                        Quitar
                      </button>
                    )}
                  </td>
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
            disabled={saving || validCount === 0 || Boolean(fechaError) || hasPartialErrors}
            onClick={() => onSave({ fecha, defaultPersona: defaultPersonaField, rows })}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Guardando…" : `Guardar snapshot (${validCount})`}
          </button>
        </div>
      </div>
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
  ) {
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
      setSuccess(`${json.inserted ?? 0} registro(s) guardado(s)`);
      onInserted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePatrimonio(payload: {
    fecha: string;
    defaultPersona: PersonaValue | "";
    rows: PatrimonioRowInput[];
  }) {
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
      setSuccess(`Snapshot guardado (${json.inserted ?? 0} líneas)`);
      onInserted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
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
        {error && <p className="mb-3 text-sm text-expense">{error}</p>}
        {success && <p className="mb-3 text-sm text-income">{success}</p>}

        {!loading && options && activeTab !== "Patrimonio" && (
          <SimpleInsertForm
            key={activeTab}
            table={activeTab}
            options={options}
            defaultPersona={defaultPersona}
            saving={saving}
            onSave={(rows) => void handleSaveSimple(activeTab, rows)}
          />
        )}

        {!loading && options && activeTab === "Patrimonio" && (
          <PatrimonioInsertForm
            options={options}
            defaultPersona={defaultPersona}
            saving={saving}
            onSave={(payload) => void handleSavePatrimonio(payload)}
            onLoadTemplate={handleLoadPatrimonioTemplate}
            loadingTemplate={loadingTemplate}
          />
        )}
      </div>
    </div>
  );
}
