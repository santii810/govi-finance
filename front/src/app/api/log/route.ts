import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";
import {
  InsertLogError,
  loadInsertLog,
  type LogTableType,
} from "@/lib/insert-log";
import type { PersonaValue } from "@/lib/manual-insert/types";
import { NocoDbClient, NocoDbError } from "@/lib/nocodb";
import { getSession } from "@/lib/session";

const VALID_TYPES = new Set<LogTableType>(["Gastos", "Ingresos", "Inversiones", "Patrimonio"]);
const VALID_PERSONAS = new Set<PersonaValue>(["Santi", "Sandra", "Común"]);

export async function GET(request: Request) {
  try {
    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const url = new URL(request.url);
    const tipoParam = url.searchParams.get("tipo") ?? "";
    const categoria = url.searchParams.get("categoria")?.trim() || undefined;
    const personaParam = url.searchParams.get("persona")?.trim() ?? "";
    const sortParam = url.searchParams.get("sort")?.trim() ?? "";
    const limitParam = url.searchParams.get("limit")?.trim() ?? "";
    const offsetParam = url.searchParams.get("offset")?.trim() ?? "";

    let tipo: LogTableType | undefined;
    if (tipoParam) {
      if (!VALID_TYPES.has(tipoParam as LogTableType)) {
        return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
      }
      tipo = tipoParam as LogTableType;
    }

    let personaRegistro: PersonaValue | undefined;
    if (personaParam) {
      if (!VALID_PERSONAS.has(personaParam as PersonaValue)) {
        return NextResponse.json({ error: "Persona no válida" }, { status: 400 });
      }
      personaRegistro = personaParam as PersonaValue;
    }

    let sortBy: "createdAt" | "fecha" | undefined;
    if (sortParam) {
      if (sortParam !== "createdAt" && sortParam !== "fecha") {
        return NextResponse.json({ error: "Orden no válido" }, { status: 400 });
      }
      sortBy = sortParam;
    }

    let limit: number | undefined;
    if (limitParam) {
      const parsed = Number(limitParam);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
        return NextResponse.json({ error: "Límite no válido" }, { status: 400 });
      }
      limit = parsed;
    }

    let offset: number | undefined;
    if (offsetParam) {
      const parsed = Number(offsetParam);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10_000) {
        return NextResponse.json({ error: "Offset no válido" }, { status: 400 });
      }
      offset = parsed;
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const payload = await loadInsertLog(client, session.user.persona, {
      tipo,
      categoria,
      personaRegistro,
      sortBy,
      limit,
      offset,
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Insert log list error:", err);
    if (err instanceof InsertLogError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof NocoDbError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al cargar el log" }, { status: 500 });
  }
}
