"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardGastos } from "@/components/dashboard-gastos";
import { DashboardIngresos } from "@/components/dashboard-ingresos";
import { DashboardInversiones } from "@/components/dashboard-inversiones";
import { DashboardPatrimonio } from "@/components/dashboard-patrimonio";
import { PendingTasksPanel } from "@/components/pending-tasks-panel";
import type { SessionUser } from "@/lib/types";

type Tab = "resumen" | "gastos" | "ingresos" | "inversion" | "patrimonio" | "tareas";

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isInsertPage = pathname === "/app/insertar";
  const isHome = pathname === "/app";

  const [activeTab, setActiveTab] = useState<Tab>("resumen");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(() => new Set(["resumen"]));
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [backupState, setBackupState] = useState<"idle" | "running" | "ready" | "error">("idle");
  const [backupMessage, setBackupMessage] = useState("");
  const [backupPercent, setBackupPercent] = useState(0);
  const [backupArchive, setBackupArchive] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "running" | "ok" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const prevPathRef = useRef(pathname);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch("/api/automatic-actions/count");
      if (!res.ok) return;
      const json = (await res.json()) as { total?: number };
      setPendingCount(json.total ?? 0);
    } catch {
      // badge opcional; no bloquear la UI
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  useEffect(() => {
    if (prevPathRef.current === "/app/insertar" && pathname === "/app") {
      setDashboardRefresh((n) => n + 1);
    }
    prevPathRef.current = pathname;
  }, [pathname]);

  function visitTab(tab: Tab) {
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }

  function goHome(tab: Tab = "resumen") {
    visitTab(tab);
    setActiveTab(tab);
    if (!isHome) {
      router.push("/app");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function pollBackupStatus(
    onUpdate: (status: {
      running?: boolean;
      percent?: number;
      message?: string;
      archive?: string;
      error?: string;
    }) => void,
  ): Promise<"done" | "error" | "timeout"> {
    for (let attempt = 0; attempt < 600; attempt += 1) {
      await sleep(400);
      const statusRes = await fetch("/api/backup/status", { cache: "no-store" });
      const status = (await statusRes.json()) as {
        running?: boolean;
        percent?: number;
        message?: string;
        archive?: string;
        error?: string;
      };

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

  async function handleBackup() {
    setBackupState("running");
    setBackupPercent(0);
    setBackupMessage("Iniciando…");
    setBackupArchive(null);
    setUploadState("idle");
    setUploadMessage("");

    try {
      const startRes = await fetch("/api/backup/run", { method: "POST" });
      const startJson = (await startRes.json()) as { error?: string };
      if (!startRes.ok) {
        setBackupState("error");
        setBackupMessage(startJson.error ?? "No se pudo iniciar el backup");
        return;
      }

      const result = await pollBackupStatus((status) => {
        setBackupPercent(status.percent ?? 0);
        setBackupMessage(status.message ?? "Procesando…");
      });

      if (result === "error") {
        setBackupState("error");
        const statusRes = await fetch("/api/backup/status", { cache: "no-store" });
        const status = (await statusRes.json()) as { error?: string; message?: string };
        setBackupMessage(status.error ?? status.message ?? "Error en el backup");
        return;
      }

      if (result === "timeout") {
        setBackupState("error");
        setBackupMessage("El backup tardó demasiado");
        return;
      }

      const statusRes = await fetch("/api/backup/status", { cache: "no-store" });
      const status = (await statusRes.json()) as { archive?: string };
      setBackupState("ready");
      setBackupPercent(100);
      setBackupMessage("Backup listo");
      setBackupArchive(status.archive ?? null);
    } catch {
      setBackupState("error");
      setBackupMessage("Error de conexión con el servicio de backup");
    }
  }

  function handleDownload() {
    if (!backupArchive) return;
    window.location.assign(
      `/api/backup/download?archive=${encodeURIComponent(backupArchive)}`,
    );
  }

  async function handleUploadToDrive() {
    if (!backupArchive) return;

    setUploadState("running");
    setUploadMessage("Iniciando subida…");

    try {
      const startRes = await fetch("/api/backup/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: backupArchive }),
      });
      const startJson = (await startRes.json()) as { error?: string };
      if (!startRes.ok) {
        setUploadState("error");
        setUploadMessage(startJson.error ?? "No se pudo iniciar la subida");
        return;
      }

      const result = await pollBackupStatus((status) => {
        setUploadMessage(status.message ?? "Subiendo…");
      });

      if (result === "error") {
        setUploadState("error");
        const statusRes = await fetch("/api/backup/status", { cache: "no-store" });
        const status = (await statusRes.json()) as { error?: string; message?: string };
        setUploadMessage(status.error ?? status.message ?? "Error al subir");
        return;
      }

      if (result === "timeout") {
        setUploadState("error");
        setUploadMessage("La subida tardó demasiado");
        return;
      }

      setUploadState("ok");
      setUploadMessage("Subido a Google Drive");
    } catch {
      setUploadState("error");
      setUploadMessage("Error de conexión con el servicio de backup");
    }
  }

  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "gastos", label: "Gastos" },
    { id: "ingresos", label: "Ingresos" },
    { id: "inversion", label: "Inversión" },
    { id: "patrimonio", label: "Patrimonio" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <button
            type="button"
            onClick={() => goHome("resumen")}
            className="text-lg font-semibold tracking-tight"
          >
            Finanzas
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goHome("tareas")}
              className="relative rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
            >
              Tareas
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-white">
                  {pendingCount}
                </span>
              )}
            </button>

            <Link
              href="/app/insertar"
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                isInsertPage
                  ? "border-accent bg-accent text-white hover:bg-accent-hover"
                  : "border-border hover:bg-background"
              }`}
            >
              + Insertar
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium"
              >
                {user.username} ▾
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-lg">
                  <div className="border-b border-border px-4 py-2">
                    <p className="text-xs font-medium text-muted">Backup</p>
                    <p className="mt-1 text-xs text-muted">
                      Exporta NocoDB. Al terminar puedes descargarlo o subirlo a Drive.
                    </p>
                    <button
                      type="button"
                      disabled={backupState === "running" || uploadState === "running"}
                      onClick={handleBackup}
                      className="mt-2 w-full rounded-md border border-border px-3 py-1.5 text-left text-sm hover:bg-background disabled:opacity-60"
                    >
                      {backupState === "running" ? "Backup en curso…" : "Lanzar backup"}
                    </button>
                    {backupState === "running" && (
                      <div className="mt-2">
                        <div className="mb-1 flex items-center justify-between text-[10px] text-muted">
                          <span>{backupMessage}</span>
                          <span>{backupPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
                          <div
                            className="h-full rounded-full bg-accent transition-all duration-300"
                            style={{ width: `${backupPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {backupState === "ready" && backupArchive && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-background"
                        >
                          Descargar
                        </button>
                        <button
                          type="button"
                          disabled={uploadState === "running"}
                          onClick={handleUploadToDrive}
                          className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-background disabled:opacity-60"
                        >
                          {uploadState === "running" ? "Subiendo…" : "Subir a Drive"}
                        </button>
                      </div>
                    )}
                    {backupMessage && backupState !== "running" && (
                      <p
                        className={`mt-2 text-xs ${
                          backupState === "error" ? "text-red-600" : "text-muted"
                        }`}
                      >
                        {backupMessage}
                      </p>
                    )}
                    {uploadMessage && (
                      <p
                        className={`mt-1 text-xs ${
                          uploadState === "error" ? "text-red-600" : "text-muted"
                        }`}
                      >
                        {uploadMessage}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-background"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => !tab.disabled && goHome(tab.id)}
              className={`relative rounded-lg px-4 py-2 text-sm font-medium transition ${
                !isInsertPage && isHome && activeTab === tab.id
                  ? "bg-accent text-white"
                  : tab.disabled
                    ? "cursor-not-allowed text-muted opacity-50"
                    : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            disabled
            title="Próximamente"
            className="rounded-lg px-3 py-2 text-sm text-muted opacity-50"
          >
            +
          </button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {isInsertPage ? (
          children
        ) : (
          <>
            {visitedTabs.has("resumen") && (
              <div className={activeTab === "resumen" ? undefined : "hidden"} key={dashboardRefresh}>
                {children}
              </div>
            )}
            {visitedTabs.has("ingresos") && (
              <div className={activeTab === "ingresos" ? undefined : "hidden"}>
                <DashboardIngresos key={dashboardRefresh} />
              </div>
            )}
            {visitedTabs.has("inversion") && (
              <div className={activeTab === "inversion" ? undefined : "hidden"}>
                <DashboardInversiones key={dashboardRefresh} />
              </div>
            )}
            {visitedTabs.has("patrimonio") && (
              <div className={activeTab === "patrimonio" ? undefined : "hidden"}>
                <DashboardPatrimonio key={dashboardRefresh} />
              </div>
            )}
            {visitedTabs.has("gastos") && (
              <div className={activeTab === "gastos" ? undefined : "hidden"}>
                <DashboardGastos key={dashboardRefresh} />
              </div>
            )}
            {visitedTabs.has("tareas") && (
              <div className={activeTab === "tareas" ? undefined : "hidden"}>
                <PendingTasksPanel onCountChange={setPendingCount} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
