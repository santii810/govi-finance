"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionUser } from "@/lib/types";

type Tab = "resumen" | "gastos" | "ingresos";

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("resumen");
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "gastos", label: "Gastos", disabled: true },
    { id: "ingresos", label: "Ingresos", disabled: true },
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
              disabled
              title="Próximamente (fase 2)"
              className="relative rounded-lg border border-border px-3 py-1.5 text-sm text-muted opacity-60"
            >
              Tareas
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-white">
                0
              </span>
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
                <div className="absolute right-0 mt-1 w-40 rounded-lg border border-border bg-card py-1 shadow-lg">
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
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
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
        {activeTab === "resumen" ? children : (
          <p className="text-sm text-muted">Este dashboard estará disponible en una fase posterior.</p>
        )}
      </main>
    </div>
  );
}
