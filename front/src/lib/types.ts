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
  inversion: number;
}

export interface ResumenData {
  metrics: ResumenMetrics;
  chart: MonthlyBar[];
}

export type { PeriodFilterMode } from "@/lib/period-filter";

export type IngresosFilterMode = import("@/lib/period-filter").PeriodFilterMode;

export interface IngresosMetrics {
  periodTotal: number;
  currentYearTotal: number;
  monthlyAverage: number;
}

export interface NamedAmount {
  name: string;
  total: number;
}

export interface IngresosYearPoint {
  year: string;
  total: number;
}

export interface IngresosPivotRow {
  year: string;
  values: Record<string, number>;
  total: number;
}

export interface IngresosHeatmapRow {
  year: string;
  months: number[];
}

export interface IngresosPivot {
  origenKeys: string[];
  rows: IngresosPivotRow[];
  details: Record<string, import("@/lib/pivot-drilldown").PivotDrilldownMove[]>;
}

export interface IngresosData {
  metrics: IngresosMetrics;
  availableYears: string[];
  yearlyLine: IngresosYearPoint[];
  byOrigen: NamedAmount[];
  byCategoria: NamedAmount[];
  pivot: IngresosPivot;
  heatmap: IngresosHeatmapRow[];
  heatmapDetails: Record<string, import("@/lib/pivot-drilldown").PivotDrilldownMove[]>;
  filter: { mode: IngresosFilterMode; from: string; to: string };
}

export type InversionesFilterMode = IngresosFilterMode;

export interface InversionesPivot {
  entidadKeys: string[];
  rows: IngresosPivotRow[];
  details: Record<string, import("@/lib/pivot-drilldown").PivotDrilldownMove[]>;
}

export interface InversionesData {
  metrics: IngresosMetrics;
  availableYears: string[];
  yearlyLine: IngresosYearPoint[];
  byEntidad: NamedAmount[];
  byTipo: NamedAmount[];
  byNombre: NamedAmount[];
  pivot: InversionesPivot;
  heatmap: IngresosHeatmapRow[];
  filter: { mode: InversionesFilterMode; from: string; to: string };
}

export type PatrimonioFilterMode = IngresosFilterMode;

export interface PatrimonioMetrics {
  neto: number;
  delta: number;
  deltaPct: number;
  ltv: number | null;
  ltvDeuda: number;
  ltvActivo: number;
  latestSnapshotLabel: string;
  previousSnapshotLabel: string | null;
}

export interface InmobiliarioRow {
  nombre: string;
  valorBruto: number;
  deuda: number;
  neto: number;
  ltv: number | null;
}

export interface PatrimonioSnapshotPoint {
  label: string;
  total: number;
}

export interface PatrimonioTipoSnapshotRow {
  label: string;
  values: Record<string, number>;
}

export interface PatrimonioData {
  metrics: PatrimonioMetrics;
  byTipo: NamedAmount[];
  rentaVariableByNombre: NamedAmount[];
  inmobiliario: InmobiliarioRow[];
  evolutionLine: PatrimonioSnapshotPoint[];
  evolutionByTipo: PatrimonioTipoSnapshotRow[];
  tipoKeys: string[];
  availableYears: string[];
  filter: { mode: PatrimonioFilterMode; from: string; to: string };
}

export type GastosSubTab =
  | "general"
  | "vida"
  | "supermercado"
  | "piso"
  | "viajes"
  | "restauracion";

export type GastosFilterMode = import("@/lib/period-filter").PeriodFilterMode;

export interface GastosYtdComparison {
  delta: number;
  label: string;
}

export interface GastosMonthlyRow {
  month: string;
  values: Record<string, number>;
  total: number;
}

export interface GastosMove {
  date: string;
  concept: string;
  amount: number;
}

export interface GastosOverviewData {
  total: number;
  records: number;
  ytdComparison: GastosYtdComparison | null;
  byCategoria: NamedAmount[];
  categoriaKeys: string[];
  monthlyTable: GastosMonthlyRow[];
}

export interface GastosNombreData {
  total: number;
  monthlyAverage: number;
  ytdComparison: GastosYtdComparison | null;
  byNombre: NamedAmount[];
  nameKeys: string[];
  monthlyEvolution: number[];
  monthlyByNombre?: GastosMonthlyRow[];
  recentMoves: GastosMove[];
}

export interface GastosViajeYearBlock {
  year: string;
  trips: { nombre: string; total: number }[];
}

export interface GastosViajesStackedYearRow {
  year: string;
  total: number;
  /** Importe por ubicación (claves dinámicas para Recharts). */
  [ubicacion: string]: number | string;
}

export interface GastosPivotMove {
  date: string;
  destino: string;
  amount: number;
  categoria: string;
}

/** @deprecated Usar PivotDrilldownMove desde pivot-drilldown */
export type { PivotDrilldownMove } from "@/lib/pivot-drilldown";

export interface GastosViajesPivotRow {
  ubicacion: string;
  byCategoria: Record<string, number>;
  total: number;
}

export interface GastosViajesPivot {
  categorias: string[];
  rows: GastosViajesPivotRow[];
  colTotals: Record<string, number>;
  grandTotal: number;
}

export interface GastosViajesData {
  total: number;
  tripCount: number;
  ytdComparison: GastosYtdComparison | null;
  tripsByYear: GastosViajeYearBlock[];
  stackedByYear: GastosViajesStackedYearRow[];
  ubicacionKeys: string[];
  pivot: GastosViajesPivot;
}

export interface GastosRestauracionTicket {
  concept: string;
  amount: number;
}

export interface GastosRestauracionMonthStack {
  monthKey: string;
  monthLabel: string;
  tickets: GastosRestauracionTicket[];
}

export interface GastosRankingSite {
  name: string;
  total: number;
  count: number;
}

export interface GastosRestauracionData {
  total: number;
  monthlyAverage: number;
  ytdComparison: GastosYtdComparison | null;
  stackedByMonth: GastosRestauracionMonthStack[];
  monthlySummary: { monthLabel: string; total: number; tickets: number }[];
  topByVisits: NamedAmount[];
  topBySpending: GastosRankingSite[];
  topExpensiveMeals: NamedAmount[];
  recentMoves: GastosMove[];
}

export type GastosPayload =
  | { kind: "overview"; data: GastosOverviewData }
  | { kind: "nombre"; data: GastosNombreData }
  | { kind: "viajes"; data: GastosViajesData }
  | { kind: "restauracion"; data: GastosRestauracionData };

export interface GastosData {
  subTab: GastosSubTab;
  availableYears: string[];
  filter: { mode: GastosFilterMode; from: string; to: string };
  payload: GastosPayload;
}
