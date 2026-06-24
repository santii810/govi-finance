import { NextResponse } from "next/server";
import {
  acceptPending,
  ignorePending,
  mapActionError,
  modifyPending,
  undoPending,
} from "@/lib/automatic-actions";
import { getAppConfig } from "@/lib/config";
import { NocoDbClient } from "@/lib/nocodb";
import { getSession } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string }> };

type ActionBody = {
  action?: string;
  destTableId?: string;
  destRecordId?: string;
  // campos para action=modify
  fecha?: string;
  importe?: number;
  concepto?: string;
  persona?: string;
  tablaDestino?: string;
  categoria?: string | null;
  tipo?: string | null;
  nombre?: string | null;
  entidad?: string | null;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json()) as ActionBody;
    const action = body.action;

    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);

    if (action === "accept") {
      const result = await acceptPending(client, id, session.user.persona);
      return NextResponse.json({ ok: true, undo: result });
    }

    if (action === "ignore") {
      await ignorePending(client, id);
      return NextResponse.json({ ok: true });
    }

    if (action === "modify") {
      const result = await modifyPending(client, id, session.user.persona, {
        fecha: body.fecha,
        importe: body.importe,
        concepto: body.concepto,
        persona: body.persona as "Santi" | "Sandra" | "Común" | undefined,
        tablaDestino: body.tablaDestino as "Gastos" | "Ingresos" | "Inversiones" | undefined,
        categoria: body.categoria,
        tipo: body.tipo,
        nombre: body.nombre,
        entidad: body.entidad,
      });
      return NextResponse.json({ ok: true, undo: result });
    }

    if (action === "undo") {
      const item = await undoPending(client, id, session.user.persona, {
        destTableId: body.destTableId,
        destRecordId: body.destRecordId,
      });
      return NextResponse.json({ ok: true, item });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err) {
    console.error("Automatic action error:", err);
    const { message, status } = mapActionError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
