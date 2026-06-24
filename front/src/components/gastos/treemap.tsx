"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  Tooltip,
  Treemap as RechartsTreemap,
  type TooltipProps,
} from "recharts";
import { formatEur } from "@/lib/persona";

interface TreemapProps {
  data: Record<string, number>;
  colorMap: Record<string, string>;
  bare?: boolean;
  className?: string;
}

interface TreemapBreakdownItem {
  name: string;
  value: number;
}

interface TreemapNode {
  name: string;
  value: number;
  fill: string;
  breakdown?: TreemapBreakdownItem[];
}

const MAX_ITEMS = 8;
const OTHERS_COLOR = "#94a3b8";

function prepareNodes(data: Record<string, number>, colorMap: Record<string, string>): TreemapNode[] {
  const sorted = Object.entries(data)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length <= MAX_ITEMS) {
    return sorted.map(([name, value]) => ({
      name,
      value,
      fill: colorMap[name] ?? OTHERS_COLOR,
    }));
  }

  const top = sorted.slice(0, MAX_ITEMS - 1);
  const rest = sorted.slice(MAX_ITEMS - 1);
  const othersValue = rest.reduce((sum, [, value]) => sum + value, 0);

  return [
    ...top.map(([name, value]) => ({
      name,
      value,
      fill: colorMap[name] ?? OTHERS_COLOR,
    })),
    {
      name: `Otros (${rest.length})`,
      value: othersValue,
      fill: OTHERS_COLOR,
      breakdown: rest.map(([name, value]) => ({ name, value })),
    },
  ];
}

interface TreemapCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  fill?: string;
}

function TreemapCell({ x = 0, y = 0, width = 0, height = 0, name = "", value = 0, fill = OTHERS_COLOR }: TreemapCellProps) {
  if (width <= 0 || height <= 0) return null;

  const showName = width >= 66 && height >= 42;
  const showAmount = width >= 96 && height >= 66;
  const fontSize = width < 80 ? 15 : 17;
  const amountFontSize = width < 80 ? 16 : 18;
  const maxChars = Math.max(4, Math.floor(width / 13));
  const displayName =
    name.length > maxChars ? `${name.slice(0, Math.max(4, maxChars - 1))}…` : name;

  const labelStyle = {
    letterSpacing: "1px",
    fontWeight: 300,
  } as const;
  const amountStyle = {
    letterSpacing: "0.6px",
    fontWeight: 400,
  } as const;
  const textOutline = {
    stroke: "rgba(0,0,0,0.3)",
    strokeWidth: 0.25,
    paintOrder: "stroke fill" as const,
  };

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="var(--card)"
        strokeWidth={2}
        rx={4}
        ry={4}
      />
      {showName && (
        <text
          x={x + 8}
          y={y + (showAmount ? height - 38 : height - 14)}
          fill="#fff"
          fontSize={fontSize}
          style={labelStyle}
          {...textOutline}
          pointerEvents="none"
        >
          {displayName}
        </text>
      )}
      {showAmount && (
        <text
          x={x + 8}
          y={y + height - 12}
          fill="#fff"
          fontSize={amountFontSize}
          style={amountStyle}
          {...textOutline}
          pointerEvents="none"
        >
          {formatEur(value)}
        </text>
      )}
    </g>
  );
}

function TreemapTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const node = payload[0]?.payload as TreemapNode | undefined;
  if (!node?.name) return null;

  if (node.breakdown?.length) {
    return (
      <div
        className="max-h-56 overflow-y-auto rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm"
        style={{ fontSize: 12 }}
      >
        <p className="font-medium text-foreground">{node.name}</p>
        <p className="mb-2 mt-0.5 tabular-nums text-muted">{formatEur(node.value)}</p>
        <ul className="space-y-1 border-t border-border pt-2">
          {node.breakdown.map((item) => (
            <li key={item.name} className="flex items-baseline justify-between gap-4">
              <span className="truncate text-foreground">{item.name}</span>
              <span className="shrink-0 tabular-nums text-muted">{formatEur(item.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm"
      style={{ fontSize: 12 }}
    >
      <p className="font-medium text-foreground">{node.name}</p>
      <p className="mt-0.5 tabular-nums text-muted">{formatEur(node.value)}</p>
    </div>
  );
}

export function Treemap({ data, colorMap, bare = false, className }: TreemapProps) {
  const nodes = useMemo(() => prepareNodes(data, colorMap), [data, colorMap]);

  if (nodes.length === 0) {
    return (
      <div
        className={
          bare
            ? `flex items-center justify-center text-sm text-muted ${className ?? "h-full w-full"}`
            : "flex h-52 items-center justify-center rounded-lg border border-border bg-card text-sm text-muted"
        }
      >
        Sin datos
      </div>
    );
  }

  const chart = (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsTreemap
        data={nodes}
        dataKey="value"
        aspectRatio={4 / 3}
        isAnimationActive={false}
        stroke="var(--card)"
        content={<TreemapCell />}
      >
        <Tooltip content={<TreemapTooltip />} />
      </RechartsTreemap>
    </ResponsiveContainer>
  );

  if (bare) {
    return <div className={className ?? "h-full w-full"}>{chart}</div>;
  }

  return (
    <div className="h-52 w-full rounded-lg border border-border bg-card">
      {chart}
    </div>
  );
}
