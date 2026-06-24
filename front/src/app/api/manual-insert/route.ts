import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";
import {
  insertManualRecords,
  loadLastPatrimonioTemplate,
  loadManualInsertOptions,
  ManualInsertError,
} from "@/lib/manual-insert/service";
import type { InsertTable } from "@/lib/manual-insert/types";
import { NocoDbClient, NocoDbError } from "@/lib/nocodb";
import { getSession } from "@/lib/session";

const VALID_TABLES = new Set<InsertTable>(["Gastos", "Ingresos", "Inversiones", "Patrimonio"]);

export async function GET(request: Request) {
  try {
    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const options = await loadManualInsertOptions(client);

    const url = new URL(request.url);
    const template = url.searchParams.get("template");
    let patrimonioTemplate = null;
    if (template === "last-patrimonio") {
      patrimonioTemplate = await loadLastPatrimonioTemplate(client, session.user.persona);
    }

    return NextResponse.json({ options, patrimonioTemplate });
  } catch (err) {
    console.error("Manual insert options error:", err);
    return NextResponse.json({ error: "Error al cargar opciones" }, { status: 500 });
  }
}

type InsertBody = {
  table?: InsertTable;
  rows?: unknown[];
  fecha?: string;
  defaultPersona?: string;
};

export async function POST(request: Request) {
  try {
    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = (await request.json()) as InsertBody;
    const table = body.table;

    if (!table || !VALID_TABLES.has(table)) {
      return NextResponse.json({ error: "Tabla no válida" }, { status: 400 });
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);

    const result =
      table === "Patrimonio"
        ? await insertManualRecords(client, table, {
            fecha: body.fecha ?? "",
            defaultPersona: (body.defaultPersona ?? "") as "Santi" | "Sandra" | "Común" | "",
            rows: (body.rows ?? []) as never[],
          })
        : await insertManualRecords(client, table, {
            rows: (body.rows ?? []) as never[],
          });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Manual insert error:", err);
    if (err instanceof ManualInsertError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof NocoDbError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al insertar registros" }, { status: 500 });
  }
}
