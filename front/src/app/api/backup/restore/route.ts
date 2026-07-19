import { NextResponse } from "next/server";
import { backupFetch, requireBackupSession } from "@/lib/backup-api";

export async function POST(request: Request) {
  const auth = await requireBackupSession();
  if ("error" in auth) return auth.error;

  let archive = "";
  try {
    const body = (await request.json()) as { archive?: string };
    archive = body.archive?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  if (!archive) {
    return NextResponse.json({ error: "Falta el parámetro archive" }, { status: 400 });
  }

  try {
    const response = await backupFetch("/backup/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        { error: payload.error ?? "Error al iniciar la restauración" },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, started: payload.started ?? true });
  } catch (err) {
    console.error("Backup restore error:", err);
    return NextResponse.json(
      { error: "No se pudo contactar con el servicio de backup" },
      { status: 502 },
    );
  }
}
