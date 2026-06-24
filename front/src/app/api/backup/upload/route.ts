import { NextResponse } from "next/server";
import { getBackupConfig, getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession(getSessionSecret());
  if (!session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let archive: string;
  try {
    const body = (await request.json()) as { archive?: string };
    archive = body.archive?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  if (!archive) {
    return NextResponse.json({ error: "Falta archive" }, { status: 400 });
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
    const response = await fetch(`${backupUrl}/backup/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${triggerSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ archive }),
      signal: AbortSignal.timeout(15_000),
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      started?: boolean;
      error?: string;
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error ?? "Error al subir el backup" },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, started: payload.started ?? true });
  } catch (err) {
    console.error("Backup upload error:", err);
    return NextResponse.json(
      { error: "No se pudo contactar con el servicio de backup" },
      { status: 502 },
    );
  }
}
