import type {
  ConditionKind,
  DestinoRegla,
  ImportRule,
  RuleActions,
  RuleCondition,
  TablaDestino,
} from "./types";

export const DESTINO_GROUP_ORDER: (TablaDestino | "__sin_destino__" | "__ignorar__")[] = [
  "__ignorar__",
  "Gastos",
  "Ingresos",
  "Inversiones",
  "__sin_destino__",
];

export interface RuleDestinoGroup {
  key: TablaDestino | "__sin_destino__" | "__ignorar__";
  label: string;
  items: ImportRule[];
}

export function isIgnorarRule(rule: ImportRule): boolean {
  return rule.actions.ignorar === true;
}

export function getRuleDestinoKey(rule: ImportRule): TablaDestino | "__sin_destino__" | "__ignorar__" {
  if (isIgnorarRule(rule)) return "__ignorar__";
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
      label:
        key === "__sin_destino__"
          ? "Sin destino"
          : key === "__ignorar__"
            ? "Ignorar (transferencias)"
            : key,
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

function inversionSuffix(rule: ImportRule): string {
  return rule.actions.invertir_importe ? " · invierte signo" : "";
}

export function formatRuleSummary(rule: ImportRule): string {
  const kind = inferConditionKind(rule.condition);
  if (isIgnorarRule(rule)) {
    if (kind === "exacto") {
      const text = rule.condition.concepto_exacto ?? "";
      return `Si concepto = «${text}» → ignorar (transferencia)`;
    }
    if (kind === "contiene") {
      const text = rule.condition.concepto_contiene ?? "";
      return `Si concepto contiene «${text}» → ignorar (transferencia)`;
    }
    if (kind === "importe_positivo") return "Si importe positivo → ignorar (transferencia)";
    return "Si importe negativo → ignorar (transferencia)";
  }

  const dest = rule.actions.tabla_destino ?? "?";

  const suffix = inversionSuffix(rule);

  if (kind === "exacto") {
    const text = rule.condition.concepto_exacto ?? "";
    if (dest === "Inversiones") {
      const parts = [rule.actions.tipo, rule.actions.nombre].filter(Boolean).join(" · ");
      return `Si concepto = «${text}» → ${dest}${parts ? ` (${parts})` : ""}${suffix}`;
    }
    if (dest === "Gastos" && rule.actions.categoria) {
      return `Si concepto = «${text}» → ${dest} / ${rule.actions.categoria}${suffix}`;
    }
    return `Si concepto = «${text}» → ${dest}${suffix}`;
  }

  if (kind === "contiene") {
    const text = rule.condition.concepto_contiene ?? "";
    return `Si concepto contiene «${text}» → ${dest}${suffix}`;
  }

  if (kind === "importe_positivo") return `Si importe positivo → ${dest}${suffix}`;
  return `Si importe negativo → ${dest}${suffix}`;
}

export function emptyActionsForDestino(destino: TablaDestino | DestinoRegla | ""): RuleActions {
  if (!destino) return {};
  if (destino === "__ignorar__") return { ignorar: true };
  return { tabla_destino: destino };
}
