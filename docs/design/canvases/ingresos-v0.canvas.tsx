import {
  BarChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H3,
  LineChart,
  PieChart,
  Pill,
  Row,
  Select,
  Stack,
  Stat,
  Table,
  Text,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

const YEARS = [
  "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019",
  "2020", "2021", "2022", "2023", "2024", "2025",
];

const YEARLY_TOTALS: Record<string, number> = {
  "2012": 800, "2013": 3138, "2014": 6245, "2015": 7435, "2016": 8438,
  "2017": 11706, "2018": 14499, "2019": 12031, "2020": 20184, "2021": 19468,
  "2022": 27041, "2023": 26832, "2024": 29399, "2025": 31750,
};

const ORIGEN_TOTALS: Record<string, number> = {
  Alineasol: 120416, Optare: 27740, Casa: 26088, Extra: 25783, Mecd: 15363, Uvigo: 3575,
};

const CATEGORIA_TOTALS: Record<string, number> = {
  Programador: 149700, Camarero: 27013, Casa: 24850, Becas: 15363, Profesor: 2031,
};

const PIVOT: Record<string, Record<string, number>> = {
  "2023": { Extra: 1200, Optare: 3200, Casa: 4100, Mecd: 0, Alineasol: 18332, Uvigo: 0 },
  "2024": { Extra: 2100, Optare: 3800, Casa: 4500, Mecd: 800, Alineasol: 18199, Uvigo: 0 },
  "2025": { Extra: 2400, Optare: 4200, Casa: 4800, Mecd: 900, Alineasol: 19450, Uvigo: 0 },
};

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const HEATMAP: Record<string, number[]> = {
  "2023": [1820, 1950, 2100, 2050, 2200, 2300, 2150, 2100, 2250, 2400, 2350, 2162],
  "2024": [2060, 2180, 2450, 2300, 2500, 2600, 2550, 2400, 2650, 2800, 2700, 2609],
  "2025": [2200, 2350, 2600, 2500, 2700, 2800, 2750, 2650, 2900, 3000, 2950, 2750],
};

function fmt(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n) + " €";
}

function fmtShort(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

function inRange(year: string, from: string, to: string): boolean {
  return year >= from && year <= to;
}

function heatCellStyle(value: number, max: number, accentColor: string) {
  const intensity = max > 0 ? value / max : 0;
  const alpha = intensity > 0 ? 0.12 + intensity * 0.55 : 0;
  const bg =
    alpha > 0 && accentColor.length === 7
      ? `${accentColor}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`
      : undefined;
  return {
    padding: "6px 8px",
    textAlign: "right" as const,
    fontSize: 11,
    background: bg,
    borderBottom: "1px solid var(--stroke-tertiary, rgba(128,128,128,0.2))",
  };
}

export default function IngresosV0() {
  const theme = useHostTheme();
  const shellBorder = `1px solid ${theme.stroke.tertiary}`;
  const [filterMode, setFilterMode] = useCanvasState("filterMode", "all");
  const [yearFrom, setYearFrom] = useCanvasState("yearFrom", "2012");
  const [yearTo, setYearTo] = useCanvasState("yearTo", "2025");

  const from = filterMode === "all" ? "2012" : filterMode === "last5" ? "2021" : yearFrom;
  const to = filterMode === "all" ? "2025" : filterMode === "last5" ? "2025" : yearTo;

  const filteredYears = YEARS.filter((y) => inRange(y, from, to));
  const lineData = filteredYears.map((y) => YEARLY_TOTALS[y] ?? 0);
  const periodTotal = lineData.reduce((a, b) => a + b, 0);
  const monthsInPeriod = filteredYears.length * 12;
  const monthlyAvg = monthsInPeriod > 0 ? periodTotal / monthsInPeriod : 0;
  const currentYearTotal = YEARLY_TOTALS["2025"] ?? 0;

  const origenKeys = Object.keys(ORIGEN_TOTALS);
  const catKeys = Object.keys(CATEGORIA_TOTALS);
  const scale = filterMode === "all" ? 1 : filteredYears.length / YEARS.length;

  const pivotYears = filteredYears.filter((y) => PIVOT[y]).slice(-3);

  return (
    <Stack gap={16} style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <Stack gap={4}>
        <H1>Dashboard Ingresos — propuesta v0</H1>
        <Text tone="secondary">
          Pestaña Ingresos · filtro de años · datos de ejemplo (Santi, histórico real)
        </Text>
      </Stack>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <Row
            align="center"
            justify="space-between"
            style={{ padding: "12px 20px", borderBottom: shellBorder, background: theme.bg.chrome }}
          >
            <Row align="center" gap={12}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: theme.fill.tertiary, border: shellBorder }} />
              <H3 style={{ margin: 0 }}>Finanzas</H3>
            </Row>
            <Row align="center" gap={10}>
              <Button variant="secondary">Tareas <Pill size="sm" style={{ marginLeft: 6 }}>0</Pill></Button>
              <Button variant="primary">+ Insertar</Button>
              <Button variant="ghost">Santi ▾</Button>
            </Row>
          </Row>

          <Row gap={4} style={{ padding: "8px 16px", borderBottom: shellBorder }}>
            <Button variant="ghost">Resumen</Button>
            <Button variant="ghost">Gastos</Button>
            <Button variant="primary">Ingresos</Button>
            <Button variant="ghost">+</Button>
          </Row>

          <Stack gap={16} style={{ padding: 20 }}>
            <Row gap={12} align="center" wrap>
              <Text weight="medium">Período</Text>
              <Select
                value={filterMode}
                onChange={setFilterMode}
                options={[
                  { value: "all", label: "Todo el histórico" },
                  { value: "last5", label: "Últimos 5 años" },
                  { value: "range", label: "Rango personalizado" },
                ]}
                style={{ minWidth: 180 }}
              />
              {filterMode === "range" && (
                <>
                  <Text tone="tertiary">Desde</Text>
                  <Select value={yearFrom} onChange={setYearFrom} options={YEARS.map((y) => ({ value: y, label: y }))} />
                  <Text tone="tertiary">Hasta</Text>
                  <Select value={yearTo} onChange={setYearTo} options={YEARS.map((y) => ({ value: y, label: y }))} />
                </>
              )}
              <Text tone="tertiary" size="small">
                {from} – {to} · comunes al 50%
              </Text>
            </Row>

            <Grid columns={3} gap={12}>
              <Card>
                <CardHeader>Total en período</CardHeader>
                <CardBody><Stat value={fmt(periodTotal)} label="EUR" tone="success" /></CardBody>
              </Card>
              <Card>
                <CardHeader>Año en curso (2025)</CardHeader>
                <CardBody><Stat value={fmt(currentYearTotal)} label="EUR" tone="success" /></CardBody>
              </Card>
              <Card>
                <CardHeader>Media mensual</CardHeader>
                <CardBody><Stat value={fmt(monthlyAvg)} label="EUR" /></CardBody>
              </Card>
            </Grid>

            <Card>
              <CardHeader>Ingresos por año</CardHeader>
              <CardBody>
                <LineChart
                  categories={filteredYears}
                  series={[{ name: "Ingresos", data: lineData, tone: "success" }]}
                  height={220}
                  valueSuffix=" €"
                  showValues={filteredYears.length <= 14}
                />
                <Text tone="tertiary" size="small" style={{ marginTop: 8 }}>
                  Fuente: tabla Ingresos · {from}–{to} · EUR
                </Text>
              </CardBody>
            </Card>

            <Grid columns={2} gap={12}>
              <Card>
                <CardHeader>Por origen</CardHeader>
                <CardBody>
                  <BarChart
                    categories={origenKeys}
                    series={[{ name: "Ingresos", data: origenKeys.map((k) => Math.round(ORIGEN_TOTALS[k] * scale)) }]}
                    height={200}
                    valueSuffix=" €"
                    horizontal
                    showValues
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader>Por categoría</CardHeader>
                <CardBody>
                  <BarChart
                    categories={catKeys}
                    series={[{ name: "Ingresos", data: catKeys.map((k) => Math.round(CATEGORIA_TOTALS[k] * scale)) }]}
                    height={200}
                    valueSuffix=" €"
                    horizontal
                    showValues
                  />
                </CardBody>
              </Card>
            </Grid>

            <Grid columns={2} gap={12}>
              <Card>
                <CardHeader>Distribución por origen</CardHeader>
                <CardBody>
                  <PieChart
                    donut
                    size={200}
                    data={origenKeys.map((k) => ({ label: k, value: Math.round(ORIGEN_TOTALS[k] * scale) }))}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader>Distribución por categoría</CardHeader>
                <CardBody>
                  <PieChart
                    donut
                    size={200}
                    data={catKeys.map((k) => ({ label: k, value: Math.round(CATEGORIA_TOTALS[k] * scale) }))}
                  />
                </CardBody>
              </Card>
            </Grid>

            <Stack gap={8}>
              <H3 style={{ margin: 0 }}>Año × origen</H3>
              <Table
                headers={["Año", "Extra", "Optare", "Casa", "Mecd", "Alineasol", "Total"]}
                columnAlign={["left", "right", "right", "right", "right", "right", "right"]}
                rows={pivotYears.map((y) => {
                  const row = PIVOT[y];
                  const total = Object.values(row).reduce((a, b) => a + b, 0);
                  return [y, ...["Extra", "Optare", "Casa", "Mecd", "Alineasol"].map((k) => fmt(row[k] ?? 0)), fmt(total)];
                })}
              />
              <Text tone="tertiary" size="small">En la web: celdas con intensidad de color (heatmap)</Text>
            </Stack>

            <Stack gap={8}>
              <H3 style={{ margin: 0 }}>Calendario mensual (mes × año)</H3>
              <div style={{ overflowX: "auto", border: shellBorder, borderRadius: 8 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: 8, textAlign: "left" }}>Año</th>
                      {MONTH_LABELS.map((m) => (
                        <th key={m} style={{ padding: "6px 8px", textAlign: "right", fontWeight: 500 }}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(HEATMAP)
                      .filter((y) => inRange(y, from, to))
                      .map((y) => {
                        const vals = HEATMAP[y];
                        const max = Math.max(...Object.values(HEATMAP).flat());
                        return (
                          <tr key={y}>
                            <td style={{ padding: "6px 8px", fontWeight: 500 }}>{y}</td>
                            {vals.map((v, i) => (
                              <td key={i} style={heatCellStyle(v, max, theme.category.green)}>
                                {v > 0 ? fmtShort(v) : "·"}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <Text tone="tertiary" size="small">
                Fuente: Ingresos · suma mensual · años visibles según filtro
              </Text>
            </Stack>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
