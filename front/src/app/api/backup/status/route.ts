import { NextResponse } from "next/server";
import { getBackupConfig, getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession(getSessionSecret());
  if (!session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let backupUrl: string;
  let triggerSecret: string;
  try {
    ({ backupUrl, triggerSecret } = getBackupConfig());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backup no configurado";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  try {
    const response = await fetch(`${backupUrl}/backup/status`, {
      headers: { Authorization: `Bearer ${triggerSecret}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error ?? "Error al consultar el backup" },
        { status: response.status },
      );
    }
    return NextResponse.json(payload);
  } catch (err) {
    console.error("Backup status error:", err);
    return NextResponse.json(
      { error: "No se pudo contactar con el servicio de backup" },
      { status: 502 },
    );
  }
}
