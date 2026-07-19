import { getBackupConfig, getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function requireBackupSession() {
  const session = await getSession(getSessionSecret());
  if (!session.user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  try {
    const config = getBackupConfig();
    return { config, user: session.user };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backup no configurado";
    return { error: NextResponse.json({ error: message }, { status: 503 }) };
  }
}

export async function backupFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const { backupUrl, triggerSecret } = getBackupConfig();
  return fetch(`${backupUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${triggerSecret}`,
      ...init?.headers,
    },
    cache: "no-store",
  });
}
