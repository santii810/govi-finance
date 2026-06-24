export interface PivotDrilldownMove {
  date: string;
  label: string;
  amount: number;
  meta?: string;
}

export function pivotDetailKey(row: string, col: string): string {
  return `${row}|${col}`;
}

export interface PivotColumnHeatRange {
  min: number;
  max: number;
}

/** Rango min–max por columna (solo filas mensuales, valores > 0). */
export function computePivotColumnHeatRanges(
  rows: Array<{ values: Record<string, number> }>,
  columnKeys: string[],
): Record<string, PivotColumnHeatRange> {
  const ranges: Record<string, PivotColumnHeatRange> = {};
  for (const key of columnKeys) {
    const positives = rows.map((row) => row.values[key] ?? 0).filter((v) => v > 0);
    ranges[key] =
      positives.length === 0
        ? { min: 0, max: 0 }
        : { min: Math.min(...positives), max: Math.max(...positives) };
  }
  return ranges;
}

/** Fondo muy leve según posición del valor dentro del rango de su columna. */
export function pivotCellHeatBg(
  value: number,
  range: PivotColumnHeatRange,
  tone: "expense" | "income" = "expense",
): string {
  if (value <= 0 || range.max <= 0) return "";
  const span = range.max - range.min;
  const ratio = span > 0 ? (value - range.min) / span : 1;
  const alpha = 0.04 + ratio * 0.14;
  const rgb = tone === "expense" ? "220, 38, 38" : "22, 163, 74";
  return `rgba(${rgb}, ${alpha})`;
}

export function formatPivotDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function buildPivotDetails(
  entries: Array<{ rowKey: string; colKey: string; ts: number; move: PivotDrilldownMove }>,
): Record<string, PivotDrilldownMove[]> {
  const raw = new Map<string, Array<{ ts: number; move: PivotDrilldownMove }>>();
  for (const entry of entries) {
    const key = pivotDetailKey(entry.rowKey, entry.colKey);
    if (!raw.has(key)) raw.set(key, []);
    raw.get(key)!.push({ ts: entry.ts, move: entry.move });
  }
  const details: Record<string, PivotDrilldownMove[]> = {};
  for (const [key, items] of raw) {
    details[key] = items.sort((a, b) => b.ts - a.ts).map((item) => item.move);
  }
  return details;
}
