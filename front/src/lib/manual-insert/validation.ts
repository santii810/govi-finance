import type {
  FieldErrors,
  GastosRowInput,
  IngresosRowInput,
  InversionesRowInput,
  PatrimonioRowInput,
  PatrimonioSnapshotInput,
  PersonaValue,
} from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isBlank(value: string): boolean {
  return value.trim() === "";
}

export function rowHasAnyValue(values: string[]): boolean {
  return values.some((v) => !isBlank(v));
}

export function validateDate(value: string, label = "Fecha"): string | undefined {
  if (isBlank(value)) return `${label} obligatoria`;
  if (!DATE_RE.test(value)) return `${label} no válida`;
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return `${label} no válida`;
  return undefined;
}

export function validatePersona(value: PersonaValue | ""): string | undefined {
  if (!value) return "Persona obligatoria";
  return undefined;
}

export function validatePositiveAmount(value: string, label = "Importe"): string | undefined {
  if (isBlank(value)) return `${label} obligatorio`;
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return `${label} no válido`;
  if (n <= 0) return `${label} debe ser mayor que 0`;
  return undefined;
}

export function validateSignedAmount(value: string, label = "Valor"): string | undefined {
  if (isBlank(value)) return `${label} obligatorio`;
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return `${label} no válido`;
  if (n === 0) return `${label} no puede ser 0`;
  return undefined;
}

export function validateNonZeroAmount(value: string, label = "Importe"): string | undefined {
  if (isBlank(value)) return `${label} obligatorio`;
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return `${label} no válido`;
  if (n === 0) return `${label} no puede ser 0`;
  return undefined;
}

export function validateGastosRow(row: GastosRowInput): FieldErrors {
  const touched = rowHasAnyValue([
    row.fecha,
    row.cantidad,
    row.destino,
    row.fuente,
    row.categoria,
    row.persona,
  ]);
  if (!touched) return {};

  const errors: FieldErrors = {};
  const fechaErr = validateDate(row.fecha);
  if (fechaErr) errors.fecha = fechaErr;
  const cantErr = validatePositiveAmount(row.cantidad, "Cantidad");
  if (cantErr) errors.cantidad = cantErr;
  const personaErr = validatePersona(row.persona);
  if (personaErr) errors.persona = personaErr;
  return errors;
}

export function isGastosRowValid(row: GastosRowInput): boolean {
  const errors = validateGastosRow(row);
  return rowHasAnyValue([row.fecha, row.cantidad, row.destino, row.fuente, row.categoria, row.persona])
    && Object.keys(errors).length === 0;
}

export function validateIngresosRow(row: IngresosRowInput): FieldErrors {
  const touched = rowHasAnyValue([
    row.fecha,
    row.ingreso,
    row.origen,
    row.categoria,
    row.persona,
  ]);
  if (!touched) return {};

  const errors: FieldErrors = {};
  const fechaErr = validateDate(row.fecha);
  if (fechaErr) errors.fecha = fechaErr;
  const ingErr = validatePositiveAmount(row.ingreso, "Ingreso");
  if (ingErr) errors.ingreso = ingErr;
  const personaErr = validatePersona(row.persona);
  if (personaErr) errors.persona = personaErr;
  return errors;
}

export function isIngresosRowValid(row: IngresosRowInput): boolean {
  const errors = validateIngresosRow(row);
  return rowHasAnyValue([row.fecha, row.ingreso, row.origen, row.categoria, row.persona])
    && Object.keys(errors).length === 0;
}

export function validateInversionesRow(row: InversionesRowInput): FieldErrors {
  const touched = rowHasAnyValue([
    row.fecha,
    row.importe,
    row.nombre,
    row.tipo,
    row.entidad,
    row.persona,
  ]);
  if (!touched) return {};

  const errors: FieldErrors = {};
  const fechaErr = validateDate(row.fecha);
  if (fechaErr) errors.fecha = fechaErr;
  const importeErr = validateNonZeroAmount(row.importe, "Importe");
  if (importeErr) errors.importe = importeErr;
  if (isBlank(row.nombre)) errors.nombre = "Nombre obligatorio";
  const personaErr = validatePersona(row.persona);
  if (personaErr) errors.persona = personaErr;
  return errors;
}

export function isInversionesRowValid(row: InversionesRowInput): boolean {
  const errors = validateInversionesRow(row);
  return rowHasAnyValue([row.fecha, row.importe, row.nombre, row.tipo, row.entidad, row.persona])
    && Object.keys(errors).length === 0;
}

export function validatePatrimonioRow(
  row: PatrimonioRowInput,
  defaultPersona: PersonaValue | "",
): FieldErrors {
  const persona = row.persona || defaultPersona;
  const touched = rowHasAnyValue([row.entidad, row.nombre, row.valor, row.tipo, row.persona]);
  if (!touched) return {};

  const errors: FieldErrors = {};
  if (isBlank(row.nombre)) errors.nombre = "Nombre obligatorio";
  const valorErr = validateSignedAmount(row.valor, "Valor");
  if (valorErr) errors.valor = valorErr;
  if (isBlank(row.tipo)) errors.tipo = "Tipo obligatorio";
  const personaErr = validatePersona(persona);
  if (personaErr) errors.persona = personaErr;
  return errors;
}

export function isPatrimonioRowValid(
  row: PatrimonioRowInput,
  defaultPersona: PersonaValue | "",
): boolean {
  const errors = validatePatrimonioRow(row, defaultPersona);
  const persona = row.persona || defaultPersona;
  return rowHasAnyValue([row.entidad, row.nombre, row.valor, row.tipo, persona])
    && Object.keys(errors).length === 0;
}

export function validatePatrimonioSnapshot(snapshot: PatrimonioSnapshotInput): {
  fechaError?: string;
  rowErrors: FieldErrors[];
} {
  const fechaError = validateDate(snapshot.fecha);
  const rowErrors = snapshot.rows.map((row) =>
    validatePatrimonioRow(row, snapshot.defaultPersona),
  );
  return { fechaError, rowErrors };
}

export function countValidPatrimonioRows(snapshot: PatrimonioSnapshotInput): number {
  return snapshot.rows.filter((row) =>
    isPatrimonioRowValid(row, snapshot.defaultPersona),
  ).length;
}

export function patrimonioNetPreview(snapshot: PatrimonioSnapshotInput): number {
  return snapshot.rows.reduce((sum, row) => {
    if (!isPatrimonioRowValid(row, snapshot.defaultPersona)) return sum;
    return sum + Number(row.valor.replace(",", "."));
  }, 0);
}
