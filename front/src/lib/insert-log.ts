import { TABLES } from "./config";
import { ensureSelectOptions } from "./ensure-select-options";
import {
  buildGastosRecord,
  buildIngresosRecord,
  buildInversionesRecord,
  buildPatrimonioRecord,
  tableIdForInsert,
} from "./manual-insert/build-records";
import type {
  GastosRowInput,
  IngresosRowInput,
  InsertTable,
  InversionesRowInput,
  ManualInsertOptions,
  PatrimonioRowInput,
  PersonaValue,
} from "./manual-insert/types";
import {
  isGastosRowValid,
  isIngresosRowValid,
  isInversionesRowValid,
  isPatrimonioRowValid,
  validateDate,
} from "./manual-insert/validation";
import { loadManualInsertOptions } from "./manual-insert/service";
import type { NocoDbClient } from "./nocodb";
import { isVisible, personaFilter } from "./persona";
import { parseSelectOptions } from "./table-select-options";
import type { NocoRecord, Persona } from "./types";

export type LogTableType = InsertTable;

export interface LogEntry {
  id: string;
  tableType: LogTableType;
  createdAt: string;
  fecha: string;
  persona: string;
  categoria: string | null;
  concepto: string;
  importe: number;
  fuente?: string;
  origen?: string;
  destino?: string;
  tipo?: string;
  nombre?: string;
  entidad?: string;
}

export interface InsertLogPayload {
  entries: LogEntry[];
  categories: string[];
  options: ManualInsertOptions;
  hasMore: boolean;
}

export class InsertLogError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "InsertLogError";
  }
}

const PER_TABLE_LIMIT = 100;
const MERGED_LIMIT = 200;

const TABLE_QUERIES: Record<
  LogTableType,
  { tableId: string; fields: string[]; dateField: string; categoryField: string | null }
> = {
  Gastos: {
    tableId: TABLES.gastos,
    fields: ["Id", "Date", "Cantidad", "Destino", "Fuente", "Persona", "Categoría", "CreatedAt"],
    dateField: "Date",
    categoryField: "Categoría",
  },
  Ingresos: {
    tableId: TABLES.ingresos,
    fields: ["Id", "Fecha", "Ingreso", "Origen", "Persona", "Categoría", "CreatedAt"],
    dateField: "Fecha",
    categoryField: "Categoría",
  },
  Inversiones: {
    tableId: TABLES.inversiones,
    fields: ["Id", "Fecha", "Importe", "Nombre", "Tipo", "Entidad", "Persona", "CreatedAt"],
    dateField: "Fecha",
    categoryField: "Tipo",
  },
  Patrimonio: {
    tableId: TABLES.patrimonio,
    fields: ["Id", "Fecha", "Valor", "Nombre", "Tipo", "Entidad", "Persona", "CreatedAt"],
    dateField: "Fecha",
    categoryField: "Tipo",
  },
};

function parseCreatedAt(value: unknown): string {
  if (!value) return "";
  return String(value);
}

function parseLogEntry(tableType: LogTableType, record: NocoRecord): LogEntry | null {
  const id = String(record.Id ?? "");
  if (!id) return null;

  const createdAt = parseCreatedAt(record.CreatedAt);
  const persona = String(record.Persona ?? "");

  if (tableType === "Gastos") {
    return {
      id,
      tableType,
      createdAt,
      fecha: String(record.Date ?? "").slice(0, 10),
      persona,
      categoria: record.Categoría ? String(record.Categoría) : null,
      concepto: String(record.Destino ?? "").trim() || "—",
      importe: Number(record.Cantidad ?? 0),
      destino: String(record.Destino ?? ""),
      fuente: String(record.Fuente ?? ""),
    };
  }

  if (tableType === "Ingresos") {
    return {
      id,
      tableType,
      createdAt,
      fecha: String(record.Fecha ?? "").slice(0, 10),
      persona,
      categoria: record.Categoría ? String(record.Categoría) : null,
      concepto: String(record.Origen ?? "").trim() || "—",
      importe: Number(record.Ingreso ?? 0),
      origen: String(record.Origen ?? ""),
    };
  }

  if (tableType === "Inversiones") {
    return {
      id,
      tableType,
      createdAt,
      fecha: String(record.Fecha ?? "").slice(0, 10),
      persona,
      categoria: record.Tipo ? String(record.Tipo) : null,
      concepto: String(record.Nombre ?? "").trim() || "—",
      importe: Number(record.Importe ?? 0),
      nombre: String(record.Nombre ?? ""),
      tipo: String(record.Tipo ?? ""),
      entidad: String(record.Entidad ?? ""),
    };
  }

  return {
    id,
    tableType,
    createdAt,
    fecha: String(record.Fecha ?? "").slice(0, 10),
    persona,
    categoria: record.Tipo ? String(record.Tipo) : null,
    concepto: String(record.Nombre ?? "").trim() || "—",
    importe: Number(record.Valor ?? 0),
    nombre: String(record.Nombre ?? ""),
    tipo: String(record.Tipo ?? ""),
    entidad: String(record.Entidad ?? ""),
  };
}

function buildCategoryWhere(categoryField: string, value: string): string {
  return `(${categoryField},eq,${value})`;
}

function combineWhere(...parts: (string | undefined)[]): string | undefined {
  const filtered = parts.filter((part): part is string => Boolean(part));
  if (filtered.length === 0) return undefined;
  if (filtered.length === 1) return filtered[0];
  return filtered.join("~and");
}

async function fetchTableEntries(
  client: NocoDbClient,
  tableType: LogTableType,
  persona: Persona,
  filters: {
    categoria?: string;
    personaRegistro?: PersonaValue;
    sortBy?: "createdAt" | "fecha";
    limit?: number;
    offset?: number;
  },
): Promise<LogEntry[]> {
  const config = TABLE_QUERIES[tableType];
  const where = combineWhere(
    filters.personaRegistro
      ? `(Persona,eq,${filters.personaRegistro})`
      : personaFilter(persona),
    filters.categoria && config.categoryField
      ? buildCategoryWhere(config.categoryField, filters.categoria)
      : undefined,
  );

  const sort = filters.sortBy === "fecha" ? `-${config.dateField}` : "-CreatedAt";

  const records = await client.listRecords(config.tableId, {
    fields: config.fields,
    sort,
    limit: filters.limit ?? PER_TABLE_LIMIT,
    offset: filters.offset ?? 0,
    where,
  });

  return records
    .map((record) => parseLogEntry(tableType, record))
    .filter((entry): entry is LogEntry => entry !== null);
}

function uniqueCategories(entries: LogEntry[], options: ManualInsertOptions): string[] {
  const set = new Set<string>();
  for (const value of [
    ...options.categoriaGastos,
    ...options.categoriaIngresos,
    ...options.tipoInversiones,
    ...options.tipoPatrimonio,
  ]) {
    if (value.trim()) set.add(value);
  }
  for (const entry of entries) {
    if (entry.categoria?.trim()) set.add(entry.categoria);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export async function loadInsertLog(
  client: NocoDbClient,
  persona: Persona,
  filters: {
    tipo?: LogTableType;
    categoria?: string;
    personaRegistro?: PersonaValue;
    sortBy?: "createdAt" | "fecha";
    limit?: number;
    offset?: number;
  },
): Promise<InsertLogPayload> {
  const tables: LogTableType[] = filters.tipo
    ? [filters.tipo]
    : ["Gastos", "Ingresos", "Inversiones", "Patrimonio"];

  const limit = filters.limit ?? MERGED_LIMIT;
  const offset = filters.offset ?? 0;

  if (tables.length === 1) {
    const [options, rows] = await Promise.all([
      loadManualInsertOptions(client),
      fetchTableEntries(client, tables[0], persona, {
        categoria: filters.categoria,
        personaRegistro: filters.personaRegistro,
        sortBy: filters.sortBy,
        limit: limit + 1,
        offset,
      }),
    ]);

    return {
      entries: rows.slice(0, limit),
      categories: uniqueCategories(rows, options),
      options,
      hasMore: rows.length > limit,
    };
  }

  const perTableLimit = Math.max(limit + offset, Math.ceil((limit + offset) / tables.length));

  const [options, ...tableResults] = await Promise.all([
    loadManualInsertOptions(client),
    ...tables.map((tableType) =>
      fetchTableEntries(client, tableType, persona, {
        categoria: filters.categoria,
        personaRegistro: filters.personaRegistro,
        sortBy: filters.sortBy,
        limit: perTableLimit,
      }),
    ),
  ]);

  const entries = tableResults.flat();
  if (filters.sortBy === "fecha") {
    entries.sort((a, b) => b.fecha.localeCompare(a.fecha));
  } else {
    entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const page = entries.slice(offset, offset + limit);

  return {
    entries: page,
    categories: uniqueCategories(entries, options),
    options,
    hasMore: entries.length > offset + limit,
  };
}

export type LogUpdateBody =
  | { tableType: "Gastos"; row: GastosRowInput }
  | { tableType: "Ingresos"; row: IngresosRowInput }
  | { tableType: "Inversiones"; row: InversionesRowInput }
  | { tableType: "Patrimonio"; fecha: string; row: PatrimonioRowInput };

async function getSelectOptions(client: NocoDbClient, table: InsertTable) {
  const tableId = tableIdForInsert(table);
  const meta = await client.getTableMeta(tableId);
  return parseSelectOptions(meta.columns ?? []);
}

async function ensureUpdateSelectOptions(
  client: NocoDbClient,
  body: LogUpdateBody,
): Promise<void> {
  const tableId = tableIdForInsert(body.tableType);

  if (body.tableType === "Gastos") {
    const { categoria } = body.row;
    if (categoria.trim()) await ensureSelectOptions(client, tableId, "Categoría", [categoria]);
    return;
  }

  if (body.tableType === "Ingresos") {
    const { categoria, origen } = body.row;
    if (categoria.trim()) await ensureSelectOptions(client, tableId, "Categoría", [categoria]);
    if (origen.trim()) await ensureSelectOptions(client, tableId, "Origen", [origen]);
    return;
  }

  if (body.tableType === "Inversiones") {
    const { tipo, entidad } = body.row;
    if (tipo.trim()) await ensureSelectOptions(client, tableId, "Tipo", [tipo]);
    if (entidad.trim()) await ensureSelectOptions(client, tableId, "Entidad", [entidad]);
    return;
  }

  const { tipo, entidad } = body.row;
  if (tipo.trim()) await ensureSelectOptions(client, tableId, "Tipo", [tipo]);
  if (entidad.trim()) await ensureSelectOptions(client, tableId, "Entidad", [entidad]);
}

export async function updateLogEntry(
  client: NocoDbClient,
  tableType: LogTableType,
  id: string,
  body: LogUpdateBody,
  persona: Persona,
): Promise<LogEntry> {
  if (body.tableType !== tableType) {
    throw new InsertLogError("Tipo de registro no coincide", 400);
  }

  const tableId = tableIdForInsert(tableType);
  const existing = await client.getRecord(tableId, id);
  if (!existing || !isVisible(existing.Persona, persona)) {
    throw new InsertLogError("Registro no encontrado", 404);
  }

  await ensureUpdateSelectOptions(client, body);
  const options = await getSelectOptions(client, tableType);

  let fields: NocoRecord;

  if (body.tableType === "Gastos") {
    const { row } = body;
    if (!isGastosRowValid(row)) {
      throw new InsertLogError("Datos incompletos o no válidos", 422);
    }
    const dateErr = validateDate(row.fecha);
    if (dateErr) throw new InsertLogError(dateErr, 422);
    fields = buildGastosRecord(row, options);
  } else if (body.tableType === "Ingresos") {
    const { row } = body;
    if (!isIngresosRowValid(row)) {
      throw new InsertLogError("Datos incompletos o no válidos", 422);
    }
    const dateErr = validateDate(row.fecha);
    if (dateErr) throw new InsertLogError(dateErr, 422);
    fields = buildIngresosRecord(row, options);
  } else if (body.tableType === "Inversiones") {
    const { row } = body;
    if (!isInversionesRowValid(row)) {
      throw new InsertLogError("Datos incompletos o no válidos", 422);
    }
    const dateErr = validateDate(row.fecha);
    if (dateErr) throw new InsertLogError(dateErr, 422);
    fields = buildInversionesRecord(row, options);
  } else {
    const { fecha, row } = body;
    const persona = (row.persona || "Santi") as PersonaValue;
    if (!isPatrimonioRowValid(row, persona)) {
      throw new InsertLogError("Datos incompletos o no válidos", 422);
    }
    const dateErr = validateDate(fecha);
    if (dateErr) throw new InsertLogError(dateErr, 422);
    fields = buildPatrimonioRecord(fecha, row, persona, options);
    if (existing.Detalle) {
      fields.Detalle = existing.Detalle;
    }
  }

  await client.updateRecord(tableId, id, fields);

  const updated = await client.getRecord(tableId, id);
  if (!updated) {
    throw new InsertLogError("No se pudo recargar el registro", 500);
  }

  const entry = parseLogEntry(tableType, updated);
  if (!entry) {
    throw new InsertLogError("Registro actualizado con formato inesperado", 500);
  }
  return entry;
}

export async function deleteLogEntry(
  client: NocoDbClient,
  tableType: LogTableType,
  id: string,
  persona: Persona,
): Promise<void> {
  const tableId = tableIdForInsert(tableType);
  const existing = await client.getRecord(tableId, id);
  if (!existing || !isVisible(existing.Persona, persona)) {
    throw new InsertLogError("Registro no encontrado", 404);
  }
  await client.deleteRecord(tableId, id);
}

export function logTableFromSlug(slug: string): LogTableType | null {
  const map: Record<string, LogTableType> = {
    gastos: "Gastos",
    ingresos: "Ingresos",
    inversiones: "Inversiones",
    patrimonio: "Patrimonio",
  };
  return map[slug.toLowerCase()] ?? null;
}
