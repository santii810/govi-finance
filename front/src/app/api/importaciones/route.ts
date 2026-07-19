import { NextResponse } from "next/server";
import { getNocoDbConfig, getSessionSecret } from "@/lib/config";
import { loadImportaciones } from "@/lib/importaciones";
import { NocoDbClient } from "@/lib/nocodb";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession(getSessionSecret());
  if (!session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { nocodbUrl, nocodbToken } = getNocoDbConfig();
    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const payload = await loadImportaciones(client, session.user.persona);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar importaciones";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
