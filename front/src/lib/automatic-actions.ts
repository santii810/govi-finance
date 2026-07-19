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
import { isVisible } from "./persona";
import { normalizePersona } from "./import-rules/engine";
import { validatePendingClassification } from "./pending-classification";
import { resolveIngresosOrigenForInsert } from "./pending-ingresos-origen";
import { resolveIngresosNotasForInsert } from "./pending-ingresos-notas";
import { defaultGastosConcepto } from "./pending-gastos-concepto";
import { ensureClassifiedPendingSelectOptions } from "./ensure-classified-select-options";

export interface RegistroDestinoRef {
  tabla: TablaDestino;
  id: number;
}

function parseRegistroDestino(value: unknown): RegistroDestinoRef | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as { tabla?: unknown; id?: unknown };
  const tabla = obj.tabla;
  if (tabla !== "Gastos" && tabla !== "Ingresos" && tabla !== "Inversiones") return null;
  const id = Number(obj.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return { tabla, id };
}

function withAutomaticActionLink(record: NocoRecord, actionId: string): NocoRecord {
  return {
    ...record,
    AutomaticAction: { Id: Number(actionId) },
  };
}

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
  if (!isVisible(normalizePersona(record.Persona), userPersona)) {
    throw new ActionError("Tarea no encontrada", 404);
  }

  const rules = await loadImportRules(client, userPersona);
  return classifyMovement(parsePendingMovement(record), rules);
}

const ENTIDAD_ALIASES: Record<string, string> = {
  myinvestor: "Myinvestor",
};

function normalizeEntidad(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return ENTIDAD_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

function deriveEntidad(item: ClassifiedPending): string | undefined {
  return normalizeEntidad(item.entidad) ?? normalizeEntidad(item.banco);
}

function gastosDestino(item: ClassifiedPending): string | undefined {
  return item.destino?.trim() || defaultGastosConcepto(item.concepto) || undefined;
}

function buildGastosRecord(item: ClassifiedPending, options: SelectOptionsMap): NocoRecord {
  const cantidad = Math.abs(item.importe);
  return buildRecord({
    Date: item.fecha.slice(0, 10),
    Cantidad: cantidad,
    Destino: gastosDestino(item),
    Fuente: pickSelectValue("Fuente", item.banco, options),
    Persona: pickSelectValue("Persona", item.persona, options),
    Categoría: pickSelectValue("Categoría", item.categoria, options),
  });
}

function buildIngresosRecord(item: ClassifiedPending, options: SelectOptionsMap): NocoRecord {
  const notas = resolveIngresosNotasForInsert(item);
  return buildRecord({
    Fecha: item.fecha.slice(0, 10),
    Ingreso: item.importe,
    Origen: resolveIngresosOrigenForInsert(item, options),
    Persona: pickSelectValue("Persona", item.persona, options),
    Categoría: pickSelectValue("Categoría", item.categoria, options),
    ...(notas ? { Notas: notas } : {}),
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
  /** Gastos.Destino */
  destino?: string;
  /** Alias legacy de destino */
  concepto?: string;
  /** Ingresos.Origen */
  origen?: string;
  /** Ingresos.Notas */
  notas?: string | null;
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
    destino:
      fields.destino !== undefined
        ? fields.destino || null
        : fields.concepto !== undefined
          ? fields.concepto || null
          : item.destino,
    origen: fields.origen !== undefined ? fields.origen || null : item.origen,
    notas: fields.notas !== undefined ? fields.notas : item.notas,
    persona: fields.persona ?? item.persona,
    tablaDestino: fields.tablaDestino ?? item.tablaDestino,
    categoria: fields.categoria !== undefined ? fields.categoria : item.categoria,
    tipo: fields.tipo !== undefined ? fields.tipo : item.tipo,
    nombre: fields.nombre !== undefined ? fields.nombre : item.nombre,
    entidad: fields.entidad !== undefined ? fields.entidad : item.entidad,
  };

  const validationError = validatePendingClassification(merged);
  if (validationError) {
    throw new ActionError(validationError, 422);
  }

  await ensureClassifiedPendingSelectOptions(client, merged);
  selectOptionsCache.delete(destinoTableId(merged.tablaDestino!));

  const tableId = destinoTableId(merged.tablaDestino!);
  const options = await getSelectOptions(client, tableId);
  const record = withAutomaticActionLink(buildDestinoRecord(merged, options), id);

  const created = await client.createRecord(tableId, record);
  const destRecordId = String(created.Id ?? "");
  if (!destRecordId) {
    throw new ActionError("No se pudo crear el registro destino", 500);
  }

  await client.updateRecord(TABLES.automaticActions, id, {
    Estado: "modified",
    RegistroDestino: {
      tabla: merged.tablaDestino!,
      id: Number(destRecordId),
    },
  });
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
  const validationError = validatePendingClassification(item);
  if (validationError) {
    throw new ActionError(validationError, 422);
  }

  await ensureClassifiedPendingSelectOptions(client, item);
  selectOptionsCache.delete(destinoTableId(item.tablaDestino!));

  const tableId = destinoTableId(item.tablaDestino!);
  const options = await getSelectOptions(client, tableId);
  const fields = withAutomaticActionLink(buildDestinoRecord(item, options), id);

  const created = await client.createRecord(tableId, fields);
  const destRecordId = String(created.Id ?? "");
  if (!destRecordId) {
    throw new ActionError("No se pudo crear el registro destino", 500);
  }

  await client.updateRecord(TABLES.automaticActions, id, {
    Estado: "accepted",
    RegistroDestino: {
      tabla: item.tablaDestino!,
      id: Number(destRecordId),
    },
  });
  return { destTableId: tableId, destRecordId };
}

export async function ignorePending(
  client: NocoDbClient,
  id: string,
  userPersona: Persona,
): Promise<void> {
  const record = await client.getRecord(TABLES.automaticActions, id);
  if (!record) {
    throw new ActionError("Tarea no encontrada", 404);
  }
  if (String(record.Estado) !== "pending") {
    throw new ActionError("La tarea ya no está pendiente", 409);
  }
  if (!isVisible(normalizePersona(record.Persona), userPersona)) {
    throw new ActionError("Tarea no encontrada", 404);
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
  if (!isVisible(normalizePersona(record.Persona), userPersona)) {
    throw new ActionError("Tarea no encontrada", 404);
  }

  const estado = String(record.Estado);
  if (estado !== "accepted" && estado !== "modified" && estado !== "ignored") {
    throw new ActionError("No se puede deshacer esta tarea", 409);
  }

  if (estado === "accepted" || estado === "modified") {
    const stored = parseRegistroDestino(record.RegistroDestino);
    const destTableId =
      opts?.destTableId ?? (stored ? destinoTableId(stored.tabla) : undefined);
    const destRecordId =
      opts?.destRecordId ?? (stored ? String(stored.id) : undefined);
    if (!destTableId || !destRecordId) {
      throw new ActionError("Faltan datos del insert destino", 422);
    }
    await client.deleteRecord(destTableId, destRecordId);
  }

  await client.updateRecord(TABLES.automaticActions, id, {
    Estado: "pending",
    RegistroDestino: null,
  });

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
