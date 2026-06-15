import { TABLES } from "./config";
import type { NocoRecord } from "./types";
import {
  applyRules,
  normalizeMetadata,
  normalizePersona,
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

export function parseImportRule(record: NocoRecord): ImportRule {
  return {
    id: String(record.Id ?? ""),
    nombre: String(record.Nombre ?? ""),
    scope: (record.Alcance as RuleScope) ?? "global",
    accountId: record.Cuenta ? String(record.Cuenta) : null,
    priority: Number(record.Prioridad ?? 0),
    condition: parseJsonField<RuleCondition>(record.Condición ?? record.Condicion),
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
  const classification = applyRules(movement, rules);
  return {
    ...movement,
    classification,
    tablaDestino: classification.tablaDestino,
    categoria: classification.categoria,
    tipo: classification.tipo,
    nombre: classification.nombre,
    entidad: classification.entidad,
    persona: classification.persona,
    importe: classification.importe,
  };
}

export async function loadImportRules(client: NocoDbClient): Promise<ImportRule[]> {
  const records = await client.listRecords(TABLES.importRules, "(Activa,eq,true)");
  return records.map(parseImportRule);
}

export async function loadPendingMovements(client: NocoDbClient): Promise<PendingMovement[]> {
  const records = await client.listRecords(TABLES.automaticActions, "(Estado,eq,pending)");
  return records.map(parsePendingMovement);
}

export async function classifyPending(
  client: NocoDbClient,
): Promise<ClassifiedPending[]> {
  const [rules, pending] = await Promise.all([
    loadImportRules(client),
    loadPendingMovements(client),
  ]);
  return pending.map((movement) => classifyMovement(movement, rules));
}

export async function countPending(client: NocoDbClient): Promise<number> {
  const records = await client.listRecords(
    TABLES.automaticActions,
    "(Estado,eq,pending)",
    ["Id"],
  );
  return records.length;
}
