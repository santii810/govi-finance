import type {
  Classification,
  ImportRule,
  PendingMovement,
  PersonaValue,
  RuleActions,
  RuleCondition,
  TablaDestino,
} from "./types";

function applyBaseline(movement: PendingMovement): Classification {
  return {
    tablaDestino: null,
    ignorar: false,
    destino: null,
    origen: null,
    notas: null,
    categoria: null,
    tipo: null,
    nombre: null,
    entidad: null,
    persona: movement.persona,
    importe: movement.importe,
  };
}

function extractDestinoFromContains(concepto: string, needle: string): string {
  const idx = concepto.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return needle.trim();
  return concepto.slice(idx, idx + needle.length).trim();
}

function conceptoExactoValues(exact: string | string[]): string[] {
  return Array.isArray(exact) ? exact : [exact];
}

function matchesConceptoExacto(concepto: string, exact: string | string[]): boolean {
  const normalized = normalizeConcepto(concepto);
  return conceptoExactoValues(exact).some((value) => normalized === normalizeConcepto(value));
}

function conceptoContieneValues(contains: string | string[]): string[] {
  return Array.isArray(contains) ? contains : [contains];
}

function matchesConceptoContiene(concepto: string, contains: string | string[]): boolean {
  const lower = concepto.toLowerCase();
  return conceptoContieneValues(contains).some((needle) => lower.includes(needle.toLowerCase()));
}

function inferDestinoFromCondition(
  concepto: string,
  condition: RuleCondition,
  actions: RuleActions,
): string | undefined {
  if (actions.destino !== undefined) return actions.destino.trim() || undefined;
  const contains = condition.concepto_contiene;
  if (contains) {
    const matched = conceptoContieneValues(contains).find((needle) =>
      concepto.toLowerCase().includes(needle.toLowerCase()),
    );
    if (matched) return extractDestinoFromContains(concepto, matched);
  }
  const exact = condition.concepto_exacto;
  if (exact) {
    const matched = conceptoExactoValues(exact).find(
      (value) => normalizeConcepto(concepto) === normalizeConcepto(value),
    );
    if (matched) return extractDestinoFromContains(concepto, matched);
  }
  return undefined;
}

export function normalizeConcepto(value: string): string {
  return value.trim().toLowerCase();
}

/** Normaliza condiciones leídas de NocoDB (p. ej. concepto_contiene serializado como string). */
export function normalizeRuleCondition(condition: RuleCondition): RuleCondition {
  const out: RuleCondition = { ...condition };
  const contains = out.concepto_contiene;
  if (typeof contains === "string" && contains.trim().startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(contains);
      if (Array.isArray(parsed)) {
        out.concepto_contiene = parsed.map((value) => String(value));
      }
    } catch {
      /* mantener string */
    }
  }
  return out;
}

function matchConceptoRegex(concepto: string, pattern: string): RegExpMatchArray | null {
  try {
    return concepto.match(new RegExp(pattern, "i"));
  } catch {
    return null;
  }
}

function extractNombreFromRegex(concepto: string, condition: RuleCondition): string | null {
  const pattern = condition.concepto_regex;
  if (!pattern) return null;
  const match = matchConceptoRegex(concepto, pattern);
  if (!match) return null;
  const group = condition.nombre_grupo ?? 1;
  const value = match[group];
  return value?.trim() || null;
}

export function applyRules(movement: PendingMovement, rules: ImportRule[]): Classification {
  return applyRulesWithMeta(movement, rules).classification;
}

export interface RuleMatchResult {
  classification: Classification;
  reglaId: string | null;
  reglaNombre: string | null;
  reglaPrioridad: number;
}

/** Clasifica un movimiento y devuelve la regla de mayor prioridad que coincidió. */
export function applyRulesWithMeta(
  movement: PendingMovement,
  rules: ImportRule[],
): RuleMatchResult {
  let classified = applyBaseline(movement);
  const accountId = movement.metadata.account_id ?? "";
  let lastMatched: ImportRule | null = null;

  const applicable = rules
    .filter((rule) => rule.active && ruleMatches(rule, movement, accountId))
    .sort((a, b) => a.priority - b.priority);

  for (const rule of applicable) {
    let actions = rule.actions;
    const extractedNombre = extractNombreFromRegex(movement.concepto, rule.condition);
    if (extractedNombre !== null && actions.nombre === undefined) {
      actions = { ...actions, nombre: extractedNombre };
    }
    const inferredDestino = inferDestinoFromCondition(movement.concepto, rule.condition, actions);
    const tablaTrasRegla = actions.tabla_destino ?? classified.tablaDestino;
    if (
      inferredDestino !== undefined &&
      actions.destino === undefined &&
      actions.origen === undefined &&
      tablaTrasRegla === "Gastos"
    ) {
      actions = { ...actions, destino: inferredDestino };
    }
    classified = applyActions(classified, actions);
    lastMatched = rule;
  }

  classified = applyDividendNotasFallback(classified, movement);

  return {
    classification: classified,
    reglaId: lastMatched?.id ?? null,
    reglaNombre: lastMatched?.nombre ?? null,
    reglaPrioridad: lastMatched?.priority ?? -1,
  };
}

function applyDividendNotasFallback(
  classified: Classification,
  movement: PendingMovement,
): Classification {
  if (classified.tablaDestino !== "Ingresos" || classified.notas?.trim()) {
    return classified;
  }
  const origen = classified.origen?.trim();
  if (origen !== "Dividendos" && origen !== "Cashback") {
    return classified;
  }
  const name = movement.metadata.name?.trim();
  if (!name) return classified;
  return { ...classified, notas: name };
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
  if (exact && !matchesConceptoExacto(movement.concepto, exact)) {
    return false;
  }

  const contains = condition.concepto_contiene;
  if (contains && !matchesConceptoContiene(movement.concepto, contains)) {
    return false;
  }

  const regex = condition.concepto_regex;
  if (regex && !matchConceptoRegex(movement.concepto, regex)) {
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
  const ignorar = actions.ignorar === true ? true : classified.ignorar;
  const tablaDestino = actions.tabla_destino ?? classified.tablaDestino;
  const persona = actions.persona ?? classified.persona;

  let destino = classified.destino;
  let origen = classified.origen;

  if (actions.origen !== undefined) {
    origen = actions.origen || null;
  }
  if (actions.destino !== undefined) {
    const label = actions.destino || null;
    if (tablaDestino === "Ingresos") {
      origen = label;
    } else {
      destino = label;
    }
  }

  const categoria = actions.categoria !== undefined ? actions.categoria : classified.categoria;
  const notas = actions.notas !== undefined ? actions.notas || null : classified.notas;
  const tipo = actions.tipo !== undefined ? actions.tipo : classified.tipo;
  const nombre = actions.nombre !== undefined ? actions.nombre : classified.nombre;
  const entidad = actions.entidad !== undefined ? actions.entidad : classified.entidad;

  let importe = classified.importe;
  if (actions.importe_signo) {
    const sign = actions.importe_signo === "positivo" ? 1 : -1;
    importe = Math.abs(importe) * sign;
  }
  if (actions.invertir_importe) {
    importe = importe * -1;
  }

  return {
    tablaDestino,
    ignorar,
    destino,
    origen,
    notas,
    persona,
    categoria,
    tipo,
    nombre,
    entidad,
    importe,
  };
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
