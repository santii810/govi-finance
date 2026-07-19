"use client";

import { useCallback, useEffect, useState } from "react";

interface BackupArchive {
  name: string;
  source: "manual" | "auto" | "unknown";
  size_bytes: number;
  created_at: string;
}

interface BackupSchedule {
  schedule: string;
  timezone: string;
  skip_if_unchanged: boolean;
  next_run_at: string;
  last_backup_at: string | null;
  has_fingerprint: boolean;
}

interface BackupStatus {
  running?: boolean;
  percent?: number;
  message?: string;
  archive?: string;
  error?: string;
  operation?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTime(iso: string): string {
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

function formatScheduleLabel(cron: string): string {
  if (cron.trim() === "0 3 * * *") return "Todos los días a las 03:00";
  return cron;
}

function formatSourceLabel(source: BackupArchive["source"]): string {
  if (source === "manual") return "Manual";
  if (source === "auto") return "Automático";
  return "—";
}

export function BackupsPanel() {
  const [archives, setArchives] = useState<BackupArchive[]>([]);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jobState, setJobState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [jobMessage, setJobMessage] = useState("");
  const [jobPercent, setJobPercent] = useState(0);
  const [jobOperation, setJobOperation] = useState<"backup" | "restore" | "idle">("idle");
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listRes, scheduleRes] = await Promise.all([
        fetch("/api/backup/list", { cache: "no-store" }),
        fetch("/api/backup/schedule", { cache: "no-store" }),
      ]);

      if (!listRes.ok) {
        const body = (await listRes.json()) as { error?: string };
        throw new Error(body.error ?? "Error al cargar backups");
      }
      if (!scheduleRes.ok) {
        const body = (await scheduleRes.json()) as { error?: string };
        throw new Error(body.error ?? "Error al cargar programación");
      }

      const listJson = (await listRes.json()) as { archives?: BackupArchive[] };
      const scheduleJson = (await scheduleRes.json()) as BackupSchedule;
      setArchives(listJson.archives ?? []);
      setSchedule(scheduleJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function pollStatus(
    onUpdate: (status: BackupStatus) => void,
  ): Promise<"done" | "error" | "timeout"> {
    for (let attempt = 0; attempt < 600; attempt += 1) {
      await sleep(400);
      const statusRes = await fetch("/api/backup/status", { cache: "no-store" });
      const status = (await statusRes.json()) as BackupStatus;

      if (!statusRes.ok) {
        onUpdate({ error: status.error ?? "Error al consultar el progreso" });
        return "error";
      }

      onUpdate(status);

      if (!status.running) {
        return status.error ? "error" : "done";
      }
    }
    return "timeout";
  }

  async function runJob(
    operation: "backup" | "restore",
    startUrl: string,
    startInit?: RequestInit,
  ) {
    setJobState("running");
    setJobOperation(operation);
    setJobPercent(0);
    setJobMessage(operation === "backup" ? "Iniciando backup…" : "Iniciando restauración…");
    setError("");

    try {
      const startRes = await fetch(startUrl, startInit ?? { method: "POST" });
      const startJson = (await startRes.json()) as { error?: string };
      if (!startRes.ok) {
        setJobState("error");
        setJobMessage(startJson.error ?? "No se pudo iniciar la operación");
        return;
      }

      const result = await pollStatus((status) => {
        setJobPercent(status.percent ?? 0);
        setJobMessage(status.message ?? "Procesando…");
      });

      if (result === "error") {
        setJobState("error");
        const statusRes = await fetch("/api/backup/status", { cache: "no-store" });
        const status = (await statusRes.json()) as BackupStatus;
        setJobMessage(status.error ?? status.message ?? "Error en la operación");
        return;
      }

      if (result === "timeout") {
        setJobState("error");
        setJobMessage("La operación tardó demasiado");
        return;
      }

      setJobState("done");
      setJobPercent(100);
      setJobMessage(
        operation === "backup" ? "Backup completado" : "Restauración completada",
      );
      setConfirmRestore(null);
      await loadData();
    } catch {
      setJobState("error");
      setJobMessage("Error de conexión con el servicio de backup");
    } finally {
      setJobOperation("idle");
    }
  }

  function handleDownload(name: string) {
    window.location.assign(`/api/backup/download?archive=${encodeURIComponent(name)}`);
  }

  async function handleDelete(name: string) {
    setDeleting(name);
    setError("");
    try {
      const res = await fetch("/api/backup/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: name }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al borrar");
      setConfirmDelete(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al borrar");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Backups</h2>
        </div>
        <button
          type="button"
          disabled={jobState === "running"}
          onClick={() => runJob("backup", "/api/backup/run")}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {jobState === "running" && jobOperation === "backup"
            ? "Backup en curso…"
            : "Hacer backup ahora"}
        </button>
      </div>

      {schedule && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium">Programación automática</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Frecuencia</dt>
              <dd>{formatScheduleLabel(schedule.schedule)} ({schedule.timezone})</dd>
            </div>
            <div>
              <dt className="text-muted">Próxima ejecución</dt>
              <dd>{formatDateTime(schedule.next_run_at)}</dd>
            </div>
            <div>
              <dt className="text-muted">Último backup</dt>
              <dd>
                {schedule.last_backup_at
                  ? formatDateTime(schedule.last_backup_at)
                  : "Ninguno en disco"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Condición</dt>
              <dd>
                {schedule.skip_if_unchanged
                  ? "Solo si hubo cambios desde el último backup"
                  : "Siempre"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {jobState === "running" && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>{jobMessage}</span>
            <span className="tabular-nums text-muted">{jobPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${jobPercent}%` }}
            />
          </div>
        </div>
      )}

      {jobMessage && jobState !== "running" && (
        <p className={`text-sm ${jobState === "error" ? "text-expense" : "text-muted"}`}>
          {jobMessage}
        </p>
      )}

      {error && <p className="text-sm text-expense">{error}</p>}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-medium">Copias en disco</h3>
            {archives.length > 0 && (
              <span className="text-xs text-muted">
                {formatBytes(archives.reduce((total, archive) => total + archive.size_bytes, 0))} en
                total
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background disabled:opacity-50"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Cargando backups…</p>
        ) : archives.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            No hay backups guardados todavía. Pulsa «Hacer backup ahora» para crear el primero.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Tamaño</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {archives.map((archive) => (
                  <tr key={archive.name}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{formatDateTime(archive.created_at)}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{archive.name}</p>
                    </td>
                    <td className="px-4 py-3">{formatSourceLabel(archive.source)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatBytes(archive.size_bytes)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(archive.name)}
                          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
                        >
                          Descargar
                        </button>

                        {confirmRestore === archive.name ? (
                          <>
                            <span className="text-xs text-expense">¿Sustituir todos los datos?</span>
                            <button
                              type="button"
                              disabled={jobState === "running"}
                              onClick={() =>
                                runJob("restore", "/api/backup/restore", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ archive: archive.name }),
                                })
                              }
                              className="rounded-lg bg-expense px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRestore(null)}
                              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : confirmDelete === archive.name ? (
                          <>
                            <span className="text-xs text-expense">¿Borrar esta copia?</span>
                            <button
                              type="button"
                              disabled={deleting === archive.name || jobState === "running"}
                              onClick={() => handleDelete(archive.name)}
                              className="rounded-lg bg-expense px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                            >
                              {deleting === archive.name ? "Borrando…" : "Confirmar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={jobState === "running"}
                              onClick={() => {
                                setConfirmDelete(null);
                                setConfirmRestore(archive.name);
                              }}
                              className="rounded-lg border border-expense/40 px-3 py-1.5 text-sm text-expense hover:bg-background disabled:opacity-60"
                            >
                              Restaurar
                            </button>
                            <button
                              type="button"
                              disabled={jobState === "running" || deleting !== null}
                              onClick={() => {
                                setConfirmRestore(null);
                                setConfirmDelete(archive.name);
                              }}
                              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-background hover:text-expense disabled:opacity-60"
                            >
                              Borrar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
