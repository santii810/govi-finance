import { NextResponse } from "next/server";
import { getBackupConfig, getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession(getSessionSecret());
  if (!session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const archive = new URL(request.url).searchParams.get("archive")?.trim();
  if (!archive) {
    return NextResponse.json({ error: "Falta el parámetro archive" }, { status: 400 });
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
    const response = await fetch(
      `${backupUrl}/backup/download?archive=${encodeURIComponent(archive)}`,
      {
        headers: { Authorization: `Bearer ${triggerSecret}` },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      return NextResponse.json(
        { error: payload.error ?? "No se pudo descargar el backup" },
        { status: response.status },
      );
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${archive}"`,
      },
    });
  } catch (err) {
    console.error("Backup download error:", err);
    return NextResponse.json(
      { error: "No se pudo contactar con el servicio de backup" },
      { status: 502 },
    );
  }
}
