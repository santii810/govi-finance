export type PersonaValue = "Santi" | "Sandra" | "Común";
export type TablaDestino = "Gastos" | "Ingresos" | "Inversiones";
export type RuleScope = "global" | "account";

export interface RuleCondition {
  importe_positivo?: boolean;
  importe_negativo?: boolean;
  concepto_contiene?: string;
  concepto_exacto?: string;
  type?: string;
  tipo?: string;
  category?: string;
  asset_class?: string;
  mcc_code?: string;
  symbol?: string;
}

export interface RuleActions {
  tabla_destino?: TablaDestino;
  categoria?: string;
  tipo?: string;
  nombre?: string;
  entidad?: string;
  persona?: PersonaValue;
  importe_signo?: "positivo" | "negativo";
}

export interface ImportRule {
  id: string;
  nombre: string;
  scope: RuleScope;
  accountId: string | null;
  priority: number;
  condition: RuleCondition;
  actions: RuleActions;
  active: boolean;
}

export interface PendingMovement {
  id: string;
  fecha: string;
  importe: number;
  concepto: string;
  banco: string;
  persona: PersonaValue;
  metadata: Record<string, string>;
  idempotencyKey: string;
}

export interface Classification {
  tablaDestino: TablaDestino;
  categoria: string | null;
  tipo: string | null;
  nombre: string | null;
  entidad: string | null;
  persona: PersonaValue;
  importe: number;
}

export interface ClassifiedPending extends PendingMovement {
  classification: Classification;
  tablaDestino: TablaDestino | null;
  categoria: string | null;
  tipo: string | null;
  nombre: string | null;
  entidad: string | null;
}

export type ConditionKind = "exacto" | "contiene" | "importe_positivo" | "importe_negativo";

export interface ImportRuleInput {
  nombre: string;
  activa: boolean;
  alcance: RuleScope;
  cuenta: string | null;
  prioridad: number;
  condition: RuleCondition;
  actions: RuleActions;
}
