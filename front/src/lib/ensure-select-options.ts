import type { NocoDbClient } from "./nocodb";

const SELECT_COLORS = [
  "#cfdffe",
  "#d0f1fd",
  "#c2f5e8",
  "#ffdaf6",
  "#ffdce5",
  "#fee2d5",
  "#ffeab6",
  "#d1f7c4",
  "#ede2fe",
] as const;

interface ColumnMeta {
  id?: string;
  title?: string;
  uidt?: string;
  colOptions?: { options?: { title?: string; color?: string }[] };
}

function columnByTitle(columns: ColumnMeta[], title: string): ColumnMeta | undefined {
  return columns.find((col) => col.title === title);
}

/** Añade valores faltantes a una columna SingleSelect en NocoDB (como el importador Excel). */
export async function ensureSelectOptions(
  client: NocoDbClient,
  tableId: string,
  field: string,
  values: Iterable<string>,
): Promise<string[]> {
  const unique = [...new Set([...values].map((v) => v.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const meta = await client.getTableMeta(tableId);
  const column = columnByTitle(meta.columns ?? [], field);
  if (!column?.id || column.uidt !== "SingleSelect") return [];

  const existingOptions = [...(column.colOptions?.options ?? [])];
  const existingTitles = new Set(
    existingOptions.map((o) => o.title).filter((t): t is string => Boolean(t)),
  );
  const missing = unique.filter((v) => !existingTitles.has(v)).sort((a, b) => a.localeCompare(b, "es"));
  if (missing.length === 0) return [];

  const start = existingOptions.length;
  for (const [index, title] of missing.entries()) {
    existingOptions.push({
      title,
      color: SELECT_COLORS[(start + index) % SELECT_COLORS.length],
    });
  }

  await client.patchColumn(column.id, { colOptions: { options: existingOptions } });
  return missing;
}
