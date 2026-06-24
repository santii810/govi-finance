"use client";

import { formatEur } from "@/lib/persona";

interface PivotDrilldownCellProps {
  value: number;
  signed?: boolean;
  empty?: string;
  onClick: () => void;
}

export function PivotDrilldownCell({
  value,
  signed = false,
  empty = "·",
  onClick,
}: PivotDrilldownCellProps) {
  const show = signed ? value !== 0 : value > 0;
  if (!show) {
    return <span className="text-muted">{empty}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-2 hover:bg-background/80 hover:text-foreground"
      title="Ver movimientos"
    >
      {formatEur(value)}
    </button>
  );
}
