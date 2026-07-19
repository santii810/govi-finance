"use client";

import { useCallback, useEffect, useState } from "react";
import { LogEntriesTable } from "@/components/log-panel";
import type { LogEntry, LogTableType } from "@/lib/insert-log";
import type { ManualInsertOptions, PersonaValue } from "@/lib/manual-insert/types";

const PAGE_SIZE = 10;

interface InsertRecentLogProps {
  table: LogTableType;
  persona: PersonaValue | "";
  categoria: string;
  refreshKey: number;
  options: ManualInsertOptions;
}

export function InsertRecentLog({
  table,
  persona,
  categoria,
  refreshKey,
  options,
}: InsertRecentLogProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fetchPage = useCallback(
    async (offset: number) => {
      const params = new URLSearchParams({
        tipo: table,
        sort: "fecha",
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (persona) params.set("persona", persona);
      if (categoria.trim()) params.set("categoria", categoria.trim());

      const res = await fetch(`/api/log?${params}`, { cache: "no-store" });
      const body = (await res.json()) as {
        error?: string;
        entries?: LogEntry[];
        hasMore?: boolean;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Error al cargar registros recientes");
      }
      return {
        entries: body.entries ?? [],
        hasMore: Boolean(body.hasMore),
      };
    },
    [table, persona, categoria],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void fetchPage(0)
      .then((page) => {
        if (cancelled) return;
        setEntries(page.entries);
        setHasMore(page.hasMore);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error de conexión");
        setEntries([]);
        setHasMore(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage, refreshKey]);

  async function handleLoadMore() {
    setLoadingMore(true);
    setError("");
    try {
      const page = await fetchPage(entries.length);
      setEntries((prev) => {
        const seen = new Set(prev.map((e) => `${e.tableType}-${e.id}`));
        const appended = page.entries.filter((e) => !seen.has(`${e.tableType}-${e.id}`));
        return [...prev, ...appended];
      });
      setHasMore(page.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-border pt-6">
      <p className="text-sm font-medium">Últimos registros</p>
      {loading && <p className="text-sm text-muted">Cargando…</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-muted">No hay registros con estos filtros.</p>
      )}
      {!loading && entries.length > 0 && (
        <>
          <LogEntriesTable
            entries={entries}
            options={options}
            onEntriesChange={setEntries}
            onError={setError}
            defaultSortColumn="fecha"
            defaultSortDir="desc"
          />
          {hasMore && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void handleLoadMore()}
                className="rounded-lg border border-border px-4 py-1.5 text-sm hover:bg-background disabled:opacity-50"
              >
                {loadingMore ? "Cargando…" : "Cargar más"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
