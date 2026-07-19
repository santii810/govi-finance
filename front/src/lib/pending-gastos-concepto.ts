/** Quita el prefijo verboso de pagos con tarjeta de Revolut. */
export function stripRevolutCardPrefix(concepto: string): string {
  return concepto.replace(/^Pago con tarjeta\s*[—–-]\s*/i, "").trim();
}

/** Concepto a guardar/editar en Gastos cuando no hay Destino de una regla. */
export function defaultGastosConcepto(concepto: string | null | undefined): string {
  const raw = concepto?.trim() ?? "";
  if (!raw) return "";
  return stripRevolutCardPrefix(raw) || raw;
}
