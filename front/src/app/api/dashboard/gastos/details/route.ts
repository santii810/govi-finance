import { NextRequest, NextResponse } from "next/server";
import { fetchGastosDrilldown, type GastosDrilldownView } from "@/lib/gastos-dashboard";
import { getAppConfig } from "@/lib/config";
import { NocoDbClient } from "@/lib/nocodb";
import { parsePeriodFilterMode } from "@/lib/period-filter";
import { getSession } from "@/lib/session";
import type { GastosSubTab } from "@/lib/types";

const VALID_SUB_TABS = new Set<GastosSubTab>([
  "general",
  "vida",
  "supermercado",
  "piso",
  "viajes",
  "restauracion",
  "transporte",
]);

const VALID_VIEWS = new Set<GastosDrilldownView>(["overview", "nombre", "viajes"]);

function parseSubTab(value: string | null): GastosSubTab {
  if (value && VALID_SUB_TABS.has(value as GastosSubTab)) {
    return value as GastosSubTab;
  }
  return "general";
}

function parseView(value: string | null): GastosDrilldownView | null {
  if (value && VALID_VIEWS.has(value as GastosDrilldownView)) {
    return value as GastosDrilldownView;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { nocodbUrl, nocodbToken, sessionSecret, timezone } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;
    const subTab = parseSubTab(params.get("subTab"));
    const mode = parsePeriodFilterMode(params.get("mode"), "current");
    const yearFrom = params.get("from") ?? undefined;
    const yearTo = params.get("to") ?? undefined;
    const view = parseView(params.get("view"));
    const row = params.get("row") ?? "";
    const col = params.get("col") ?? "";

    if (!view || !row || !col) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const moves = await fetchGastosDrilldown(
      client,
      session.user.persona,
      timezone,
      subTab,
      mode,
      view,
      row,
      col,
      yearFrom,
      yearTo,
    );

    return NextResponse.json({ moves });
  } catch (err) {
    console.error("Gastos drilldown error:", err);
    return NextResponse.json({ error: "Error al cargar movimientos" }, { status: 500 });
  }
}
