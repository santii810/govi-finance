import { NextResponse } from "next/server";
import { classifyPending, countPending } from "@/lib/classifier";
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
    const [items, total] = await Promise.all([
      classifyPending(client, session.user.persona),
      countPending(client, session.user.persona),
    ]);

    return NextResponse.json({ total, items });
  } catch (err) {
    console.error("Pending classify error:", err);
    return NextResponse.json({ error: "Error al cargar tareas pendientes" }, { status: 500 });
  }
}
