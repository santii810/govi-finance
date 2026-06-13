import { NextResponse } from "next/server";
import { fetchResumen } from "@/lib/dashboard";
import { getAppConfig } from "@/lib/config";
import { NocoDbClient } from "@/lib/nocodb";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const { nocodbUrl, nocodbToken, sessionSecret, timezone } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const data = await fetchResumen(client, session.user.persona, timezone);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Dashboard error:", err);
    return NextResponse.json({ error: "Error al cargar el dashboard" }, { status: 500 });
  }
}
