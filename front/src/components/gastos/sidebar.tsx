"use client";

import type { GastosSubTab } from "@/lib/types";

const SUB_TABS: Array<{ id: GastosSubTab; label: string; section: "vistas" | "categorias" }> = [
  { id: "general", label: "Totales", section: "vistas" },
  { id: "vida", label: "Gastos de vida", section: "vistas" },
  { id: "supermercado", label: "Supermercado", section: "categorias" },
  { id: "piso", label: "Piso", section: "categorias" },
  { id: "viajes", label: "Viaxes", section: "categorias" },
  { id: "restauracion", label: "Restauración", section: "categorias" },
  { id: "transporte", label: "Transporte", section: "categorias" },
];

interface GastosSidebarProps {
  active: GastosSubTab;
  onSelect: (id: GastosSubTab) => void;
}

export function GastosSidebar({ active, onSelect }: GastosSidebarProps) {
  const vistas = SUB_TABS.filter((t) => t.section === "vistas");
  const categorias = SUB_TABS.filter((t) => t.section === "categorias");

  return (
    <aside className="w-32 shrink-0 self-stretch border-r border-border bg-background/50 px-2 py-3">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="rounded-md bg-border/50 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            Vistas
          </p>
          {vistas.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={`block w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
                active === tab.id
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <p className="rounded-md bg-border/50 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            Por categoría
          </p>
          {categorias.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={`block w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
                active === tab.id
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
