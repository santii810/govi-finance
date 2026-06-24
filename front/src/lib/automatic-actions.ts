import { TABLES } from "./config";
import {
  classifyMovement,
  loadImportRules,
  parsePendingMovement,
} from "./classifier";
import type { ClassifiedPending, TablaDestino, PersonaValue } from "./import-rules/types";
import { NocoDbClient, NocoDbError } from "./nocodb";
import {
  buildRecord,
  parseSelectOptions,
  pickSelectValue,
  type SelectOptionsMap,
} from "./table-select-options";
import type { NocoRecord, Persona } from "./types";

const selectOptionsCache = new Map<string, SelectOptionsMap>();

async function getSelectOptions(client: NocoDbClient, tableId: string): Promise<SelectOptionsMap> {
  const cached = selectOptionsCache.get(tableId);
  if (cached) return cached;

  const meta = await client.getTableMeta(tableId);
  const options = parseSelectOptions(meta.columns ?? []);
  selectOptionsCache.set(tableId, options);
  return options;
}

async function loadClassifiedPending(
  client: NocoDbClient,
  id: string,
  userPersona: Persona,
): Promise<ClassifiedPending> {
  const record = await client.getRecord(TABLES.automaticActions, id);
  if (!record) {
    throw new ActionError("Tarea no encontrada", 404);
  }
  if (String(record.Estado) !== "pending") {
    throw new ActionError("La tarea ya no está pendiente", 409);
  }

  const rules = await loadImportRules(client, userPersona);
  return classifyMovement(parsePendingMovement(record), rules);
}

function deriveEntidad(item: ClassifiedPending): string | undefined {
  return item.entidad?.trim() || item.banco?.trim() || undefined;
}

function buildGastosRecord(item: ClassifiedPending, options: SelectOptionsMap): NocoRecord {
  const cantidad = Math.abs(item.importe);
  return buildRecord({
    Date: item.fecha.slice(0, 10),
    Cantidad: cantidad,
    Destino: item.concepto || undefined,
    Fuente: pickSelectValue("Fuente", item.banco, options),
    Persona: pickSelectValue("Persona", item.persona, options),
    Categoría: pickSelectValue("Categoría", item.categoria, options),
  });
}

function buildIngresosRecord(item: ClassifiedPending, options: SelectOptionsMap): NocoRecord {
  const ingreso = Math.abs(item.importe);
  return buildRecord({
    Fecha: item.fecha.slice(0, 10),
    Ingreso: ingreso,
    Origen: pickSelectValue("Origen", item.banco, options),
    Persona: pickSelectValue("Persona", item.persona, options),
    Categoría: pickSelectValue("Categoría", item.categoria, options),
  });
}

function buildInversionesRecord(item: ClassifiedPending, options: SelectOptionsMap): NocoRecord {
  return buildRecord({
    Entidad: pickSelectValue("Entidad", deriveEntidad(item), options),
    Fecha: item.fecha.slice(0, 10),
    Nombre: item.nombre || item.concepto || undefined,
    Importe: item.importe,
    Tipo: pickSelectValue("Tipo", item.tipo, options),
    Persona: pickSelectValue("Persona", item.persona, options),
  });
}

function destinoTableId(tabla: TablaDestino): string {
  if (tabla === "Gastos") return TABLES.gastos;
  if (tabla === "Inversiones") return TABLES.inversiones;
  return TABLES.ingresos;
}

function buildDestinoRecord(
  item: ClassifiedPending,
  options: SelectOptionsMap,
): NocoRecord {
  if (item.tablaDestino === "Gastos") {
    return buildGastosRecord(item, options);
  }
  if (item.tablaDestino === "Inversiones") {
    return buildInversionesRecord(item, options);
  }
  return buildIngresosRecord(item, options);
}

export interface ModifyFields {
  fecha?: string;
  importe?: number;
  concepto?: string;
  persona?: PersonaValue;
  tablaDestino?: TablaDestino;
  categoria?: string | null;
  tipo?: string | null;
  nombre?: string | null;
  entidad?: string | null;
}

export async function modifyPending(
  client: NocoDbClient,
  id: string,
  userPersona: Persona,
  fields: ModifyFields,
): Promise<AcceptResult> {
  const item = await loadClassifiedPending(client, id, userPersona);

  const merged: ClassifiedPending = {
    ...item,
    fecha: fields.fecha ?? item.fecha,
    importe: fields.importe ?? item.importe,
    concepto: fields.concepto ?? item.concepto,
    persona: fields.persona ?? item.persona,
    tablaDestino: fields.tablaDestino ?? item.tablaDestino,
    categoria: fields.categoria !== undefined ? fields.categoria : item.categoria,
    tipo: fields.tipo !== undefined ? fields.tipo : item.tipo,
    nombre: fields.nombre !== undefined ? fields.nombre : item.nombre,
    entidad: fields.entidad !== undefined ? fields.entidad : item.entidad,
  };

  if (!merged.tablaDestino) {
    throw new ActionError("Categoriza el movimiento antes de guardarlo", 422);
  }

  const tableId = destinoTableId(merged.tablaDestino);
  const options = await getSelectOptions(client, tableId);
  const record = buildDestinoRecord(merged, options);

  const created = await client.createRecord(tableId, record);
  const destRecordId = String(created.Id ?? "");
  if (!destRecordId) {
    throw new ActionError("No se pudo crear el registro destino", 500);
  }

  await client.updateRecord(TABLES.automaticActions, id, { Estado: "modified" });
  return { destTableId: tableId, destRecordId };
}

export class ActionError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ActionError";
  }
}

export interface AcceptResult {
  destTableId: string;
  destRecordId: string;
}

export async function acceptPending(
  client: NocoDbClient,
  id: string,
  userPersona: Persona,
): Promise<AcceptResult> {
  const item = await loadClassifiedPending(client, id, userPersona);
  if (item.ignorar) {
    throw new ActionError("Este movimiento debe ignorarse, no registrarse", 422);
  }
  if (!item.tablaDestino) {
    throw new ActionError("Categoriza el movimiento antes de guardarlo", 422);
  }

  const tableId = destinoTableId(item.tablaDestino);
  const options = await getSelectOptions(client, tableId);
  const fields = buildDestinoRecord(item, options);

  const created = await client.createRecord(tableId, fields);
  const destRecordId = String(created.Id ?? "");
  if (!destRecordId) {
    throw new ActionError("No se pudo crear el registro destino", 500);
  }

  await client.updateRecord(TABLES.automaticActions, id, { Estado: "accepted" });
  return { destTableId: tableId, destRecordId };
}

export async function ignorePending(client: NocoDbClient, id: string): Promise<void> {
  const record = await client.getRecord(TABLES.automaticActions, id);
  if (!record) {
    throw new ActionError("Tarea no encontrada", 404);
  }
  if (String(record.Estado) !== "pending") {
    throw new ActionError("La tarea ya no está pendiente", 409);
  }

  await client.updateRecord(TABLES.automaticActions, id, { Estado: "ignored" });
}

export async function undoPending(
  client: NocoDbClient,
  id: string,
  userPersona: Persona,
  opts?: { destTableId?: string; destRecordId?: string },
): Promise<ClassifiedPending> {
  const record = await client.getRecord(TABLES.automaticActions, id);
  if (!record) {
    throw new ActionError("Tarea no encontrada", 404);
  }

  const estado = String(record.Estado);
  if (estado !== "accepted" && estado !== "ignored") {
    throw new ActionError("No se puede deshacer esta tarea", 409);
  }

  if (estado === "accepted") {
    if (!opts?.destTableId || !opts?.destRecordId) {
      throw new ActionError("Faltan datos del insert destino", 422);
    }
    await client.deleteRecord(opts.destTableId, opts.destRecordId);
  }

  await client.updateRecord(TABLES.automaticActions, id, { Estado: "pending" });

  const updated = await client.getRecord(TABLES.automaticActions, id);
  if (!updated) {
    throw new ActionError("Tarea no encontrada tras deshacer", 500);
  }

  const rules = await loadImportRules(client, userPersona);
  return classifyMovement(parsePendingMovement(updated), rules);
}

export function mapActionError(err: unknown): { message: string; status: number } {
  if (err instanceof ActionError) {
    return { message: err.message, status: err.status };
  }
  if (err instanceof NocoDbError) {
    return { message: err.message, status: err.status };
  }
  return { message: "Error al procesar la tarea", status: 500 };
}
