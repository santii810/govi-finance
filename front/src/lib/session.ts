import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { SessionUser } from "./types";

export interface SessionData {
  user?: SessionUser;
}

export function getSessionOptions(secret: string): SessionOptions {
  return {
    password: secret,
    cookieName: "finanzas_session",
    cookieOptions: {
      // Secure solo si hay HTTPS explícito; en HTTP (localhost/LAN) la cookie no se guarda.
      secure: process.env.COOKIE_SECURE === "true",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 14,
    },
  };
}

export async function getSession(secret: string) {
  return getIronSession<SessionData>(await cookies(), getSessionOptions(secret));
}
