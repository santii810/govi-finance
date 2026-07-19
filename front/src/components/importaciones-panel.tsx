"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountDumpRow, AccountImportStatus, ImportacionesPayload } from "@/lib/importaciones";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function AccountCard({ account }: { account: AccountImportStatus }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{account.label}</h3>
          <p className="text-sm text-muted">
            {account.banco} · {account.persona}
          </p>
        </div>
        {account.pendingCount > 0 && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-white">
            {account.pendingCount} pendientes
          </span>
        )}
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Último movimiento</dt>
          <dd>{formatDate(account.ultimoMovimiento)}</dd>
        </div>
        <div>
          <dt className="text-muted">Última importación</dt>
          <dd>{formatDateTime(account.ultimaImportacion)}</dd>
        </div>
      </dl>
    </article>
  );
}

function DumpRow({ dump }: { dump: AccountDumpRow }) {
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-sm">{formatDateTime(dump.importedAt)}</td>
      <td className="px-3 py-2 text-sm">{dump.accountLabel ?? "—"}</td>
      <td className="px-3 py-2 text-sm">{dump.nombreFichero || "—"}</td>
      <td className="px-3 py-2 text-sm">
        {formatDate(dump.fechaPrimerRegistro)} → {formatDate(dump.fechaUltimoRegistro)}
      </td>
      <td className="px-3 py-2 text-right text-sm tabular-nums">{dump.numRegistros}</td>
      <td className="px-3 py-2 text-right text-sm tabular-nums">{dump.numInsertados}</td>
      <td className="px-3 py-2 text-right text-sm tabular-nums">{dump.numOmitidos}</td>
    </tr>
  );
}

export function ImportacionesPanel() {
  const [data, setData] = useState<ImportacionesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/importaciones", { cache: "no-store" });
      const body = (await res.json()) as ImportacionesPayload & { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Error al cargar importaciones");
      }
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importaciones</h1>
        <p className="mt-1 text-sm text-muted">
          Estado de las cuentas activas y historial de cargas por fichero.
        </p>
      </div>

      {loading && <p className="text-sm text-muted">Cargando…</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && data && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Cuentas activas</h2>
            {data.accounts.length === 0 ? (
              <p className="text-sm text-muted">No hay cuentas activas en NocoDB.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.accounts.map((account) => (
                  <AccountCard key={account.slug} account={account} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Historial de importaciones</h2>
            {data.dumps.length === 0 ? (
              <p className="text-sm text-muted">Todavía no hay importaciones registradas.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-left">
                  <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Importado</th>
                      <th className="px-3 py-2 font-medium">Cuenta</th>
                      <th className="px-3 py-2 font-medium">Fichero</th>
                      <th className="px-3 py-2 font-medium">Rango movimientos</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-right font-medium">Nuevos</th>
                      <th className="px-3 py-2 text-right font-medium">Omitidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dumps.map((dump) => (
                      <DumpRow key={dump.id} dump={dump} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
