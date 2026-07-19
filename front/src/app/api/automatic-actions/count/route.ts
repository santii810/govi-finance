import { NextResponse } from "next/server";
import { countPending } from "@/lib/classifier";
import { getAppConfig } from "@/lib/config";
import { NocoDbClient } from "@/lib/nocodb";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const total = await countPending(client, session.user.persona);

    return NextResponse.json({ total });
  } catch (err) {
    console.error("Pending count error:", err);
    return NextResponse.json({ error: "Error al cargar tareas pendientes" }, { status: 500 });
  }
}
