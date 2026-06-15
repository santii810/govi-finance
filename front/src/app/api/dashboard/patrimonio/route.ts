import { NextRequest, NextResponse } from "next/server";
import { fetchPatrimonio } from "@/lib/patrimonio-dashboard";
import { getAppConfig } from "@/lib/config";
import { NocoDbClient } from "@/lib/nocodb";
import { getSession } from "@/lib/session";
import type { PatrimonioFilterMode } from "@/lib/types";

function parseMode(value: string | null): PatrimonioFilterMode {
  if (value === "last5" || value === "range" || value === "year") return value;
  return "all";
}

export async function GET(req: NextRequest) {
  try {
    const { nocodbUrl, nocodbToken, sessionSecret, timezone } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;
    const mode = parseMode(params.get("mode"));
    const yearFrom = params.get("from") ?? undefined;
    const yearTo = params.get("to") ?? undefined;
    const singleYear = params.get("year") ?? undefined;

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const data = await fetchPatrimonio(
      client,
      session.user.persona,
      timezone,
      mode,
      yearFrom,
      yearTo,
      singleYear,
    );

    return NextResponse.json(data);
  } catch (err) {
    console.error("Patrimonio dashboard error:", err);
    return NextResponse.json({ error: "Error al cargar patrimonio" }, { status: 500 });
  }
}
