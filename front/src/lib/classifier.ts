import { TABLES } from "./config";
import type { NocoRecord } from "./types";
import {
  applyRulesWithMeta,
  normalizeMetadata,
  normalizePersona,
  normalizeRuleCondition,
  parseJsonField,
} from "./import-rules/engine";
import type {
  ClassifiedPending,
  ImportRule,
  PendingMovement,
  RuleActions,
  RuleCondition,
  RuleScope,
} from "./import-rules/types";
import { NocoDbClient } from "./nocodb";
import { PENDING_ACTION_FIELDS } from "./table-fields";
import { importRulesPersonaFilter, isVisible, personaFilter } from "./persona";
import type { Persona } from "./types";

export function parseImportRule(record: NocoRecord): ImportRule {
  return {
    id: String(record.Id ?? ""),
    nombre: String(record.Nombre ?? ""),
    persona: normalizePersona(record.Persona),
    scope: (record.Alcance as RuleScope) ?? "global",
    accountId: record.Cuenta ? String(record.Cuenta) : null,
    priority: Number(record.Prioridad ?? 0),
    condition: normalizeRuleCondition(
      parseJsonField<RuleCondition>(record.Condición ?? record.Condicion),
    ),
    actions: parseJsonField<RuleActions>(record.Acciones),
    active: record.Activa !== false,
  };
}

export function parsePendingMovement(record: NocoRecord): PendingMovement {
  return {
    id: String(record.Id ?? ""),
    fecha: String(record.Fecha ?? ""),
    importe: Number(record.Importe ?? 0),
    concepto: String(record.Concepto ?? ""),
    banco: String(record.Banco ?? ""),
    persona: normalizePersona(record.Persona),
    metadata: normalizeMetadata(record.Metadatos),
    idempotencyKey: String(record.IdempotencyKey ?? ""),
  };
}

export function classifyMovement(
  movement: PendingMovement,
  rules: ImportRule[],
): ClassifiedPending {
  const { classification, reglaId, reglaNombre, reglaPrioridad } = applyRulesWithMeta(
    movement,
    rules,
  );
  return {
    ...movement,
    classification,
    ignorar: classification.ignorar,
    reglaId,
    reglaNombre,
    reglaPrioridad,
    tablaDestino: classification.ignorar ? null : classification.tablaDestino,
    destino: classification.destino,
    origen: classification.origen,
    notas: classification.notas,
    categoria: classification.categoria,
    tipo: classification.tipo,
    nombre: classification.nombre,
    entidad: classification.entidad,
    persona: classification.persona,
    importe: classification.importe,
  };
}

export async function loadImportRules(
  client: NocoDbClient,
  userPersona: Persona,
): Promise<ImportRule[]> {
  const records = await client.listRecords(TABLES.importRules, {
    where: `(Activa,eq,true)~and${importRulesPersonaFilter(userPersona)}`,
  });
  return records.map(parseImportRule);
}

export async function loadAllImportRulesForUser(
  client: NocoDbClient,
  userPersona: Persona,
): Promise<ImportRule[]> {
  const records = await client.listRecords(TABLES.importRules, {
    where: importRulesPersonaFilter(userPersona),
  });
  return records
    .map(parseImportRule)
    .sort((a, b) => b.priority - a.priority || a.nombre.localeCompare(b.nombre, "es"));
}

export async function loadPendingMovements(
  client: NocoDbClient,
  userPersona: Persona,
): Promise<PendingMovement[]> {
  const records = await client.listRecords(TABLES.automaticActions, {
    where: `(Estado,eq,pending)~and${personaFilter(userPersona)}`,
    fields: [...PENDING_ACTION_FIELDS],
  });
  return records.map(parsePendingMovement);
}

export async function classifyPending(
  client: NocoDbClient,
  userPersona: Persona,
): Promise<ClassifiedPending[]> {
  const [rules, pending] = await Promise.all([
    loadImportRules(client, userPersona),
    loadPendingMovements(client, userPersona),
  ]);
  return pending.map((movement) => classifyMovement(movement, rules));
}

export async function countPending(client: NocoDbClient, userPersona: Persona): Promise<number> {
  return client.countRecords(
    TABLES.automaticActions,
    `(Estado,eq,pending)~and${personaFilter(userPersona)}`,
  );
}
