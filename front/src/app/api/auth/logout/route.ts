import { NextResponse } from "next/server";
import { getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession(getSessionSecret());
  session.destroy();
  return NextResponse.json({ ok: true });
}
