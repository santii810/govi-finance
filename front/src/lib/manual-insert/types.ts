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
  valor: string;
  tipo: string;
  persona: PersonaValue | "";
}

export interface PatrimonioSnapshotInput {
  fecha: string;
  defaultPersona: PersonaValue | "";
  rows: PatrimonioRowInput[];
}

export type FieldErrors = Record<string, string | undefined>;
