import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAppConfig } from "@/lib/config";
import { NocoDbClient } from "@/lib/nocodb";
import { getSession } from "@/lib/session";
import type { Persona } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = (await req.json()) as {
      username?: string;
      password?: string;
    };

    if (!username?.trim() || !password) {
      return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });
    }

    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const user = await client.findUserByUsername(username.trim());

    if (!user) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const hash = String(user.PasswordHash ?? "");
    const valid = await bcrypt.compare(password, hash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const persona = user.Persona as Persona;
    if (persona !== "Santi" && persona !== "Sandra") {
      return NextResponse.json({ error: "Usuario mal configurado" }, { status: 500 });
    }

    const session = await getSession(sessionSecret);
    session.user = { username: String(user.Username), persona };
    await session.save();

    return NextResponse.json({ ok: true, persona });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
