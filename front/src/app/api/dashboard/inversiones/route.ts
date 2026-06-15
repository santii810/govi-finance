import { NextRequest, NextResponse } from "next/server";
import { fetchInversiones } from "@/lib/inversiones-dashboard";
import { getAppConfig } from "@/lib/config";
import { NocoDbClient } from "@/lib/nocodb";
import { getSession } from "@/lib/session";
import type { InversionesFilterMode } from "@/lib/types";

function parseMode(value: string | null): InversionesFilterMode {
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
    const data = await fetchInversiones(
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
    console.error("Inversiones dashboard error:", err);
    return NextResponse.json({ error: "Error al cargar inversiones" }, { status: 500 });
  }
}
