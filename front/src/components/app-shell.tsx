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
  const isBackupsPage = pathname === "/app/backups";
  const isImportacionesPage = pathname === "/app/importaciones";
  const isLogPage = pathname === "/app/log";
  const isHome = pathname === "/app";

  const [activeTab, setActiveTab] = useState<Tab>("resumen");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(() => new Set(["resumen"]));
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const prevPathRef = useRef(pathname);

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
    if (
      (prevPathRef.current === "/app/insertar" ||
        prevPathRef.current === "/app/backups" ||
        prevPathRef.current === "/app/importaciones" ||
        prevPathRef.current === "/app/log") &&
      pathname === "/app"
    ) {
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
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  isImportacionesPage || isLogPage || isBackupsPage
                    ? "border-accent bg-accent/10"
                    : "border-border"
                }`}
              >
                {user.username} ▾
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-lg border border-border bg-card py-1 shadow-lg">
                  <Link
                    href="/app/importaciones"
                    onClick={() => setMenuOpen(false)}
                    className={`block px-4 py-2 text-sm hover:bg-background ${
                      isImportacionesPage ? "font-medium text-accent" : ""
                    }`}
                  >
                    Importaciones
                  </Link>
                  <Link
                    href="/app/log"
                    onClick={() => setMenuOpen(false)}
                    className={`block px-4 py-2 text-sm hover:bg-background ${
                      isLogPage ? "font-medium text-accent" : ""
                    }`}
                  >
                    Log
                  </Link>
                  <Link
                    href="/app/backups"
                    onClick={() => setMenuOpen(false)}
                    className={`block px-4 py-2 text-sm hover:bg-background ${
                      isBackupsPage ? "font-medium text-accent" : ""
                    }`}
                  >
                    Backups
                  </Link>
                  <div className="my-1 border-t border-border" />
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
                !isInsertPage &&
                !isBackupsPage &&
                !isImportacionesPage &&
                !isLogPage &&
                isHome &&
                activeTab === tab.id
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
        {isInsertPage || isBackupsPage || isImportacionesPage || isLogPage ? (
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
                <PendingTasksPanel
                  onCountChange={setPendingCount}
                  onDataChanged={() => setDashboardRefresh((n) => n + 1)}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
