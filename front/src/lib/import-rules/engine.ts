import type {
  Classification,
  ImportRule,
  PendingMovement,
  PersonaValue,
  RuleActions,
  RuleCondition,
  TablaDestino,
} from "./types";

function applyGlobalSignRule(movement: PendingMovement): Classification {
  const tablaDestino: TablaDestino = movement.importe > 0 ? "Ingresos" : "Gastos";
  return {
    tablaDestino,
    categoria: null,
    tipo: null,
    nombre: null,
    entidad: null,
    persona: movement.persona,
    importe: movement.importe,
  };
}

export function normalizeConcepto(value: string): string {
  return value.trim().toLowerCase();
}

export function applyRules(movement: PendingMovement, rules: ImportRule[]): Classification {
  let classified = applyGlobalSignRule(movement);
  const accountId = movement.metadata.account_id ?? "";

  const applicable = rules
    .filter((rule) => rule.active && ruleMatches(rule, movement, accountId))
    .sort((a, b) => a.priority - b.priority);

  for (const rule of applicable) {
    classified = applyActions(classified, rule.actions);
  }

  return classified;
}

function ruleMatches(rule: ImportRule, movement: PendingMovement, accountId: string): boolean {
  if (rule.scope === "account" && rule.accountId && rule.accountId !== accountId) {
    return false;
  }

  const condition = rule.condition ?? {};
  if ("importe_positivo" in condition && (movement.importe > 0) !== Boolean(condition.importe_positivo)) {
    return false;
  }
  if ("importe_negativo" in condition && (movement.importe < 0) !== Boolean(condition.importe_negativo)) {
    return false;
  }

  const exact = condition.concepto_exacto;
  if (exact && normalizeConcepto(movement.concepto) !== normalizeConcepto(exact)) {
    return false;
  }

  const contains = condition.concepto_contiene;
  if (contains && !movement.concepto.toLowerCase().includes(contains.toLowerCase())) {
    return false;
  }

  const txType = condition.tipo ?? condition.type;
  if (txType && movement.metadata.type?.toLowerCase() !== String(txType).toLowerCase()) {
    return false;
  }

  const category = condition.category;
  if (category && movement.metadata.category?.toLowerCase() !== String(category).toLowerCase()) {
    return false;
  }

  const assetClass = condition.asset_class;
  if (assetClass && movement.metadata.asset_class?.toLowerCase() !== String(assetClass).toLowerCase()) {
    return false;
  }

  const mcc = condition.mcc_code;
  if (mcc && movement.metadata.mcc_code !== String(mcc)) {
    return false;
  }

  const symbol = condition.symbol;
  if (symbol && movement.metadata.symbol?.toUpperCase() !== String(symbol).toUpperCase()) {
    return false;
  }

  return true;
}

function applyActions(classified: Classification, actions: RuleActions): Classification {
  const tablaDestino = actions.tabla_destino ?? classified.tablaDestino;
  const persona = actions.persona ?? classified.persona;
  const categoria = actions.categoria !== undefined ? actions.categoria : classified.categoria;
  const tipo = actions.tipo !== undefined ? actions.tipo : classified.tipo;
  const nombre = actions.nombre !== undefined ? actions.nombre : classified.nombre;
  const entidad = actions.entidad !== undefined ? actions.entidad : classified.entidad;

  let importe = classified.importe;
  if (actions.importe_signo) {
    const sign = actions.importe_signo === "positivo" ? 1 : -1;
    importe = Math.abs(classified.importe) * sign;
  }

  return { tablaDestino, persona, categoria, tipo, nombre, entidad, importe };
}

export function parseJsonField<T>(value: unknown): T {
  if (value === null || value === undefined) return {} as T;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return {} as T;
    }
  }
  return {} as T;
}

export function normalizePersona(value: unknown, fallback: PersonaValue = "Santi"): PersonaValue {
  if (value === "Santi" || value === "Sandra" || value === "Común") return value;
  return fallback;
}

export function normalizeMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw !== null && raw !== undefined) out[key] = String(raw);
  }
  return out;
}
