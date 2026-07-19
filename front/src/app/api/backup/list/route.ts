import { NextResponse } from "next/server";
import { backupFetch, requireBackupSession } from "@/lib/backup-api";

export async function GET() {
  const auth = await requireBackupSession();
  if ("error" in auth) return auth.error;

  try {
    const response = await backupFetch("/backup/list");
    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error ?? "Error al listar backups" },
        { status: response.status },
      );
    }
    return NextResponse.json(payload);
  } catch (err) {
    console.error("Backup list error:", err);
    return NextResponse.json(
      { error: "No se pudo contactar con el servicio de backup" },
      { status: 502 },
    );
  }
}
