import { NextRequest, NextResponse } from "next/server";
import { fetchPatrimonio } from "@/lib/patrimonio-dashboard";
import { getAppConfig } from "@/lib/config";
import { NocoDbClient } from "@/lib/nocodb";
import { parsePeriodFilterMode } from "@/lib/period-filter";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const { nocodbUrl, nocodbToken, sessionSecret, timezone } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;
    const mode = parsePeriodFilterMode(params.get("mode"), "all");
    const yearFrom = params.get("from") ?? undefined;
    const yearTo = params.get("to") ?? undefined;

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const data = await fetchPatrimonio(
      client,
      session.user.persona,
      timezone,
      mode,
      yearFrom,
      yearTo,
    );

    return NextResponse.json(data);
  } catch (err) {
    console.error("Patrimonio dashboard error:", err);
    return NextResponse.json({ error: "Error al cargar patrimonio" }, { status: 500 });
  }
}
