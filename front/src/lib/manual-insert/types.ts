export type InsertTable = "Gastos" | "Ingresos" | "Inversiones" | "Patrimonio";

export type PersonaValue = "Santi" | "Sandra" | "Común";

export interface ManualInsertOptions {
  categoriaGastos: string[];
  fuenteGastos: string[];
  categoriaIngresos: string[];
  origenIngresos: string[];
  tipoInversiones: string[];
  entidadInversiones: string[];
  tipoPatrimonio: string[];
  entidadPatrimonio: string[];
  propiedadesPatrimonio: string[];
  persona: PersonaValue[];
}

export interface GastosRowInput {
  fecha: string;
  cantidad: string;
  destino: string;
  fuente: string;
  persona: PersonaValue | "";
  categoria: string;
}

export interface IngresosRowInput {
  fecha: string;
  ingreso: string;
  origen: string;
  persona: PersonaValue | "";
  categoria: string;
}

export interface InversionesRowInput {
  fecha: string;
  importe: string;
  nombre: string;
  tipo: string;
  entidad: string;
  persona: PersonaValue | "";
}

export interface PatrimonioRowInput {
  entidad: string;
  nombre: string;
  /** Valor total del activo/deuda antes de aplicar titularidad (€, siempre positivo en UI). */
  valor: string;
  tipo: string;
  persona: PersonaValue | "";
  /** Unidades de cripto (solo BTC): si se rellena, el Valor en € se calcula al guardar. */
  unidades?: string;
  /** Etiqueta de propiedad para agrupar activo + hipoteca en el desglose inmobiliario. */
  propiedad?: string;
  /** Porcentaje de titularidad (1–100). Vacío = 100 %. */
  porcentaje?: string;
}

export interface PatrimonioSnapshotInput {
  fecha: string;
  defaultPersona: PersonaValue | "";
  rows: PatrimonioRowInput[];
}

export type FieldErrors = Record<string, string | undefined>;
