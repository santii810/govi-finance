import { formatEur } from "@/lib/persona";
import type { ResumenMetrics } from "@/lib/types";

interface MetricCardProps {
  title: string;
  value: number;
  previous?: number;
  tone?: "default" | "expense" | "income";
  hideComparison?: boolean;
}

export function MetricCard({
  title,
  value,
  previous = 0,
  tone = "default",
  hideComparison = false,
}: MetricCardProps) {
  const valueClass =
    tone === "expense" ? "text-expense" : tone === "income" ? "text-income" : "text-foreground";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted">{title}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${valueClass}`}>{formatEur(value)}</p>
      {!hideComparison && (
        <p className="mt-2 text-xs text-muted">Mes anterior: {formatEur(previous)}</p>
      )}
    </div>
  );
}

export function MetricsGrid({ metrics }: { metrics: ResumenMetrics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <MetricCard title="Balance del mes" value={metrics.balance} previous={metrics.balancePrev} />
      <MetricCard
        title="Gastos del mes"
        value={metrics.gastos}
        previous={metrics.gastosPrev}
        tone="expense"
      />
      <MetricCard
        title="Ingresos del mes"
        value={metrics.ingresos}
        previous={metrics.ingresosPrev}
        tone="income"
      />
    </div>
  );
}
