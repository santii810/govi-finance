import {
  BarChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H2,
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

const SNAPSHOTS = ["ene 24", "abr 24", "jul 24", "oct 24", "ene 25", "jun 25"];

const TOTAL_BY_SNAPSHOT: Record<string, number> = {
  "ene 24": 198000,
  "abr 24": 205000,
  "jul 24": 218000,
  "oct 24": 228000,
  "ene 25": 265000,
  "jun 25": 283000,
};

const TIPO_KEYS = ["Liquidez", "Renta variable", "Crypto", "Inmobiliario"] as const;

const BY_TIPO: Record<string, Record<string, number>> = {
  "ene 24": { Liquidez: 38000, "Renta variable": 92000, Crypto: 18000, Inmobiliario: 50000 },
  "abr 24": { Liquidez: 36000, "Renta variable": 96000, Crypto: 19000, Inmobiliario: 54000 },
  "jul 24": { Liquidez: 39000, "Renta variable": 101000, Crypto: 22000, Inmobiliario: 56000 },
  "oct 24": { Liquidez: 40000, "Renta variable": 104000, Crypto: 24000, Inmobiliario: 60000 },
  "ene 25": { Liquidez: 41000, "Renta variable": 112000, Crypto: 26000, Inmobiliario: 86000 },
  "jun 25": { Liquidez: 42000, "Renta variable": 118000, Crypto: 28000, Inmobiliario: 95000 },
};

const LATEST = "jun 25";
const PREVIOUS = "ene 25";

const LATEST_LTV = {
  activosInmobiliarios: 280000,
  deudasInmobiliarias: 185000,
  ltv: 66.1,
};

const RENTA_VARIABLE_BY_NOMBRE: Record<string, number> = {
  "MSCI World": 62000,
  "S&P 500": 34000,
  "Novo Nordisk": 12000,
  "Plan PIAS": 10000,
};

const INMOBILIARIO_DETALLE: Array<{
  nombre: string;
  valorBruto: number;
  deuda: number;
  neto: number;
  ltv: number | null;
}> = [
  { nombre: "Piso Madrid", valorBruto: 280000, deuda: 185000, neto: 95000, ltv: 66.1 },
  { nombre: "Plaza garaje", valorBruto: 25000, deuda: 0, neto: 25000, ltv: null },
  { nombre: "Urbanitae Madrid IV", valorBruto: 15000, deuda: 0, neto: 15000, ltv: null },
];

function fmt(n: number): string {
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(abs);
  if (n < 0) return `−${formatted} €`;
  return `${formatted} €`;
}

function fmtPct(n: number, signed = false): string {
  const prefix = signed && n > 0 ? "+" : "";
  return `${prefix}${n.toFixed(1)} %`;
}

function inRange(label: string, fromIdx: number, toIdx: number): boolean {
  const idx = SNAPSHOTS.indexOf(label);
  return idx >= fromIdx && idx <= toIdx;
}

export default function PatrimonioV0() {
  const theme = useHostTheme();
  const shellBorder = `1px solid ${theme.stroke.tertiary}`;
  const [filterMode, setFilterMode] = useCanvasState("filterMode", "all");
  const [fromSnap, setFromSnap] = useCanvasState("fromSnap", "ene 24");
  const [toSnap, setToSnap] = useCanvasState("toSnap", "jun 25");

  const fromIdx =
    filterMode === "all" ? 0 : filterMode === "last3" ? Math.max(0, SNAPSHOTS.length - 3) : SNAPSHOTS.indexOf(fromSnap);
  const toIdx =
    filterMode === "all" ? SNAPSHOTS.length - 1 : filterMode === "last3" ? SNAPSHOTS.length - 1 : SNAPSHOTS.indexOf(toSnap);

  const filteredSnapshots = SNAPSHOTS.filter((s) => inRange(s, fromIdx, toIdx));
  const lineData = filteredSnapshots.map((s) => TOTAL_BY_SNAPSHOT[s] ?? 0);

  const latestTotal = TOTAL_BY_SNAPSHOT[LATEST] ?? 0;
  const previousTotal = TOTAL_BY_SNAPSHOT[PREVIOUS] ?? 0;
  const delta = latestTotal - previousTotal;
  const deltaPct = previousTotal > 0 ? (delta / previousTotal) * 100 : 0;

  const latestByTipo = BY_TIPO[LATEST] ?? {};
  const tipoLabels = TIPO_KEYS.map((k) => k);
  const latestTipoValues = TIPO_KEYS.map((k) => latestByTipo[k] ?? 0);

  const groupedTipoSeries = TIPO_KEYS.map((tipo) => ({
    name: tipo,
    data: filteredSnapshots.map((s) => BY_TIPO[s]?.[tipo] ?? 0),
  }));

  const rvNombres = Object.keys(RENTA_VARIABLE_BY_NOMBRE);
  const inmoNombres = INMOBILIARIO_DETALLE.map((r) => r.nombre);

  const snapOptions = SNAPSHOTS.map((s) => ({ value: s, label: s }));

  return (
    <Stack gap={16} style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <H1>Dashboard Patrimonio — v0</H1>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <Row
            align="center"
            justify="space-between"
            style={{ padding: "12px 20px", borderBottom: shellBorder, background: theme.bg.chrome }}
          >
            <Row align="center" gap={12}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: theme.fill.tertiary,
                  border: shellBorder,
                }}
              />
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
            <Button variant="ghost">Inversión</Button>
            <Button variant="primary">Patrimonio</Button>
            <Button variant="ghost">Tareas</Button>
          </Row>

          <Stack gap={20} style={{ padding: 20 }}>
            <Stack gap={12}>
              <H2 style={{ margin: 0 }}>Patrimonio actual</H2>

              <Grid columns={3} gap={12}>
                <Card>
                  <CardHeader>Patrimonio neto</CardHeader>
                  <CardBody>
                    <Stat value={fmt(latestTotal)} label={`EUR · ${LATEST}`} />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>Variación vs snapshot anterior</CardHeader>
                  <CardBody>
                    <Stat
                      value={fmt(delta)}
                      label={`${fmtPct(deltaPct, true)} · respecto a ${PREVIOUS}`}
                      tone={delta >= 0 ? "success" : "danger"}
                    />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>LTV inmobiliario</CardHeader>
                  <CardBody>
                    <Stat
                      value={fmtPct(LATEST_LTV.ltv)}
                      label={`Deuda ${fmt(LATEST_LTV.deudasInmobiliarias)} / Activo ${fmt(LATEST_LTV.activosInmobiliarios)}`}
                      tone={LATEST_LTV.ltv > 70 ? "warning" : undefined}
                    />
                  </CardBody>
                </Card>
              </Grid>

              <Grid columns={2} gap={12}>
                <Card>
                  <CardHeader>Diversificación por tipo (€)</CardHeader>
                  <CardBody>
                    <BarChart
                      categories={tipoLabels}
                      series={[{ name: "Patrimonio neto", data: latestTipoValues }]}
                      height={200}
                      valueSuffix=" €"
                      horizontal
                      showValues
                    />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>Diversificación por tipo (%)</CardHeader>
                  <CardBody>
                    <PieChart
                      donut
                      size={200}
                      data={TIPO_KEYS.map((k) => ({
                        label: k,
                        value: latestByTipo[k] ?? 0,
                      }))}
                    />
                  </CardBody>
                </Card>
              </Grid>

              <Grid columns={2} gap={12}>
                <Card>
                  <CardHeader>Renta variable por activo</CardHeader>
                  <CardBody>
                    <BarChart
                      categories={rvNombres}
                      series={[
                        {
                          name: "Valor",
                          data: rvNombres.map((k) => RENTA_VARIABLE_BY_NOMBRE[k] ?? 0),
                          tone: "info",
                        },
                      ]}
                      height={220}
                      valueSuffix=" €"
                      horizontal
                      showValues
                    />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>Inmobiliario por activo</CardHeader>
                  <CardBody>
                    <BarChart
                      categories={inmoNombres}
                      series={[
                        {
                          name: "Valor bruto",
                          data: INMOBILIARIO_DETALLE.map((r) => r.valorBruto),
                          tone: "info",
                        },
                        {
                          name: "Deuda pendiente",
                          data: INMOBILIARIO_DETALLE.map((r) => r.deuda),
                          tone: "warning",
                        },
                      ]}
                      height={220}
                      valueSuffix=" €"
                      horizontal
                      showValues
                    />
                  </CardBody>
                </Card>
              </Grid>

              <Stack gap={8}>
                <Table
                  headers={["Activo", "Valor bruto", "Deuda", "Neto", "LTV"]}
                  columnAlign={["left", "right", "right", "right", "right"]}
                  rows={INMOBILIARIO_DETALLE.map((r) => [
                    r.nombre,
                    fmt(r.valorBruto),
                    r.deuda > 0 ? fmt(r.deuda) : "—",
                    fmt(r.neto),
                    r.ltv != null ? fmtPct(r.ltv) : "—",
                  ])}
                />
              </Stack>
            </Stack>

            <div style={{ borderTop: shellBorder, paddingTop: 20 }}>
              <Stack gap={12}>
                <H2 style={{ margin: 0 }}>Evolución</H2>

                <Row gap={12} align="center" wrap>
                  <Text weight="medium">Período</Text>
                  <Select
                    value={filterMode}
                    onChange={setFilterMode}
                    options={[
                      { value: "all", label: "Todo el histórico" },
                      { value: "last3", label: "Últimos 3 snapshots" },
                      { value: "range", label: "Rango personalizado" },
                    ]}
                    style={{ minWidth: 180 }}
                  />
                  {filterMode === "range" && (
                    <>
                      <Text tone="tertiary">Desde</Text>
                      <Select value={fromSnap} onChange={setFromSnap} options={snapOptions} />
                      <Text tone="tertiary">Hasta</Text>
                      <Select value={toSnap} onChange={setToSnap} options={snapOptions} />
                    </>
                  )}
                </Row>

                <Card>
                  <CardHeader>Patrimonio neto total por snapshot</CardHeader>
                  <CardBody>
                    <LineChart
                      categories={filteredSnapshots}
                      series={[{ name: "Patrimonio neto", data: lineData, tone: "info" }]}
                      height={220}
                      valueSuffix=" €"
                      showValues={filteredSnapshots.length <= 8}
                    />
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>Patrimonio por tipo</CardHeader>
                  <CardBody>
                    <BarChart
                      categories={filteredSnapshots}
                      series={groupedTipoSeries}
                      height={260}
                      valueSuffix=" €"
                      showValues
                    />
                  </CardBody>
                </Card>
              </Stack>
            </div>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
