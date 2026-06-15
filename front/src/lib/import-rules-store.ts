import { TABLES } from "./config";
import { parseImportRule } from "./classifier";
import { parseJsonField } from "./import-rules/engine";
import type { ImportRule, ImportRuleInput } from "./import-rules/types";
import { NocoDbClient } from "./nocodb";
import type { NocoRecord } from "./types";

function toNocoRecord(input: ImportRuleInput): NocoRecord {
  return {
    Nombre: input.nombre,
    Activa: input.activa,
    Alcance: input.alcance,
    Cuenta: input.cuenta ?? "",
    Prioridad: input.prioridad,
    Condición: input.condition,
    Acciones: input.actions,
  };
}

export async function listAllImportRules(client: NocoDbClient): Promise<ImportRule[]> {
  const records = await client.listRecords(TABLES.importRules);
  return records
    .map(parseImportRule)
    .sort((a, b) => b.priority - a.priority || a.nombre.localeCompare(b.nombre, "es"));
}

export async function createImportRule(
  client: NocoDbClient,
  input: ImportRuleInput,
): Promise<ImportRule> {
  const created = await client.createRecord(TABLES.importRules, toNocoRecord(input));
  const id = String(created.Id ?? "");
  if (!id) {
    throw new Error("No se pudo crear la regla");
  }
  const record = await client.getRecord(TABLES.importRules, id);
  if (!record) {
    throw new Error("Regla creada pero no encontrada");
  }
  return parseImportRule(record);
}

export async function updateImportRule(
  client: NocoDbClient,
  id: string,
  input: Partial<ImportRuleInput>,
): Promise<ImportRule> {
  const existing = await client.getRecord(TABLES.importRules, id);
  if (!existing) {
    throw new RuleError("Regla no encontrada", 404);
  }

  const current = parseImportRule(existing);
  const merged: ImportRuleInput = {
    nombre: input.nombre ?? current.nombre,
    activa: input.activa ?? current.active,
    alcance: input.alcance ?? current.scope,
    cuenta: input.cuenta !== undefined ? input.cuenta : current.accountId,
    prioridad: input.prioridad ?? current.priority,
    condition: input.condition ?? current.condition,
    actions: input.actions ?? current.actions,
  };

  await client.updateRecord(TABLES.importRules, id, toNocoRecord(merged));
  const updated = await client.getRecord(TABLES.importRules, id);
  if (!updated) {
    throw new RuleError("Regla no encontrada tras actualizar", 500);
  }
  return parseImportRule(updated);
}

export async function deleteImportRule(client: NocoDbClient, id: string): Promise<void> {
  const existing = await client.getRecord(TABLES.importRules, id);
  if (!existing) {
    throw new RuleError("Regla no encontrada", 404);
  }
  await client.deleteRecord(TABLES.importRules, id);
}

export class RuleError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "RuleError";
  }
}

export function mapRuleError(err: unknown): { message: string; status: number } {
  if (err instanceof RuleError) {
    return { message: err.message, status: err.status };
  }
  return { message: "Error al procesar la regla", status: 500 };
}

/** Valida que condition/actions sean JSON parseables si vienen como string. */
export function normalizeRuleInput(body: NocoRecord): ImportRuleInput {
  return {
    nombre: String(body.nombre ?? ""),
    activa: body.activa !== false,
    alcance: body.alcance === "account" ? "account" : "global",
    cuenta: body.cuenta ? String(body.cuenta) : null,
    prioridad: Number(body.prioridad ?? 0),
    condition: parseJsonField(body.condition),
    actions: parseJsonField(body.actions),
  };
}
