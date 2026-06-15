import {
  BarChart,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H3,
  LineChart,
  Pill,
  Row,
  Select,
  Stack,
  Stat,
  Swatch,
  Table,
  Text,
  UsageBar,
  useCanvasState,
  useHostTheme,
  type Color,
} from "cursor/canvas";

type SubTab = "general" | "vida" | "supermercado" | "piso" | "viajes" | "restauracion";

const YEARS = [
  "2026", "2025", "2024", "2023", "2022", "2021", "2020",
  "2019", "2018", "2017", "2016", "2015", "2014", "2013", "2012",
];

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const CATEGORY_COLORS: Record<string, Color> = {
  Piso: "blue",
  Supermercado: "orange",
  Viaxes: "purple",
  Hogar: "green",
  Transporte: "yellow",
  Restauración: "pink",
  Salud: "gray",
  Dumas: "blue",
  Ocio: "orange",
  Belleza: "purple",
  ReformaPiso: "green",
};

const MONTHLY_BY_YEAR_CAT: Record<string, Record<string, number[]>> = {
  "2026": {
    Piso: [609, 609, 609, 609, 609, 0, 0, 0, 0, 0, 0, 0],
    Supermercado: [380, 390, 400, 395, 393, 0, 0, 0, 0, 0, 0, 0],
    Viaxes: [0, 0, 500, 700, 723, 0, 0, 0, 0, 0, 0, 0],
    Hogar: [240, 250, 248, 257, 257, 0, 0, 0, 0, 0, 0, 0],
    Transporte: [110, 115, 118, 117, 117, 0, 0, 0, 0, 0, 0, 0],
    Restauración: [80, 85, 88, 90, 86, 0, 0, 0, 0, 0, 0, 0],
    Salud: [40, 42, 44, 45, 44, 0, 0, 0, 0, 0, 0, 0],
    Dumas: [38, 40, 41, 40, 41, 0, 0, 0, 0, 0, 0, 0],
    Ocio: [15, 16, 17, 16, 16, 0, 0, 0, 0, 0, 0, 0],
    Belleza: [5, 5, 6, 5, 6, 0, 0, 0, 0, 0, 0, 0],
  },
  "2025": {
    Piso: [609, 609, 609, 609, 609, 609, 609, 609, 609, 609, 609, 609],
    Supermercado: [340, 350, 355, 360, 365, 370, 375, 380, 385, 390, 395, 400],
    Viaxes: [200, 150, 400, 300, 500, 600, 800, 400, 200, 100, 0, 300],
    Hogar: [200, 210, 215, 220, 225, 230, 235, 240, 245, 250, 255, 260],
    Transporte: [90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145],
    Restauración: [60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115],
    Salud: [30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52],
    Dumas: [30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52],
    Ocio: [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32],
    Belleza: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  },
};

const SUPER_BY_STORE: Record<string, Record<string, number>> = {
  "2026": { Mercadona: 1240, Carrefour: 420, Lidl: 185, Dia: 68, Eroski: 45 },
  "2025": { Mercadona: 2100, Carrefour: 780, Lidl: 340, Dia: 120, Eroski: 90, Alcampo: 55 },
};

const PISO_BY_NAME: Record<string, Record<string, number>> = {
  "2026": { Hipoteca: 3045, Comunidad: 425, IBI: 180, Seguro: 100, Suministros: 294 },
  "2025": { Hipoteca: 7308, Comunidad: 1020, IBI: 360, Seguro: 240, Suministros: 680, Reparación: 320 },
};

const PISO_MONTHLY_BY_NAME: Record<string, Record<string, number[]>> = {
  "2026": {
    Hipoteca: [609, 609, 609, 609, 609, 0, 0, 0, 0, 0, 0, 0],
    Comunidad: [85, 85, 85, 85, 85, 0, 0, 0, 0, 0, 0, 0],
    IBI: [0, 0, 0, 180, 0, 0, 0, 0, 0, 0, 0, 0],
    Seguro: [20, 20, 20, 20, 20, 0, 0, 0, 0, 0, 0, 0],
    Suministros: [55, 62, 48, 71, 58, 0, 0, 0, 0, 0, 0, 0],
  },
  "2025": {
    Hipoteca: [609, 609, 609, 609, 609, 609, 609, 609, 609, 609, 609, 609],
    Comunidad: [85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85],
    IBI: [0, 0, 0, 180, 0, 0, 0, 0, 180, 0, 0, 0],
    Seguro: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
    Suministros: [52, 58, 61, 54, 49, 55, 62, 57, 60, 53, 48, 51],
    Reparación: [0, 0, 120, 0, 0, 0, 200, 0, 0, 0, 0, 0],
  },
};

/** Viajes agrupados por año; cada fila = un viaje (campo Nombre). */
const VIAJES_BY_YEAR: Record<string, Array<{ nombre: string; total: number }>> = {
  "2026": [{ nombre: "Lisboa", total: 1923 }],
  "2025": [
    { nombre: "París", total: 1450 },
    { nombre: "Bilbao", total: 980 },
    { nombre: "Camino Norte", total: 1320 },
  ],
  "2024": [
    { nombre: "Porto", total: 890 },
    { nombre: "Madrid", total: 520 },
  ],
};

const RECENT_MOVES: Record<string, Array<[string, string, number]>> = {
  Supermercado: [
    ["28 may", "Mercadona — compra semanal", 87],
    ["25 may", "Carrefour", 62],
    ["21 may", "Mercadona", 94],
    ["18 may", "Lidl", 41],
    ["14 may", "Mercadona", 78],
  ],
  Piso: [
    ["1 may", "Hipoteca — cuota mensual", 609],
    ["1 abr", "Hipoteca — cuota mensual", 609],
    ["1 mar", "Hipoteca — cuota mensual", 609],
  ],
  Viaxes: [
    ["22 may", "Vuelo Santiago — Lisboa", 186],
    ["20 may", "Airbnb Lisboa (3 noches)", 287],
    ["15 abr", "Renfe — AVE Madrid", 94],
  ],
  Restauración: [
    ["26 may", "Cena — Taberna do Bispo", 48],
    ["19 may", "Almuerzo — work café", 14],
    ["11 may", "Cena — sushi", 62],
  ],
};

/** Cada mes: importes individuales (un segmento del stacked = un ticket). */
const RESTAURACION_EXPENSES: Record<string, number[]> = {
  "2025-01": [28, 22, 35, 18],
  "2025-02": [45, 32, 28],
  "2025-03": [38, 24, 19, 15, 12],
  "2025-04": [42, 36],
  "2025-05": [52, 48, 42, 38, 35, 28, 22, 18],
  "2025-06": [40, 34, 29, 25],
  "2025-07": [55],
  "2025-08": [48, 41],
  "2025-09": [36, 32, 28, 24, 20],
  "2025-10": [44],
  "2025-11": [],
  "2025-12": [],
  "2026-01": [38, 30, 26, 22],
  "2026-02": [62],
  "2026-03": [45, 40, 35, 28],
  "2026-04": [58, 52, 48, 42, 38, 85],
  "2026-05": [48, 14, 62, 36],
};

const SUB_TABS: Array<{ id: SubTab; label: string; section: "vistas" | "categorias" }> = [
  { id: "general", label: "Totales", section: "vistas" },
  { id: "vida", label: "Gastos de vida", section: "vistas" },
  { id: "supermercado", label: "Supermercado", section: "categorias" },
  { id: "piso", label: "Piso", section: "categorias" },
  { id: "viajes", label: "Viaxes", section: "categorias" },
  { id: "restauracion", label: "Restauración", section: "categorias" },
];

const VIDA_EXCLUDED = new Set(["Viaxes", "ReformaPiso"]);

const NAME_COLORS: Color[] = ["orange", "blue", "green", "yellow", "purple", "pink", "gray"];

/** Mes inclusive simulando «a hoy» en datos de ejemplo (mayo). */
const YTD_MONTH_IDX = 4;

function colorMapForKeys(keys: string[]): Record<string, Color> {
  return Object.fromEntries(keys.map((k, i) => [k, NAME_COLORS[i % NAME_COLORS.length]]));
}

function fmt(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n) + " €";
}

function fmtShort(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")} mil`;
  return String(n);
}

function fmtK(n: number): number {
  return Number((n / 1000).toFixed(1));
}

function sumYtd(values: number[]): number {
  return values.slice(0, YTD_MONTH_IDX + 1).reduce((a, b) => a + b, 0);
}

function previousYear(year: string): string | null {
  const prev = String(parseInt(year, 10) - 1);
  return YEARS.includes(prev) ? prev : null;
}

function fmtDeltaVsLastYear(currentYtd: number, previousYtd: number): string {
  const delta = currentYtd - previousYtd;
  const abs = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.abs(delta));
  if (delta > 0) return `+${abs} € vs año pasado a hoy`;
  if (delta < 0) return `−${abs} € vs año pasado a hoy`;
  return `±0 € vs año pasado a hoy`;
}

function ytdDeltaForYears(
  selectedYears: string[],
  getYtdForYear: (year: string) => number,
): { delta: number; label: string } | null {
  const refYear = selectedYears[0];
  const prevYear = refYear ? previousYear(refYear) : null;
  if (!refYear || !prevYear) return null;
  const currentYtd = getYtdForYear(refYear);
  const previousYtd = getYtdForYear(prevYear);
  const delta = currentYtd - previousYtd;
  return { delta, label: fmtDeltaVsLastYear(currentYtd, previousYtd) };
}

function TotalApuntadoCard({
  displayValue,
  ytdComparison,
}: {
  displayValue: string;
  ytdComparison: { delta: number; label: string } | null;
}) {
  const theme = useHostTheme();
  const deltaColor =
    ytdComparison == null
      ? undefined
      : ytdComparison.delta > 0
        ? theme.diff.stripRemoved
        : ytdComparison.delta < 0
          ? theme.category.green
          : theme.text.tertiary;

  return (
    <Card>
      <CardHeader>Total apuntado</CardHeader>
      <CardBody style={{ textAlign: "center" }}>
        <Stat value={displayValue} label="EUR" tone="danger" />
        {ytdComparison && (
          <Text size="small" style={{ marginTop: 8, color: deltaColor, textAlign: "center" }}>
            {ytdComparison.label}
          </Text>
        )}
      </CardBody>
    </Card>
  );
}

function ytdCategoryTotal(year: string, keys: string[]): number {
  return keys.reduce((sum, key) => sum + sumYtd(MONTHLY_BY_YEAR_CAT[year]?.[key] ?? []), 0);
}

function ytdByNameTotal(
  source: Record<string, Record<string, number[]>>,
  year: string,
  names: string[],
): number {
  return names.reduce((sum, name) => sum + sumYtd(source[year]?.[name] ?? []), 0);
}

function monthKeysForYears(years: string[]): string[] {
  const sorted = [...years].sort();
  const keys: string[] = [];
  for (const year of sorted) {
    for (let m = 1; m <= 12; m++) {
      keys.push(`${year}-${String(m).padStart(2, "0")}`);
    }
  }
  return keys;
}

function stackedExpenseSeries(
  monthKeys: string[],
  expensesByMonth: Record<string, number[]>,
): Array<{ name: string; data: number[] }> {
  const sortedByMonth = monthKeys.map((k) => [...(expensesByMonth[k] ?? [])].sort((a, b) => b - a));
  const maxSlots = Math.max(0, ...sortedByMonth.map((arr) => arr.length));
  return Array.from({ length: maxSlots }, (_, slot) => ({
    name: `Ticket ${slot + 1}`,
    data: sortedByMonth.map((arr) => arr[slot] ?? 0),
  }));
}

function inRange(year: string, from: string, to: string): boolean {
  return year >= from && year <= to;
}

function yearsForFilter(filterMode: string, yearFrom: string, yearTo: string): string[] {
  const latest = YEARS[0];
  const oldest = YEARS[YEARS.length - 1];
  const from =
    filterMode === "all" ? oldest :
    filterMode === "last5" ? "2022" :
    filterMode === "current" ? latest :
    yearFrom;
  const to =
    filterMode === "all" || filterMode === "last5" || filterMode === "current" ? latest : yearTo;
  return YEARS.filter((y) => inRange(y, from, to));
}

function aggregateByName(
  source: Record<string, Record<string, number>>,
  selectedYears: string[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const year of selectedYears) {
    for (const [name, amount] of Object.entries(source[year] ?? {})) {
      result[name] = (result[name] ?? 0) + amount;
    }
  }
  return result;
}

function aggregateMonthlyByName(
  source: Record<string, Record<string, number[]>>,
  selectedYears: string[],
  names: string[],
): Array<{ month: string; values: Record<string, number>; total: number }> {
  return MONTH_LABELS.map((month, idx) => {
    const values: Record<string, number> = {};
    let total = 0;
    for (const name of names) {
      const v = selectedYears.reduce((sum, year) => sum + (source[year]?.[name]?.[idx] ?? 0), 0);
      values[name] = v;
      total += v;
    }
    return { month, values, total };
  });
}

function categoriesForTab(tab: SubTab): string[] {
  const fromYear = MONTHLY_BY_YEAR_CAT["2026"] ?? {};
  const all = Object.keys(fromYear);
  if (tab === "vida") return all.filter((k) => !VIDA_EXCLUDED.has(k));
  if (tab === "general") return all;
  const map: Record<Exclude<SubTab, "general" | "vida">, string> = {
    supermercado: "Supermercado",
    piso: "Piso",
    viajes: "Viaxes",
    restauracion: "Restauración",
  };
  return [map[tab as Exclude<SubTab, "general" | "vida">]];
}

function aggregateCategories(tab: SubTab, selectedYears: string[]): Record<string, number> {
  const keys = categoriesForTab(tab);
  const result: Record<string, number> = {};
  for (const key of keys) {
    result[key] = selectedYears.reduce((sum, year) => {
      const months = MONTHLY_BY_YEAR_CAT[year]?.[key] ?? [];
      return sum + months.reduce((a, b) => a + b, 0);
    }, 0);
  }
  return result;
}

function aggregateMonthlyTable(tab: SubTab, selectedYears: string[]): Array<{ month: string; values: Record<string, number>; total: number }> {
  const keys = categoriesForTab(tab);
  return MONTH_LABELS.map((month, idx) => {
    const values: Record<string, number> = {};
    let total = 0;
    for (const key of keys) {
      const v = selectedYears.reduce((sum, year) => sum + (MONTHLY_BY_YEAR_CAT[year]?.[key]?.[idx] ?? 0), 0);
      values[key] = v;
      total += v;
    }
    return { month, values, total };
  });
}

function categoryLabel(tab: SubTab): string | null {
  const labels: Partial<Record<SubTab, string>> = {
    supermercado: "Supermercado",
    piso: "Piso",
    viajes: "Viaxes",
    restauracion: "Restauración",
  };
  return labels[tab] ?? null;
}

function YearRangeFilter({
  filterMode,
  onFilterMode,
  yearFrom,
  onYearFrom,
  yearTo,
  onYearTo,
}: {
  filterMode: string;
  onFilterMode: (v: string) => void;
  yearFrom: string;
  onYearFrom: (v: string) => void;
  yearTo: string;
  onYearTo: (v: string) => void;
}) {
  return (
    <Row gap={12} align="center" wrap>
      <Text weight="medium" size="small">Período</Text>
      <Select
        value={filterMode}
        onChange={onFilterMode}
        options={[
          { value: "current", label: "Año en curso" },
          { value: "all", label: "Todo el histórico" },
          { value: "last5", label: "Últimos 5 años" },
          { value: "range", label: "Rango personalizado" },
        ]}
        style={{ minWidth: 180 }}
      />
      {filterMode === "range" && (
        <>
          <Text tone="tertiary" size="small">Desde</Text>
          <Select value={yearFrom} onChange={onYearFrom} options={YEARS.map((y) => ({ value: y, label: y }))} />
          <Text tone="tertiary" size="small">Hasta</Text>
          <Select value={yearTo} onChange={onYearTo} options={YEARS.map((y) => ({ value: y, label: y }))} />
        </>
      )}
    </Row>
  );
}

function TreemapGrid({
  data,
  border,
  colorMap,
}: {
  data: Record<string, number>;
  border: string;
  colorMap: Record<string, Color>;
}) {
  const theme = useHostTheme();
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 3,
        height: 148,
        border,
        borderRadius: 8,
        overflow: "hidden",
        background: theme.bg.elevated,
      }}
    >
      {sorted.map(([name, value], i) => {
        const pct = total > 0 ? (value / total) * 100 : 0;
        const colorKey = colorMap[name] ?? NAME_COLORS[i % NAME_COLORS.length];
        return (
          <div
            key={name}
            style={{
              flex: `1 1 ${Math.max(12, Math.round(pct))}%`,
              maxWidth: pct > 25 ? "100%" : `${Math.max(20, Math.round(pct * 1.4))}%`,
              minHeight: 44,
              padding: "6px 8px",
              background: theme.category[colorKey],
              color: theme.bg.editor,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              overflow: "hidden",
            }}
          >
            <Text weight="medium" size="small" style={{ color: "inherit", opacity: 0.95, lineHeight: 1.2 }}>
              {name}
            </Text>
            <Text weight="medium" style={{ color: "inherit", fontSize: 13, lineHeight: 1.2 }}>
              {fmt(value)}
            </Text>
          </div>
        );
      })}
    </div>
  );
}

function SidebarNav({
  active,
  onSelect,
  border,
}: {
  active: SubTab;
  onSelect: (id: SubTab) => void;
  border: string;
}) {
  const theme = useHostTheme();
  const vistas = SUB_TABS.filter((t) => t.section === "vistas");
  const cats = SUB_TABS.filter((t) => t.section === "categorias");

  const itemStyle = (selected: boolean) => ({
    display: "block" as const,
    width: "100%",
    textAlign: "left" as const,
    padding: "6px 8px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    lineHeight: 1.3,
    background: selected ? theme.fill.secondary : "transparent",
    color: selected ? theme.text.primary : theme.text.secondary,
    fontWeight: selected ? 500 : 400,
  });

  return (
    <Stack
      gap={12}
      style={{
        width: 128,
        flexShrink: 0,
        padding: "12px 8px",
        borderRight: border,
        background: theme.palette.sidebar,
        alignSelf: "stretch",
      }}
    >
      <Stack gap={6}>
        <Text tone="tertiary" size="small" weight="medium">
          Vistas
        </Text>
        {vistas.map((t) => (
          <button key={t.id} type="button" style={itemStyle(active === t.id)} onClick={() => onSelect(t.id)}>
            {t.label}
          </button>
        ))}
      </Stack>
      <Stack gap={6}>
        <Text tone="tertiary" size="small" weight="medium">
          Por categoría
        </Text>
        {cats.map((t) => (
          <button key={t.id} type="button" style={itemStyle(active === t.id)} onClick={() => onSelect(t.id)}>
            {t.label}
          </button>
        ))}
      </Stack>
    </Stack>
  );
}

function OverviewContent({
  tab,
  selectedYears,
  border,
}: {
  tab: "general" | "vida";
  selectedYears: string[];
  border: string;
}) {
  const data = aggregateCategories(tab, selectedYears);
  const keys = Object.keys(data).sort((a, b) => data[b] - data[a]);
  const total = keys.reduce((sum, k) => sum + data[k], 0);
  const records = tab === "general" ? 196 : 156;
  const monthlyRows = aggregateMonthlyTable(tab, selectedYears);
  const categoryTotals = keys.reduce<Record<string, number>>((acc, k) => {
    acc[k] = monthlyRows.reduce((sum, row) => sum + row.values[k], 0);
    return acc;
  }, {});
  const grandTotal = monthlyRows.reduce((sum, row) => sum + row.total, 0);

  const usageSegments = keys.map((k) => ({
    id: k,
    value: data[k],
    color: CATEGORY_COLORS[k] ?? ("gray" as Color),
  }));

  const rankedKeys = [...keys].sort((a, b) => data[b] - data[a]);
  const rankedValuesK = rankedKeys.map((k) => fmtK(data[k]));

  const tableHeaders = ["Mes", ...keys, "Total"];
  const tableRows = monthlyRows.map((row) => [
    row.month,
    ...keys.map((k) => (row.values[k] > 0 ? fmt(row.values[k]) : "·")),
    row.total > 0 ? fmt(row.total) : "·",
  ]);
  const totalRow = [
    "Total",
    ...keys.map((k) => fmt(categoryTotals[k])),
    fmt(grandTotal),
  ];

  const ytdDelta = ytdDeltaForYears(selectedYears, (year) => ytdCategoryTotal(year, categoriesForTab(tab)));

  return (
    <Stack gap={16}>
      <Grid columns={2} gap={12}>
        <TotalApuntadoCard displayValue={fmtShort(total)} ytdComparison={ytdDelta} />
        <Card>
          <CardHeader>Registros</CardHeader>
          <CardBody>
            <Stat value={String(records)} label="movimientos" />
          </CardBody>
        </Card>
      </Grid>

      <Stack gap={8}>
        <H3 style={{ margin: 0 }}>Distribución por categoría</H3>
        <UsageBar
          total={total}
          segments={usageSegments}
          topLeftLabel={`${keys.length} categorías`}
          topRightLabel={fmt(total)}
        />
        <TreemapGrid data={data} border={border} colorMap={colorMapForKeys(keys)} />
      </Stack>

      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Ranking por categoría</CardHeader>
          <CardBody>
            <BarChart
              categories={rankedKeys}
              series={[{ name: "Gastos", data: rankedValuesK, tone: "danger" }]}
              height={220}
              valueSuffix=" k"
              horizontal
              showValues
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Participación (%)</CardHeader>
          <CardBody>
            <Stack gap={8}>
              {keys.slice(0, 6).map((k) => {
                const pct = total > 0 ? (data[k] / total) * 100 : 0;
                return (
                  <div key={k}>
                    <Row align="center" gap={8}>
                      <Swatch color={CATEGORY_COLORS[k] ?? "gray"} />
                      <Text size="small" style={{ flex: 1 }}>
                        {k}
                      </Text>
                      <Text size="small" weight="medium">
                        {pct.toFixed(0)} %
                      </Text>
                      <Text tone="tertiary" size="small">
                        {fmt(data[k])}
                      </Text>
                    </Row>
                  </div>
                );
              })}
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Stack gap={8}>
        <H3 style={{ margin: 0 }}>Categoría × cantidad</H3>
        <div style={{ overflowX: "auto" }}>
          <Table
            headers={tableHeaders}
            columnAlign={["left", ...keys.map(() => "right" as const), "right"]}
            rows={[...tableRows, totalRow]}
          />
        </div>
      </Stack>
    </Stack>
  );
}

function NombreDetailContent({
  sectionLabel,
  byNameSource,
  monthlyByNameSource,
  categoryKey,
  selectedYears,
  moves,
  showMonthlyTable,
}: {
  sectionLabel: string;
  byNameSource: Record<string, Record<string, number>>;
  monthlyByNameSource: Record<string, Record<string, number[]>>;
  categoryKey: string;
  selectedYears: string[];
  moves: Array<[string, string, number]>;
  showMonthlyTable: boolean;
}) {
  const theme = useHostTheme();
  const border = `1px solid ${theme.stroke.tertiary}`;
  const byName = aggregateByName(byNameSource, selectedYears);
  const nameKeys = Object.keys(byName).sort((a, b) => byName[b] - byName[a]);
  const colors = colorMapForKeys(nameKeys);
  const total = nameKeys.reduce((sum, k) => sum + byName[k], 0);
  const monthly = MONTH_LABELS.map((_, idx) =>
    selectedYears.reduce((sum, year) => sum + (MONTHLY_BY_YEAR_CAT[year]?.[categoryKey]?.[idx] ?? 0), 0),
  );
  const monthsWithData = monthly.filter((v) => v > 0).length;
  const monthlyAvg = monthsWithData > 0 ? total / monthsWithData : 0;

  const usageSegments = nameKeys.map((k) => ({
    id: k,
    value: byName[k],
    color: colors[k],
  }));

  const monthlyRows = showMonthlyTable
    ? aggregateMonthlyByName(monthlyByNameSource, selectedYears, nameKeys)
    : [];
  const nameTotals = nameKeys.reduce<Record<string, number>>((acc, k) => {
    acc[k] = monthlyRows.reduce((sum, row) => sum + row.values[k], 0);
    return acc;
  }, {});
  const tableGrandTotal = monthlyRows.reduce((sum, row) => sum + row.total, 0);

  const ytdDelta = ytdDeltaForYears(selectedYears, (year) => {
    const names = Object.keys(byNameSource[year] ?? {});
    if (names.length > 0 && Object.keys(monthlyByNameSource).length > 0) {
      return ytdByNameTotal(monthlyByNameSource, year, names);
    }
    return sumYtd(MONTHLY_BY_YEAR_CAT[year]?.[categoryKey] ?? []);
  });

  return (
    <Stack gap={16}>
      <Grid columns={2} gap={12}>
        <TotalApuntadoCard displayValue={fmt(total)} ytdComparison={ytdDelta} />
        <Card>
          <CardHeader>Media mensual</CardHeader>
          <CardBody>
            <Stat value={fmt(Math.round(monthlyAvg))} label="EUR" />
          </CardBody>
        </Card>
      </Grid>

      <Stack gap={8}>
        <H3 style={{ margin: 0 }}>{sectionLabel}</H3>
        <UsageBar total={total} segments={usageSegments} topRightLabel={fmt(total)} />
        <TreemapGrid data={byName} border={border} colorMap={colors} />
      </Stack>

      <Card>
        <CardHeader>Ranking por nombre</CardHeader>
        <CardBody>
          <BarChart
            categories={nameKeys}
            series={[{ name: "Gastos", data: nameKeys.map((k) => fmtK(byName[k])), tone: "danger" }]}
            height={200}
            valueSuffix=" k"
            horizontal
            showValues
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Evolución mensual</CardHeader>
        <CardBody>
          <LineChart
            categories={MONTH_LABELS}
            series={[{ name: categoryKey, data: monthly, tone: "danger" }]}
            height={200}
            valueSuffix=" €"
            showValues
          />
        </CardBody>
      </Card>

      {showMonthlyTable && (
        <Stack gap={8}>
          <H3 style={{ margin: 0 }}>Gastos mensuales</H3>
          <div style={{ overflowX: "auto" }}>
            <Table
              headers={["Mes", ...nameKeys, "Total"]}
              columnAlign={["left", ...nameKeys.map(() => "right" as const), "right"]}
              rows={[
                ...monthlyRows.map((row) => [
                  row.month,
                  ...nameKeys.map((k) => (row.values[k] > 0 ? fmt(row.values[k]) : "·")),
                  row.total > 0 ? fmt(row.total) : "·",
                ]),
                ["Total", ...nameKeys.map((k) => fmt(nameTotals[k])), fmt(tableGrandTotal)],
              ]}
            />
          </div>
        </Stack>
      )}

      <Stack gap={8}>
        <H3 style={{ margin: 0 }}>Últimos movimientos</H3>
        <Table
          headers={["Fecha", "Concepto", "Importe"]}
          columnAlign={["left", "left", "right"]}
          rows={moves.map(([fecha, concepto, importe]) => [fecha, concepto, fmt(importe)])}
        />
      </Stack>
    </Stack>
  );
}

function SupermercadoDetailContent({ selectedYears }: { selectedYears: string[] }) {
  return (
    <NombreDetailContent
      sectionLabel="Por supermercado"
      byNameSource={SUPER_BY_STORE}
      monthlyByNameSource={{}}
      categoryKey="Supermercado"
      selectedYears={selectedYears}
      moves={RECENT_MOVES.Supermercado ?? []}
      showMonthlyTable={false}
    />
  );
}

function PisoDetailContent({ selectedYears }: { selectedYears: string[] }) {
  return (
    <NombreDetailContent
      sectionLabel="Por concepto"
      byNameSource={PISO_BY_NAME}
      monthlyByNameSource={PISO_MONTHLY_BY_NAME}
      categoryKey="Piso"
      selectedYears={selectedYears}
      moves={RECENT_MOVES.Piso ?? []}
      showMonthlyTable={true}
    />
  );
}

function ViajesDetailContent({ selectedYears }: { selectedYears: string[] }) {
  const theme = useHostTheme();
  const border = `1px solid ${theme.stroke.tertiary}`;
  const cellPad = "8px 12px";

  const yearsShown = [...selectedYears].sort((a, b) => b.localeCompare(a));
  const blocks = yearsShown
    .map((year) => ({
      year,
      trips: VIAJES_BY_YEAR[year] ?? [],
    }))
    .filter((b) => b.trips.length > 0);

  const total = blocks.reduce((sum, b) => sum + b.trips.reduce((s, t) => s + t.total, 0), 0);
  const tripCount = blocks.reduce((sum, b) => sum + b.trips.length, 0);

  const ytdDelta = ytdDeltaForYears(selectedYears, (year) =>
    sumYtd(MONTHLY_BY_YEAR_CAT[year]?.Viaxes ?? []),
  );

  return (
    <Stack gap={16}>
      <Grid columns={2} gap={12}>
        <TotalApuntadoCard displayValue={fmt(total)} ytdComparison={ytdDelta} />
        <Card>
          <CardHeader>Viajes</CardHeader>
          <CardBody style={{ textAlign: "center" }}>
            <Stat value={String(tripCount)} label="en el período" />
          </CardBody>
        </Card>
      </Grid>

      <Stack gap={8}>
        <H3 style={{ margin: 0 }}>Viajes por año</H3>
        <div style={{ overflowX: "auto", border, borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: border, background: theme.bg.chrome }}>
                <th style={{ textAlign: "left", padding: cellPad, fontWeight: 500 }}>Año</th>
                <th style={{ textAlign: "left", padding: cellPad, fontWeight: 500 }}>Viaje</th>
                <th style={{ textAlign: "right", padding: cellPad, fontWeight: 500 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => {
                const yearTotal = block.trips.reduce((s, t) => s + t.total, 0);
                return (
                  <>
                    {block.trips.map((trip, i) => (
                      <tr key={`${block.year}-${trip.nombre}`} style={{ borderBottom: border }}>
                        <td style={{ padding: cellPad, fontWeight: i === 0 ? 600 : 400, verticalAlign: "top" }}>
                          {i === 0 ? block.year : ""}
                        </td>
                        <td style={{ padding: cellPad }}>{trip.nombre}</td>
                        <td style={{ padding: cellPad, textAlign: "right" }}>{fmt(trip.total)}</td>
                      </tr>
                    ))}
                    <tr key={`${block.year}-total`} style={{ background: theme.fill.tertiary, borderBottom: border }}>
                      <td style={{ padding: cellPad }} />
                      <td style={{ padding: cellPad, fontWeight: 600 }}>Total {block.year}</td>
                      <td style={{ padding: cellPad, textAlign: "right", fontWeight: 600 }}>{fmt(yearTotal)}</td>
                    </tr>
                  </>
                );
              })}
              {blocks.length > 1 && (
                <tr style={{ background: theme.fill.secondary }}>
                  <td style={{ padding: cellPad }} />
                  <td style={{ padding: cellPad, fontWeight: 600 }}>Total período</td>
                  <td style={{ padding: cellPad, textAlign: "right", fontWeight: 600 }}>{fmt(total)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Stack>

      <Callout tone="neutral" title="Pendiente">
        Detalle de cada viaje con desglose por subcategoría (por definir).
      </Callout>
    </Stack>
  );
}

function RestauracionDetailContent({ selectedYears }: { selectedYears: string[] }) {
  const monthKeys = monthKeysForYears(selectedYears);
  const monthsWithData = monthKeys.filter((k) => (RESTAURACION_EXPENSES[k] ?? []).length > 0);
  const stackedSeries = stackedExpenseSeries(monthsWithData, RESTAURACION_EXPENSES);

  const tableRows = monthsWithData.map((key) => {
    const tickets = RESTAURACION_EXPENSES[key] ?? [];
    const total = tickets.reduce((a, b) => a + b, 0);
    const match = key.match(/^(\d{4})-(\d{2})$/);
    const year = match?.[1] ?? "";
    const month = match?.[2] ?? "01";
    const monthLabel = `${MONTH_LABELS[parseInt(month, 10) - 1]} ${year.slice(2)}`;
    return { key, monthLabel, total, tickets: tickets.length };
  });

  const total = tableRows.reduce((sum, r) => sum + r.total, 0);
  const ticketCount = tableRows.reduce((sum, r) => sum + r.tickets, 0);
  const monthsWithDataCount = tableRows.length;
  const monthlyAvg = monthsWithDataCount > 0 ? total / monthsWithDataCount : 0;

  const ytdDelta = ytdDeltaForYears(selectedYears, (year) =>
    sumYtd(MONTHLY_BY_YEAR_CAT[year]?.Restauración ?? []),
  );

  const chartCategories = tableRows.map((r) => r.key);

  return (
    <Stack gap={16}>
      <Grid columns={2} gap={12}>
        <TotalApuntadoCard displayValue={fmt(total)} ytdComparison={ytdDelta} />
        <Card>
          <CardHeader>Media mensual</CardHeader>
          <CardBody style={{ textAlign: "center" }}>
            <Stat value={fmt(Math.round(monthlyAvg))} label="EUR" />
          </CardBody>
        </Card>
      </Grid>

      <Card>
        <CardHeader>Gasto mensual y diversificación</CardHeader>
        <CardBody>
          <BarChart
            categories={chartCategories}
            series={stackedSeries}
            height={240}
            stacked
            valueSuffix=" €"
            beginAtZero
          />
        </CardBody>
      </Card>

      <Stack gap={8}>
        <H3 style={{ margin: 0 }}>Resumen mensual</H3>
        <div style={{ overflowX: "auto" }}>
          <Table
            headers={["Mes", "Total", "Tickets"]}
            columnAlign={["left", "right", "right"]}
            rows={[
              ...tableRows.map((r) => [r.monthLabel, fmt(r.total), String(r.tickets)]),
              ["Total", fmt(total), String(ticketCount)],
            ]}
          />
        </div>
      </Stack>

      <Stack gap={8}>
        <H3 style={{ margin: 0 }}>Últimos movimientos</H3>
        <Table
          headers={["Fecha", "Concepto", "Importe"]}
          columnAlign={["left", "left", "right"]}
          rows={(RECENT_MOVES.Restauración ?? []).map(([fecha, concepto, importe]) => [
            fecha,
            concepto,
            fmt(importe),
          ])}
        />
      </Stack>
    </Stack>
  );
}

export default function GastosV0() {
  const theme = useHostTheme();
  const shellBorder = `1px solid ${theme.stroke.tertiary}`;
  const [subTab, setSubTab] = useCanvasState<SubTab>("subTab", "vida");
  const [filterMode, setFilterMode] = useCanvasState("filterMode", "current");
  const [yearFrom, setYearFrom] = useCanvasState("yearFrom", "2026");
  const [yearTo, setYearTo] = useCanvasState("yearTo", "2026");
  const selectedYears = yearsForFilter(filterMode, yearFrom, yearTo);

  const isOverview = subTab === "general" || subTab === "vida";

  return (
    <Stack gap={12} style={{ padding: 16, maxWidth: 960, margin: "0 auto" }}>
      <H1>Dashboard Gastos — propuesta v0</H1>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <Row
            align="center"
            justify="space-between"
            style={{ padding: "10px 16px", borderBottom: shellBorder, background: theme.bg.chrome }}
          >
            <Row align="center" gap={12}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: theme.fill.tertiary,
                  border: shellBorder,
                }}
              />
              <H3 style={{ margin: 0, fontSize: 15 }}>Finanzas</H3>
            </Row>
            <Row align="center" gap={8}>
              <Button variant="secondary">
                Tareas <Pill size="sm" style={{ marginLeft: 4 }}>2</Pill>
              </Button>
              <Button variant="primary">+ Insertar</Button>
              <Button variant="ghost">Santi ▾</Button>
            </Row>
          </Row>

          <Row gap={4} style={{ padding: "6px 12px", borderBottom: shellBorder }}>
            <Button variant="ghost">Resumen</Button>
            <Button variant="primary">Gastos</Button>
            <Button variant="ghost">Ingresos</Button>
            <Button variant="ghost">Inversión</Button>
            <Button variant="ghost">Patrimonio</Button>
            <Button variant="ghost">+</Button>
          </Row>

          <div style={{ display: "flex", alignItems: "stretch", width: "100%" }}>
            <SidebarNav active={subTab} onSelect={setSubTab} border={shellBorder} />

            <Stack gap={12} style={{ flex: 1, minWidth: 0, padding: 16, overflow: "auto" }}>
              <YearRangeFilter
                filterMode={filterMode}
                onFilterMode={setFilterMode}
                yearFrom={yearFrom}
                onYearFrom={setYearFrom}
                yearTo={yearTo}
                onYearTo={setYearTo}
              />

              {isOverview ? (
                <OverviewContent tab={subTab} selectedYears={selectedYears} border={shellBorder} />
              ) : subTab === "supermercado" ? (
                <SupermercadoDetailContent selectedYears={selectedYears} />
              ) : subTab === "piso" ? (
                <PisoDetailContent selectedYears={selectedYears} />
              ) : subTab === "viajes" ? (
                <ViajesDetailContent selectedYears={selectedYears} />
              ) : subTab === "restauracion" ? (
                <RestauracionDetailContent selectedYears={selectedYears} />
              ) : null}
            </Stack>
          </div>
        </CardBody>
      </Card>
    </Stack>
  );
}
