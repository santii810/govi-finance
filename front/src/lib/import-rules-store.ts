import { TABLES } from "./config";
import { parseImportRule, loadAllImportRulesForUser } from "./classifier";
import { parseJsonField } from "./import-rules/engine";
import type { ImportRule, ImportRuleInput, PersonaValue } from "./import-rules/types";
import { NocoDbClient } from "./nocodb";
import { isImportRuleVisible } from "./persona";
import type { NocoRecord, Persona } from "./types";

function toNocoRecord(input: ImportRuleInput & { persona: PersonaValue }): NocoRecord {
  return {
    Nombre: input.nombre,
    Persona: input.persona,
    Activa: input.activa,
    Alcance: input.alcance,
    Cuenta: input.cuenta ?? "",
    Prioridad: input.prioridad,
    Condición: input.condition,
    Acciones: input.actions,
  };
}

export async function listImportRulesForUser(
  client: NocoDbClient,
  userPersona: Persona,
): Promise<ImportRule[]> {
  return loadAllImportRulesForUser(client, userPersona);
}

export async function getImportRuleForUser(
  client: NocoDbClient,
  id: string,
  userPersona: Persona,
): Promise<ImportRule | null> {
  const record = await client.getRecord(TABLES.importRules, id);
  if (!record) return null;
  const rule = parseImportRule(record);
  return isImportRuleVisible(rule.persona, userPersona) ? rule : null;
}

export async function createImportRule(
  client: NocoDbClient,
  input: ImportRuleInput & { persona: PersonaValue },
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
  userPersona: Persona,
  input: Partial<ImportRuleInput>,
): Promise<ImportRule> {
  const existing = await getImportRuleForUser(client, id, userPersona);
  if (!existing) {
    throw new RuleError("Regla no encontrada", 404);
  }

  const merged: ImportRuleInput & { persona: PersonaValue } = {
    nombre: input.nombre ?? existing.nombre,
    persona: existing.persona,
    activa: input.activa ?? existing.active,
    alcance: input.alcance ?? existing.scope,
    cuenta: input.cuenta !== undefined ? input.cuenta : existing.accountId,
    prioridad: input.prioridad ?? existing.priority,
    condition: input.condition ?? existing.condition,
    actions: input.actions ?? existing.actions,
  };

  await client.updateRecord(TABLES.importRules, id, toNocoRecord(merged));
  const updated = await client.getRecord(TABLES.importRules, id);
  if (!updated) {
    throw new RuleError("Regla no encontrada tras actualizar", 500);
  }
  return parseImportRule(updated);
}

export async function deleteImportRule(
  client: NocoDbClient,
  id: string,
  userPersona: Persona,
): Promise<void> {
  const existing = await getImportRuleForUser(client, id, userPersona);
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
export function normalizeRuleInput(
  body: NocoRecord,
  defaultPersona: Persona,
): ImportRuleInput & { persona: PersonaValue } {
  return {
    nombre: String(body.nombre ?? ""),
    persona: defaultPersona,
    activa: body.activa !== false,
    alcance: body.alcance === "account" ? "account" : "global",
    cuenta: body.cuenta ? String(body.cuenta) : null,
    prioridad: Number(body.prioridad ?? 0),
    condition: parseJsonField(body.condition),
    actions: parseJsonField(body.actions),
  };
}
