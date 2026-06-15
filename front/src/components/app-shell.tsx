"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
  const [activeTab, setActiveTab] = useState<Tab>("resumen");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [backupState, setBackupState] = useState<"idle" | "running" | "ok" | "error">("idle");
  const [backupMessage, setBackupMessage] = useState("");

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch("/api/automatic-actions/pending");
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleBackup() {
    setBackupState("running");
    setBackupMessage("Exportando y subiendo a Drive…");
    try {
      const res = await fetch("/api/backup/run", { method: "POST" });
      const json = (await res.json()) as { archive?: string; error?: string };
      if (!res.ok) {
        setBackupState("error");
        setBackupMessage(json.error ?? "No se pudo completar el backup");
        return;
      }
      setBackupState("ok");
      setBackupMessage(`Listo: ${json.archive ?? "backup subido"}`);
    } catch {
      setBackupState("error");
      setBackupMessage("Error de conexión con el servicio de backup");
    }
  }

  const tabs: { id: Tab; label: string; disabled?: boolean; badge?: number }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "gastos", label: "Gastos" },
    { id: "ingresos", label: "Ingresos" },
    { id: "inversion", label: "Inversión" },
    { id: "patrimonio", label: "Patrimonio" },
    { id: "tareas", label: "Tareas", badge: pendingCount > 0 ? pendingCount : undefined },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <button
            type="button"
            onClick={() => setActiveTab("resumen")}
            className="text-lg font-semibold tracking-tight"
          >
            Finanzas
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("tareas")}
              className="relative rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
            >
              Tareas
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-white">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              disabled
              title="Próximamente (fase 3)"
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted opacity-60"
            >
              + Insertar
            </button>

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
                      Exporta NocoDB y sube a Google Drive.
                    </p>
                    <button
                      type="button"
                      disabled={backupState === "running"}
                      onClick={handleBackup}
                      className="mt-2 w-full rounded-md border border-border px-3 py-1.5 text-left text-sm hover:bg-background disabled:opacity-60"
                    >
                      {backupState === "running" ? "Lanzando backup…" : "Lanzar backup"}
                    </button>
                    {backupMessage && (
                      <p
                        className={`mt-2 text-xs ${
                          backupState === "error" ? "text-red-600" : "text-muted"
                        }`}
                      >
                        {backupMessage}
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
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              className={`relative rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-accent text-white"
                  : tab.disabled
                    ? "cursor-not-allowed text-muted opacity-50"
                    : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-white">
                  {tab.badge}
                </span>
              )}
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
        {activeTab === "resumen" && children}
        {activeTab === "ingresos" && <DashboardIngresos />}
        {activeTab === "inversion" && <DashboardInversiones />}
        {activeTab === "patrimonio" && <DashboardPatrimonio />}
        {activeTab === "gastos" && <DashboardGastos />}
        {activeTab === "tareas" && (
          <PendingTasksPanel
            onCountChange={setPendingCount}
          />
        )}
      </main>
    </div>
  );
}
