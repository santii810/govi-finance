import { NextResponse } from "next/server";
import {
  deleteLogEntry,
  InsertLogError,
  logTableFromSlug,
  updateLogEntry,
  type LogUpdateBody,
} from "@/lib/insert-log";
import type {
  GastosRowInput,
  IngresosRowInput,
  InversionesRowInput,
  PatrimonioRowInput,
} from "@/lib/manual-insert/types";
import { getAppConfig } from "@/lib/config";
import { NocoDbClient, NocoDbError } from "@/lib/nocodb";
import { getSession } from "@/lib/session";

type RouteParams = { params: Promise<{ tipo: string; id: string }> };

type PatchBody = {
  tableType?: string;
  row?: GastosRowInput | IngresosRowInput | InversionesRowInput | PatrimonioRowInput;
  fecha?: string;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { tipo, id } = await params;
    const tableType = logTableFromSlug(tipo);
    if (!tableType) {
      return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
    }

    const body = (await request.json()) as PatchBody;
    if (!body.row) {
      return NextResponse.json({ error: "Faltan datos para actualizar" }, { status: 400 });
    }

    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);

    let updateBody: LogUpdateBody;
    if (tableType === "Patrimonio") {
      updateBody = {
        tableType,
        fecha: body.fecha ?? "",
        row: body.row as PatrimonioRowInput,
      };
    } else if (tableType === "Gastos") {
      updateBody = { tableType, row: body.row as GastosRowInput };
    } else if (tableType === "Ingresos") {
      updateBody = { tableType, row: body.row as IngresosRowInput };
    } else {
      updateBody = { tableType: "Inversiones", row: body.row as InversionesRowInput };
    }

    const entry = await updateLogEntry(client, tableType, id, updateBody, session.user.persona);
    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    console.error("Insert log update error:", err);
    if (err instanceof InsertLogError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof NocoDbError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al actualizar el registro" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { tipo, id } = await params;
    const tableType = logTableFromSlug(tipo);
    if (!tableType) {
      return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
    }

    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    await deleteLogEntry(client, tableType, id, session.user.persona);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Insert log delete error:", err);
    if (err instanceof InsertLogError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof NocoDbError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al borrar el registro" }, { status: 500 });
  }
}
