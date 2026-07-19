"use client";

import { useCallback, useState } from "react";
import type { PivotDetailSelection } from "@/components/pivot-detail-modal";
import type { PivotDrilldownMove } from "@/lib/pivot-drilldown";

interface UseGastosDrilldownOptions {
  filterQuery: string;
  view: "overview" | "nombre" | "viajes";
}

export function useGastosDrilldown({ filterQuery, view }: UseGastosDrilldownOptions) {
  const [selection, setSelection] = useState<PivotDetailSelection | null>(null);
  const [moves, setMoves] = useState<PivotDrilldownMove[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchMoves = useCallback(
    async (rowLabel: string, colLabel: string) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams(filterQuery);
        params.set("view", view);
        params.set("row", rowLabel);
        params.set("col", colLabel);
        const res = await fetch(`/api/dashboard/gastos/details?${params}`);
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "Error al cargar movimientos");
        }
        const json = (await res.json()) as { moves?: PivotDrilldownMove[] };
        setMoves(json.moves ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        setMoves([]);
      } finally {
        setLoading(false);
      }
    },
    [filterQuery, view],
  );

  const openCell = useCallback(
    async (rowLabel: string, colLabel: string) => {
      setSelection({ rowLabel, colLabel });
      setMoves([]);
      await fetchMoves(rowLabel, colLabel);
    },
    [fetchMoves],
  );

  const reload = useCallback(async () => {
    if (!selection) return;
    await fetchMoves(selection.rowLabel, selection.colLabel);
  }, [selection, fetchMoves]);

  const close = useCallback(() => {
    setSelection(null);
    setMoves([]);
    setError("");
    setLoading(false);
  }, []);

  return { selection, moves, loading, error, openCell, close, reload };
}
