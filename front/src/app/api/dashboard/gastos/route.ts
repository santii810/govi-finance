import { NextRequest, NextResponse } from "next/server";
import { fetchGastos } from "@/lib/gastos-dashboard";
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
]);

function parseSubTab(value: string | null): GastosSubTab {
  if (value && VALID_SUB_TABS.has(value as GastosSubTab)) {
    return value as GastosSubTab;
  }
  return "vida";
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

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const data = await fetchGastos(
      client,
      session.user.persona,
      timezone,
      subTab,
      mode,
      yearFrom,
      yearTo,
    );

    return NextResponse.json(data);
  } catch (err) {
    console.error("Gastos dashboard error:", err);
    return NextResponse.json({ error: "Error al cargar gastos" }, { status: 500 });
  }
}
