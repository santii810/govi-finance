export type Persona = "Santi" | "Sandra";

export type NocoRecord = Record<string, unknown>;

export interface SessionUser {
  username: string;
  persona: Persona;
}

export interface ResumenMetrics {
  balance: number;
  gastos: number;
  ingresos: number;
  balancePrev: number;
  gastosPrev: number;
  ingresosPrev: number;
}

export interface MonthlyBar {
  month: string;
  label: string;
  ingresos: number;
  gastos: number;
}

export interface ResumenData {
  metrics: ResumenMetrics;
  chart: MonthlyBar[];
}
