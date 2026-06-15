"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEur } from "@/lib/persona";
import type { PatrimonioTipoSnapshotRow } from "@/lib/types";

const COLORS = ["#2563eb", "#16a34a", "#ca8a04", "#9333ea", "#64748b", "#dc2626"];

interface GroupedTipoBarChartProps {
  title: string;
  rows: PatrimonioTipoSnapshotRow[];
  tipoKeys: string[];
}

export function GroupedTipoBarChart({ title, rows, tipoKeys }: GroupedTipoBarChartProps) {
  const chartData = rows.map((r) => ({ label: r.label, ...r.values }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-muted">{title}</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#64748b" />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#64748b"
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip formatter={(value: number) => formatEur(value)} />
            <Legend />
            {tipoKeys.map((tipo, i) => (
              <Bar key={tipo} dataKey={tipo} name={tipo} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface InmobiliarioBarChartProps {
  title: string;
  data: Array<{ nombre: string; valorBruto: number; deuda: number }>;
}

export function InmobiliarioBarChart({ title, data }: InmobiliarioBarChartProps) {
  const chartData = data.map((d) => ({
    nombre: d.nombre,
    "Valor bruto": d.valorBruto,
    "Deuda pendiente": d.deuda,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-muted">{title}</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 11 }} stroke="#64748b" />
            <Tooltip formatter={(value: number) => formatEur(value)} />
            <Legend />
            <Bar dataKey="Valor bruto" fill="#2563eb" radius={[0, 2, 2, 0]} />
            <Bar dataKey="Deuda pendiente" fill="#ca8a04" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
