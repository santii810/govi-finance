import {
  BarChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Text,
  useHostTheme,
} from "cursor/canvas";

function MetricCard({
  title,
  value,
  previousLabel,
  previousValue,
}: {
  title: string;
  value: string;
  previousLabel: string;
  previousValue: string;
}) {
  return (
    <Card>
      <CardHeader>{title}</CardHeader>
      <CardBody>
        <Stat value={value} label="EUR" />
        <Text tone="tertiary" size="small" style={{ marginTop: 8 }}>
          {previousLabel}: {previousValue}
        </Text>
      </CardBody>
    </Card>
  );
}

const MONTHS = ["Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr", "May", "Jun"];

const INGRESOS = [1580, 1720, 1650, 1890, 1740, 1920, 1810, 1690, 1780, 1850, 1730, 2060];
const GASTOS = [710, 680, 740, 690, 720, 760, 730, 700, 750, 680, 750, 820];

export default function HomepageV0() {
  const theme = useHostTheme();
  const shellBorder = `1px solid ${theme.stroke.tertiary}`;

  return (
    <Stack gap={16} style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <Stack gap={4}>
        <H1>Homepage — propuesta shell</H1>
        <Text tone="secondary">
          Sin título en el área de dashboard; pestaña activa indica la vista.
        </Text>
      </Stack>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <Row
            align="center"
            justify="space-between"
            style={{
              padding: "12px 20px",
              borderBottom: shellBorder,
              background: theme.bg.chrome,
            }}
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
                Tareas pendientes
                <Pill size="sm" style={{ marginLeft: 6 }}>
                  3
                </Pill>
              </Button>
              <Button variant="primary">+ Insertar</Button>
              <Button variant="ghost">Santi ▾</Button>
            </Row>
          </Row>

          <Row gap={4} style={{ padding: "8px 16px", borderBottom: shellBorder }}>
            <Button variant="primary">Resumen</Button>
            <Button variant="ghost">Gastos</Button>
            <Button variant="ghost">Ingresos</Button>
            <Button variant="ghost">+</Button>
          </Row>

          <Stack gap={16} style={{ padding: 20 }}>
            <Grid columns={3} gap={12}>
              <MetricCard
                title="Balance del mes"
                value="1.240 €"
                previousLabel="Mes anterior"
                previousValue="980 €"
              />
              <MetricCard
                title="Gastos del mes"
                value="820 €"
                previousLabel="Mes anterior"
                previousValue="750 €"
              />
              <MetricCard
                title="Ingresos del mes"
                value="2.060 €"
                previousLabel="Mes anterior"
                previousValue="1.730 €"
              />
            </Grid>

            <Card>
              <CardHeader>Ingresos y gastos — últimos 12 meses</CardHeader>
              <CardBody>
                <BarChart
                  categories={MONTHS}
                  series={[
                    { name: "Ingresos", data: INGRESOS, tone: "success" },
                    { name: "Gastos", data: GASTOS, tone: "danger" },
                  ]}
                  height={220}
                  valueSuffix=" €"
                  beginAtZero
                />
                <Text tone="tertiary" size="small" style={{ marginTop: 8 }}>
                  Datos de ejemplo para Santi · jul 2024 – jun 2025 · comunes al 50%
                </Text>
              </CardBody>
            </Card>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
