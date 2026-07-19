export const PATRIMONIO_TIPO_ORDER = [
  "Liquidez",
  "Renta variable",
  "Crypto",
  "Inmobiliario",
  "Hipoteca",
  "Otro",
];

export function normalizePatrimonioTipo(tipo: string): string {
  return tipo.trim().toLowerCase();
}

export function isInmobiliarioTipo(tipo: string): boolean {
  return normalizePatrimonioTipo(tipo) === "inmobiliario";
}

export function isHipotecaTipo(tipo: string): boolean {
  return normalizePatrimonioTipo(tipo) === "hipoteca";
}

export function usesPropiedad(tipo: string): boolean {
  const t = normalizePatrimonioTipo(tipo);
  return t === "inmobiliario" || t === "hipoteca";
}

export function usesTitularidad(tipo: string): boolean {
  return usesPropiedad(tipo);
}

export function parsePorcentajeTitularidad(value: string | undefined): number {
  if (!value || value.trim() === "") return 100;
  return Number(value.replace(",", "."));
}

export function computePatrimonioShare(valorTotal: number, porcentaje: number): number {
  return Number((valorTotal * (porcentaje / 100)).toFixed(2));
}

/** Valor en € que se guarda en NocoDB (negativo para hipoteca). */
export function computeStoredPatrimonioValor(
  valorTotal: number,
  porcentaje: number,
  tipo: string,
): number {
  const share = computePatrimonioShare(valorTotal, porcentaje);
  return isHipotecaTipo(tipo) ? -Math.abs(share) : share;
}

export function buildPatrimonioDetalle(input: {
  valorTotal: number;
  porcentaje: number;
  propiedad?: string;
}): Record<string, unknown> {
  const detalle: Record<string, unknown> = {
    valor_total: input.valorTotal,
    porcentaje: input.porcentaje,
  };
  const propiedad = input.propiedad?.trim();
  if (propiedad) detalle.propiedad = propiedad;
  return detalle;
}

export function parseDetallePatrimonio(value: unknown): {
  propiedad: string | null;
  valorTotal: number | null;
  porcentaje: number | null;
} {
  let detalle: Record<string, unknown> | null = null;
  if (value && typeof value === "object") detalle = value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      detalle = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      detalle = null;
    }
  }

  const propiedad =
    detalle && typeof detalle.propiedad === "string" && detalle.propiedad.trim()
      ? detalle.propiedad.trim()
      : null;

  const valorTotalRaw = detalle?.valor_total;
  const valorTotal =
    typeof valorTotalRaw === "number" && Number.isFinite(valorTotalRaw) ? valorTotalRaw : null;

  const porcentajeRaw = detalle?.porcentaje;
  const porcentaje =
    typeof porcentajeRaw === "number" && Number.isFinite(porcentajeRaw) ? porcentajeRaw : null;

  return { propiedad, valorTotal, porcentaje };
}

export function isLegacyInmobiliarioDeuda(tipo: string, amount: number): boolean {
  return isInmobiliarioTipo(tipo) && amount < 0;
}

const ACCIONES_NOMBRE_LABELS = new Set([
  "acción",
  "accion",
  "accións",
  "accions",
  "acciones",
]);

export function isAccionesNombre(nombre: string): boolean {
  return ACCIONES_NOMBRE_LABELS.has(nombre.trim().toLowerCase());
}

export function isAccionesPatrimonioRecord(tipo: string, nombre: string): boolean {
  return normalizePatrimonioTipo(tipo) === "renta variable" && isAccionesNombre(nombre);
}

/** Empresa concreta en Nombre; si es la etiqueta genérica «Accións», usa Entidad (broker). */
export function accionesEmpresaKey(nombre: string, entidad: string | null): string {
  if (!isAccionesNombre(nombre)) return nombre.trim() || "Sin nombre";
  const broker = entidad?.trim();
  return broker || nombre.trim() || "Sin nombre";
}
