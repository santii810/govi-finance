"use client";

import { useMemo } from "react";
import { ResponsiveContainer, Tooltip, Treemap as RechartsTreemap } from "recharts";
import { formatEur } from "@/lib/persona";

interface TreemapProps {
  data: Record<string, number>;
  colorMap: Record<string, string>;
  bare?: boolean;
  className?: string;
}

interface TreemapNode {
  name: string;
  value: number;
  fill: string;
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

  const showName = width >= 44 && height >= 28;
  const showAmount = width >= 64 && height >= 44;
  const fontSize = width < 80 ? 10 : 11;

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
          y={y + (showAmount ? height - 22 : height - 10)}
          fill="#fff"
          fontSize={fontSize}
          fontWeight={500}
          pointerEvents="none"
        >
          {name.length > Math.floor(width / 7) ? `${name.slice(0, Math.max(4, Math.floor(width / 7) - 1))}…` : name}
        </text>
      )}
      {showAmount && (
        <text x={x + 8} y={y + height - 8} fill="#fff" fontSize={fontSize + 1} fontWeight={600} pointerEvents="none">
          {formatEur(value)}
        </text>
      )}
    </g>
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
        <Tooltip
          formatter={(value: number) => formatEur(value)}
          labelFormatter={(label) => String(label)}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--border)",
            fontSize: 12,
          }}
        />
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
