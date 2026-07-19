import { GastosMetricCard } from "@/components/gastos/gastos-metric-card";
import { formatEur } from "@/lib/persona";
import type { GastosYtdComparison } from "@/lib/types";

interface TotalApuntadoCardProps {
  total: number;
  ytdComparison: GastosYtdComparison | null;
}

export function TotalApuntadoCard({ total, ytdComparison }: TotalApuntadoCardProps) {
  const deltaClass =
    ytdComparison == null
      ? "text-muted"
      : ytdComparison.delta > 0
        ? "text-expense"
        : ytdComparison.delta < 0
          ? "text-income"
          : "text-muted";

  return (
    <GastosMetricCard centered>
      <p className="text-sm font-medium text-muted">Total apuntado</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-expense">{formatEur(total)}</p>
      {ytdComparison && (
        <p className={`mt-2 text-xs ${deltaClass}`}>{ytdComparison.label}</p>
      )}
    </GastosMetricCard>
  );
}
