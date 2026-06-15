import type { NocoRecord } from "./types";

interface ColumnMeta {
  title: string;
  colOptions?: { options?: { title?: string }[] };
}

export type SelectOptionsMap = Record<string, Set<string>>;

export function parseSelectOptions(columns: ColumnMeta[]): SelectOptionsMap {
  const map: SelectOptionsMap = {};
  for (const col of columns) {
    const options = col.colOptions?.options ?? [];
    if (options.length === 0) continue;
    map[col.title] = new Set(
      options.map((o) => o.title).filter((t): t is string => Boolean(t)),
    );
  }
  return map;
}

export function pickSelectValue(
  field: string,
  value: string | null | undefined,
  options: SelectOptionsMap,
): string | undefined {
  if (!value) return undefined;
  const allowed = options[field];
  if (!allowed || allowed.size === 0) return value;
  return allowed.has(value) ? value : undefined;
}

export function buildRecord(fields: NocoRecord): NocoRecord {
  const out: NocoRecord = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== "") {
      out[key] = value;
    }
  }
  return out;
}
