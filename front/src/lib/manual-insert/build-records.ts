import { TABLES } from "../config";
import { buildRecord, pickSelectValue, type SelectOptionsMap } from "../table-select-options";
import type { NocoRecord } from "../types";
import type {
  GastosRowInput,
  IngresosRowInput,
  InsertTable,
  InversionesRowInput,
  PatrimonioRowInput,
  PersonaValue,
} from "./types";
import {
  isGastosRowValid,
  isIngresosRowValid,
  isInversionesRowValid,
  isPatrimonioRowValid,
} from "./validation";

export function tableIdForInsert(table: InsertTable): string {
  if (table === "Gastos") return TABLES.gastos;
  if (table === "Ingresos") return TABLES.ingresos;
  if (table === "Inversiones") return TABLES.inversiones;
  return TABLES.patrimonio;
}

function parseNumber(value: string): number {
  return Number(value.replace(",", "."));
}

export function buildGastosRecord(
  row: GastosRowInput,
  options: SelectOptionsMap,
): NocoRecord {
  return buildRecord({
    Date: row.fecha,
    Cantidad: parseNumber(row.cantidad),
    Destino: row.destino.trim() || undefined,
    Fuente: pickSelectValue("Fuente", row.fuente, options),
    Persona: pickSelectValue("Persona", row.persona, options),
    Categoría: pickSelectValue("Categoría", row.categoria, options),
  });
}

export function buildIngresosRecord(
  row: IngresosRowInput,
  options: SelectOptionsMap,
): NocoRecord {
  return buildRecord({
    Fecha: row.fecha,
    Ingreso: parseNumber(row.ingreso),
    Origen: pickSelectValue("Origen", row.origen, options),
    Persona: pickSelectValue("Persona", row.persona, options),
    Categoría: pickSelectValue("Categoría", row.categoria, options),
  });
}

export function buildInversionesRecord(
  row: InversionesRowInput,
  options: SelectOptionsMap,
): NocoRecord {
  return buildRecord({
    Fecha: row.fecha,
    Importe: parseNumber(row.importe),
    Nombre: row.nombre.trim(),
    Tipo: pickSelectValue("Tipo", row.tipo, options),
    Entidad:
      pickSelectValue("Entidad", row.entidad, options) ??
      (row.entidad.trim() || undefined),
    Persona: pickSelectValue("Persona", row.persona, options),
  });
}

export interface PatrimonioComputed {
  /** Valor en € ya calculado (p. ej. unidades BTC × cotización). */
  valor?: number;
  /** Contenido para la columna JSON `Detalle`. */
  detalle?: Record<string, unknown>;
}

export function buildPatrimonioRecord(
  fecha: string,
  row: PatrimonioRowInput,
  defaultPersona: PersonaValue | "",
  options: SelectOptionsMap,
  computed?: PatrimonioComputed,
): NocoRecord {
  const persona = (row.persona || defaultPersona) as PersonaValue;
  const valor = computed?.valor ?? parseNumber(row.valor);
  const record = buildRecord({
    Fecha: fecha,
    Valor: valor,
    Nombre: row.nombre.trim(),
    Tipo: pickSelectValue("Tipo", row.tipo, options),
    Entidad:
      pickSelectValue("Entidad", row.entidad, options) ??
      (row.entidad.trim() || undefined),
    Persona: pickSelectValue("Persona", persona, options),
  });
  if (computed?.detalle && Object.keys(computed.detalle).length > 0) {
    record.Detalle = JSON.stringify(computed.detalle);
  }
  return record;
}

export function buildRecordsFromRows(
  table: InsertTable,
  rows: GastosRowInput[] | IngresosRowInput[] | InversionesRowInput[],
  options: SelectOptionsMap,
): NocoRecord[] {
  if (table === "Gastos") {
    return (rows as GastosRowInput[])
      .filter(isGastosRowValid)
      .map((row) => buildGastosRecord(row, options));
  }
  if (table === "Ingresos") {
    return (rows as IngresosRowInput[])
      .filter(isIngresosRowValid)
      .map((row) => buildIngresosRecord(row, options));
  }
  return (rows as InversionesRowInput[])
    .filter(isInversionesRowValid)
    .map((row) => buildInversionesRecord(row, options));
}

export function buildPatrimonioRecords(
  fecha: string,
  rows: PatrimonioRowInput[],
  defaultPersona: PersonaValue | "",
  options: SelectOptionsMap,
): NocoRecord[] {
  return rows
    .filter((row) => isPatrimonioRowValid(row, defaultPersona))
    .map((row) => buildPatrimonioRecord(fecha, row, defaultPersona, options));
}
