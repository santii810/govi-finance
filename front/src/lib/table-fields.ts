/** Columnas mínimas por tabla para agregaciones en dashboards (menos payload). */
export const GASTOS_FIELDS = ["Date", "Cantidad", "Persona", "Categoría", "Destino", "Ubicación"] as const;
export const INGRESOS_FIELDS = ["Fecha", "Ingreso", "Persona", "Origen", "Categoría"] as const;
export const INVERSIONES_FIELDS = ["Fecha", "Importe", "Persona", "Entidad", "Tipo", "Nombre"] as const;

/** Solo lo necesario para el dashboard Resumen (gráfico + tarjetas). */
export const RESUMEN_GASTOS_FIELDS = ["Date", "Cantidad", "Persona"] as const;
export const RESUMEN_INGRESOS_FIELDS = ["Fecha", "Ingreso", "Persona"] as const;
export const RESUMEN_INVERSIONES_FIELDS = ["Fecha", "Importe", "Persona"] as const;
export const PATRIMONIO_FIELDS = ["Fecha", "Valor", "Persona", "Tipo", "Nombre"] as const;

export const PENDING_ACTION_FIELDS = [
  "Id",
  "Fecha",
  "Importe",
  "Concepto",
  "Banco",
  "Persona",
  "Metadatos",
  "IdempotencyKey",
  "Estado",
] as const;
