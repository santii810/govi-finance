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

const YEARS = ["2021", "2022", "2023", "2024", "2025"];

const YEARLY_NET: Record<string, number> = {
  "2021": 520,
  "2022": 1180,
  "2023": 2460,
  "2024": 4380,
  "2025": 5840,
};

const ENTIDAD_NET: Record<string, number> = {
  "Trade Republic": 6420,
  Indexa: 3180,
  Urbanitae: 1680,
  "MyInvestor PIAS": 1200,
};

const TIPO_NET: Record<string, number> = {
  Crypto: 1980,
  "Fondo indexado": 5560,
  PIAS: 1200,
  Inmobiliario: 1740,
};

const NOMBRE_NET: Record<string, number> = {
  Bitcoin: 960,
  "MSCI World": 2840,
  "Novo Nordisk": 720,
  "Plan PIAS": 1200,
  "Proyecto Madrid": 980,
  Alibaba: 640,
};

const PIVOT: Record<string, Record<string, number>> = {
  "2023": { "Trade Republic": 820, Indexa: 960, Urbanitae: 400, "MyInvestor PIAS": 280 },
  "2024": { "Trade Republic": 1540, Indexa: 1120, Urbanitae: 620, "MyInvestor PIAS": 400, Retiro: -300 },
  "2025": { "Trade Republic": 2180, Indexa: 1100, Urbanitae: 660, "MyInvestor PIAS": 520, Retiro: -620 },
};

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const HEATMAP: Record<string, number[]> = {
  "2023": [180, 0, 200, 220, 0, 240, 200, 180, 220, 240, 200, 280],
  "2024": [320, 280, 340, 300, 360, 380, 400, 420, 380, 400, 360, 240],
  "2025": [480, 420, 520, 500, 540, 560, 580, 620, 500, 480, 460, 280],
};

function fmt(n: number): string {
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(abs);
  if (n < 0) return `−${formatted} €`;
  return `${formatted} €`;
}

function fmtShort(n: number): string {
  const abs = Math.abs(n);
  const prefix = n < 0 ? "−" : "";
  if (abs >= 1000) return `${prefix}${Math.round(abs / 1000)}k`;
  return n === 0 ? "·" : `${prefix}${abs}`;
}

function inRange(year: string, from: string, to: string): boolean {
  return year >= from && year <= to;
}

function heatCellStyle(value: number, max: number, accentColor: string) {
  const abs = Math.abs(value);
  const intensity = max > 0 ? abs / max : 0;
  const alpha = intensity > 0 ? 0.12 + intensity * 0.55 : 0;
  const bg =
    alpha > 0 && accentColor.length === 7
      ? `${accentColor}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`
      : undefined;
  return {
    padding: "6px 8px",
    textAlign: "right" as const,
    fontSize: 11,
    color: value < 0 ? "var(--text-secondary, inherit)" : undefined,
    background: bg,
    borderBottom: "1px solid var(--stroke-tertiary, rgba(128,128,128,0.2))",
  };
}

export default function InversionesV0() {
  const theme = useHostTheme();
  const shellBorder = `1px solid ${theme.stroke.tertiary}`;
  const [filterMode, setFilterMode] = useCanvasState("filterMode", "all");
  const [yearFrom, setYearFrom] = useCanvasState("yearFrom", "2021");
  const [yearTo, setYearTo] = useCanvasState("yearTo", "2025");

  const from = filterMode === "all" ? "2021" : filterMode === "last3" ? "2023" : yearFrom;
  const to = filterMode === "all" ? "2025" : filterMode === "last3" ? "2025" : yearTo;

  const filteredYears = YEARS.filter((y) => inRange(y, from, to));
  const lineData = filteredYears.map((y) => YEARLY_NET[y] ?? 0);
  const periodTotal = lineData.reduce((a, b) => a + b, 0);
  const monthsInPeriod = filteredYears.length * 12;
  const monthlyAvg = monthsInPeriod > 0 ? periodTotal / monthsInPeriod : 0;
  const currentYearTotal = YEARLY_NET["2025"] ?? 0;

  const entidadKeys = Object.keys(ENTIDAD_NET);
  const tipoKeys = Object.keys(TIPO_NET);
  const nombreKeys = Object.keys(NOMBRE_NET);
  const scale = filterMode === "all" ? 1 : filteredYears.length / YEARS.length;

  const pivotYears = filteredYears.filter((y) => PIVOT[y]).slice(-3);
  const pivotEntidades = ["Trade Republic", "Indexa", "Urbanitae", "MyInvestor PIAS"];

  return (
    <Stack gap={16} style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <Stack gap={4}>
        <H1>Dashboard Inversión — propuesta v0</H1>
        <Text tone="secondary">
          Pestaña Inversión · importe neto (+ aportación, − retiro) · datos de ejemplo
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
              <Button variant="secondary">
                Tareas <Pill size="sm" style={{ marginLeft: 6 }}>0</Pill>
              </Button>
              <Button variant="primary">+ Insertar</Button>
              <Button variant="ghost">Santi ▾</Button>
            </Row>
          </Row>

          <Row gap={4} style={{ padding: "8px 16px", borderBottom: shellBorder }}>
            <Button variant="ghost">Resumen</Button>
            <Button variant="ghost">Gastos</Button>
            <Button variant="ghost">Ingresos</Button>
            <Button variant="primary">Inversión</Button>
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
                  { value: "last3", label: "Últimos 3 años" },
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
                {from} – {to} · neto · comunes al 50%
              </Text>
            </Row>

            <Grid columns={3} gap={12}>
              <Card>
                <CardHeader>Total neto en período</CardHeader>
                <CardBody>
                  <Stat value={fmt(periodTotal)} label="EUR aportado − retirado" />
                </CardBody>
              </Card>
              <Card>
                <CardHeader>Año en curso (2025)</CardHeader>
                <CardBody>
                  <Stat value={fmt(currentYearTotal)} label="EUR neto" />
                </CardBody>
              </Card>
              <Card>
                <CardHeader>Media mensual neta</CardHeader>
                <CardBody>
                  <Stat value={fmt(monthlyAvg)} label="EUR / mes" />
                </CardBody>
              </Card>
            </Grid>

            <Card>
              <CardHeader>Inversión neta por año</CardHeader>
              <CardBody>
                <LineChart
                  categories={filteredYears}
                  series={[{ name: "Neto invertido", data: lineData, tone: "info" }]}
                  height={220}
                  valueSuffix=" €"
                  showValues={filteredYears.length <= 8}
                />
                <Text tone="tertiary" size="small" style={{ marginTop: 8 }}>
                  Fuente: tabla Inversiones · suma Importe (+/−) · {from}–{to} · EUR
                </Text>
              </CardBody>
            </Card>

            <Grid columns={2} gap={12}>
              <Card>
                <CardHeader>Por entidad</CardHeader>
                <CardBody>
                  <BarChart
                    categories={entidadKeys}
                    series={[{ name: "Neto", data: entidadKeys.map((k) => Math.round(ENTIDAD_NET[k] * scale)) }]}
                    height={200}
                    valueSuffix=" €"
                    horizontal
                    showValues
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader>Por tipo</CardHeader>
                <CardBody>
                  <BarChart
                    categories={tipoKeys}
                    series={[{ name: "Neto", data: tipoKeys.map((k) => Math.round(TIPO_NET[k] * scale)) }]}
                    height={200}
                    valueSuffix=" €"
                    horizontal
                    showValues
                  />
                </CardBody>
              </Card>
            </Grid>

            <Card>
              <CardHeader>Por nombre (activo / producto)</CardHeader>
              <CardBody>
                <BarChart
                  categories={nombreKeys}
                  series={[{ name: "Neto", data: nombreKeys.map((k) => Math.round(NOMBRE_NET[k] * scale)) }]}
                  height={220}
                  valueSuffix=" €"
                  horizontal
                  showValues
                />
              </CardBody>
            </Card>

            <Grid columns={2} gap={12}>
              <Card>
                <CardHeader>Distribución por entidad</CardHeader>
                <CardBody>
                  <PieChart
                    donut
                    size={200}
                    data={entidadKeys.map((k) => ({ label: k, value: Math.round(ENTIDAD_NET[k] * scale) }))}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader>Distribución por tipo</CardHeader>
                <CardBody>
                  <PieChart
                    donut
                    size={200}
                    data={tipoKeys.map((k) => ({ label: k, value: Math.round(TIPO_NET[k] * scale) }))}
                  />
                </CardBody>
              </Card>
            </Grid>

            <Card>
              <CardHeader>Distribución por nombre</CardHeader>
              <CardBody>
                <PieChart
                  donut
                  size={220}
                  data={nombreKeys.map((k) => ({ label: k, value: Math.round(NOMBRE_NET[k] * scale) }))}
                />
              </CardBody>
            </Card>

            <Stack gap={8}>
              <H3 style={{ margin: 0 }}>Año × entidad (neto)</H3>
              <Table
                headers={["Año", ...pivotEntidades, "Total"]}
                columnAlign={["left", ...pivotEntidades.map(() => "right" as const), "right"]}
                rows={pivotYears.map((y) => {
                  const row = PIVOT[y];
                  const total = Object.values(row).reduce((a, b) => a + b, 0);
                  return [y, ...pivotEntidades.map((k) => fmt(row[k] ?? 0)), fmt(total)];
                })}
              />
              <Text tone="tertiary" size="small">
                En la web: celdas con intensidad de color (heatmap) · retiros en negativo
              </Text>
            </Stack>

            <Stack gap={8}>
              <H3 style={{ margin: 0 }}>Calendario mensual (mes × año)</H3>
              <div style={{ overflowX: "auto", border: shellBorder, borderRadius: 8 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: 8, textAlign: "left" }}>Año</th>
                      {MONTH_LABELS.map((m) => (
                        <th key={m} style={{ padding: "6px 8px", textAlign: "right", fontWeight: 500 }}>
                          {m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(HEATMAP)
                      .filter((y) => inRange(y, from, to))
                      .map((y) => {
                        const vals = HEATMAP[y];
                        const max = Math.max(...Object.values(HEATMAP).flat().map(Math.abs));
                        return (
                          <tr key={y}>
                            <td style={{ padding: "6px 8px", fontWeight: 500 }}>{y}</td>
                            {vals.map((v, i) => (
                              <td key={i} style={heatCellStyle(v, max, theme.category.blue)}>
                                {fmtShort(v)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <Text tone="tertiary" size="small">
                Fuente: Inversiones · neto mensual (Importe con signo) · años visibles según filtro
              </Text>
            </Stack>

            <Stack gap={6} style={{ padding: "12px 0 4px", borderTop: shellBorder }}>
              <Text weight="medium" size="small">
                Campos tabla Inversiones
              </Text>
              <Text tone="secondary" size="small">
                Entidad · Fecha · Nombre · Importe (+ aportación / − retiro) · Tipo · Persona
              </Text>
            </Stack>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
