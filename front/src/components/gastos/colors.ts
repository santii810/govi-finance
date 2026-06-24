export const CATEGORY_COLORS: Record<string, string> = {
  Piso: "#2563eb",
  Supermercado: "#ea580c",
  Viaxes: "#9333ea",
  Hogar: "#16a34a",
  Transporte: "#ca8a04",
  Restauración: "#db2777",
  Salud: "#64748b",
  Dumas: "#2563eb",
  Ocio: "#ea580c",
  Belleza: "#9333ea",
  ReformaPiso: "#16a34a",
};

export const NAME_COLORS = [
  "#ea580c",
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#db2777",
  "#0891b2",
  "#64748b",
];

export function colorMapForKeys(keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k, i) => [k, categoryColor(k, i)]));
}

export function categoryColor(name: string, index = 0): string {
  return CATEGORY_COLORS[name] ?? NAME_COLORS[index % NAME_COLORS.length];
}

export function siteColorMap(siteNames: string[]): Record<string, string> {
  const unique = [...new Set(siteNames)].sort((a, b) => a.localeCompare(b, "es"));
  return Object.fromEntries(unique.map((site, i) => [site, categoryColor(site, i)]));
}
