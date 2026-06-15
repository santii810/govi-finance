import type {
  ConditionKind,
  ImportRule,
  RuleActions,
  RuleCondition,
  TablaDestino,
} from "./types";

export const DESTINO_GROUP_ORDER: (TablaDestino | "__sin_destino__")[] = [
  "Gastos",
  "Ingresos",
  "Inversiones",
  "__sin_destino__",
];

export interface RuleDestinoGroup {
  key: TablaDestino | "__sin_destino__";
  label: string;
  items: ImportRule[];
}

export function getRuleDestinoKey(rule: ImportRule): TablaDestino | "__sin_destino__" {
  return rule.actions.tabla_destino ?? "__sin_destino__";
}

export function groupRulesByDestino(rules: ImportRule[]): RuleDestinoGroup[] {
  const map = new Map<string, ImportRule[]>();

  for (const rule of rules) {
    const key = getRuleDestinoKey(rule);
    const bucket = map.get(key);
    if (bucket) bucket.push(rule);
    else map.set(key, [rule]);
  }

  const sortRules = (items: ImportRule[]) =>
    [...items].sort(
      (a, b) => b.priority - a.priority || a.nombre.localeCompare(b.nombre, "es"),
    );

  const groups: RuleDestinoGroup[] = [];
  for (const key of DESTINO_GROUP_ORDER) {
    const items = map.get(key);
    if (!items?.length) continue;
    groups.push({
      key,
      label: key === "__sin_destino__" ? "Sin destino" : key,
      items: sortRules(items),
    });
    map.delete(key);
  }

  for (const [key, items] of map) {
    groups.push({
      key: key as TablaDestino,
      label: key,
      items: sortRules(items),
    });
  }

  return groups;
}

export const DEFAULT_PRIORITY: Record<ConditionKind, number> = {
  exacto: 500,
  contiene: 100,
  importe_positivo: 0,
  importe_negativo: 0,
};

export function inferConditionKind(condition: RuleCondition): ConditionKind {
  if (condition.concepto_exacto) return "exacto";
  if (condition.concepto_contiene) return "contiene";
  if (condition.importe_negativo) return "importe_negativo";
  return "importe_positivo";
}

export function buildCondition(kind: ConditionKind, texto: string): RuleCondition {
  switch (kind) {
    case "exacto":
      return { concepto_exacto: texto.trim() };
    case "contiene":
      return { concepto_contiene: texto.trim() };
    case "importe_positivo":
      return { importe_positivo: true };
    case "importe_negativo":
      return { importe_negativo: true };
  }
}

export function getConditionText(condition: RuleCondition): string {
  if (condition.concepto_exacto) return condition.concepto_exacto;
  if (condition.concepto_contiene) return condition.concepto_contiene;
  return "";
}

export function formatRuleSummary(rule: ImportRule): string {
  const kind = inferConditionKind(rule.condition);
  const dest = rule.actions.tabla_destino ?? "?";

  if (kind === "exacto") {
    const text = rule.condition.concepto_exacto ?? "";
    if (dest === "Inversiones") {
      const parts = [rule.actions.tipo, rule.actions.nombre].filter(Boolean).join(" · ");
      return `Si concepto = «${text}» → ${dest}${parts ? ` (${parts})` : ""}`;
    }
    if (dest === "Gastos" && rule.actions.categoria) {
      return `Si concepto = «${text}» → ${dest} / ${rule.actions.categoria}`;
    }
    return `Si concepto = «${text}» → ${dest}`;
  }

  if (kind === "contiene") {
    const text = rule.condition.concepto_contiene ?? "";
    return `Si concepto contiene «${text}» → ${dest}`;
  }

  if (kind === "importe_positivo") return `Si importe positivo → ${dest}`;
  return `Si importe negativo → ${dest}`;
}

export function emptyActionsForDestino(destino: TablaDestino | ""): RuleActions {
  if (!destino) return {};
  return { tabla_destino: destino };
}
