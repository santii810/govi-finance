import { NextResponse } from "next/server";
import { getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession(getSessionSecret());

  if (!session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  return NextResponse.json({ user: session.user });
}
