import type { ReactNode } from "react";

interface GastosMetricCardProps {
  children: ReactNode;
  centered?: boolean;
  className?: string;
}

export function GastosMetricCard({ children, centered = false, className = "" }: GastosMetricCardProps) {
  const base =
    "flex h-full flex-col justify-center rounded-2xl border border-border bg-card p-5 shadow-sm";
  const align = centered ? " items-center text-center" : "";
  return <div className={`${base}${align}${className ? ` ${className}` : ""}`}>{children}</div>;
}
