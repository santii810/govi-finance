import { NextResponse } from "next/server";
import { getBackupConfig, getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";

export async function POST() {
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
    const response = await fetch(`${backupUrl}/backup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${triggerSecret}` },
      signal: AbortSignal.timeout(15_000),
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      started?: boolean;
      error?: string;
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error ?? "Error al lanzar el backup" },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, started: payload.started ?? true });
  } catch (err) {
    console.error("Backup trigger error:", err);
    return NextResponse.json(
      { error: "No se pudo contactar con el servicio de backup" },
      { status: 502 },
    );
  }
}
