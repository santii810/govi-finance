export type PersonaValue = "Santi" | "Sandra" | "Común";
export type TablaDestino = "Gastos" | "Ingresos" | "Inversiones";
export type RuleScope = "global" | "account";

export interface RuleCondition {
  importe_positivo?: boolean;
  importe_negativo?: boolean;
  concepto_contiene?: string;
  concepto_exacto?: string;
  /** Expresión regular sobre Concepto; grupo captura → nombre si Acciones.nombre no está fijado. */
  concepto_regex?: string;
  /** Índice del grupo capturador para nombre (default 1). */
  nombre_grupo?: number;
  type?: string;
  tipo?: string;
  category?: string;
  asset_class?: string;
  mcc_code?: string;
  symbol?: string;
}

export interface RuleActions {
  tabla_destino?: TablaDestino;
  /** Movimiento interno (transferencia); no registrar como ingreso/gasto. */
  ignorar?: boolean;
  categoria?: string;
  tipo?: string;
  nombre?: string;
  entidad?: string;
  persona?: PersonaValue;
  importe_signo?: "positivo" | "negativo";
  /** Multiplica el importe por −1 (p. ej. MyInvestor: inversiones como gastos). */
  invertir_importe?: boolean;
}

export interface ImportRule {
  id: string;
  nombre: string;
  persona: PersonaValue;
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
  tablaDestino: TablaDestino | null;
  ignorar: boolean;
  categoria: string | null;
  tipo: string | null;
  nombre: string | null;
  entidad: string | null;
  persona: PersonaValue;
  importe: number;
}

export interface ClassifiedPending extends PendingMovement {
  classification: Classification;
  ignorar: boolean;
  /** Regla ImportRules de mayor prioridad que coincidió; null = solo clasificación por signo. */
  reglaId: string | null;
  reglaNombre: string | null;
  reglaPrioridad: number;
  tablaDestino: TablaDestino | null;
  categoria: string | null;
  tipo: string | null;
  nombre: string | null;
  entidad: string | null;
}

/** Destino en formulario de reglas (incluye transferencias a ignorar). */
export type DestinoRegla = TablaDestino | "__ignorar__";

export type ConditionKind = "exacto" | "contiene" | "importe_positivo" | "importe_negativo";

export interface ImportRuleInput {
  nombre: string;
  /** Ignorado en la API: siempre se asigna la Persona del usuario logueado. */
  persona?: PersonaValue;
  activa: boolean;
  alcance: RuleScope;
  cuenta: string | null;
  prioridad: number;
  condition: RuleCondition;
  actions: RuleActions;
}
