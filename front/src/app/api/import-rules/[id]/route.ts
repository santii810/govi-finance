import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";
import {
  deleteImportRule,
  mapRuleError,
  normalizeRuleInput,
  RuleError,
  updateImportRule,
} from "@/lib/import-rules-store";
import { parseJsonField, normalizePersona } from "@/lib/import-rules/engine";
import type { ImportRuleInput } from "@/lib/import-rules/types";
import { NocoDbClient } from "@/lib/nocodb";
import { getSession } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const partial: Partial<ImportRuleInput> = {};

    if (body.nombre !== undefined) partial.nombre = String(body.nombre);
    if (body.activa !== undefined) partial.activa = body.activa !== false;
    if (body.alcance !== undefined) {
      partial.alcance = body.alcance === "account" ? "account" : "global";
    }
    if (body.cuenta !== undefined) partial.cuenta = body.cuenta ? String(body.cuenta) : null;
    if (body.prioridad !== undefined) partial.prioridad = Number(body.prioridad);
    if (body.condition !== undefined) {
      partial.condition = parseJsonField(body.condition);
    }
    if (body.actions !== undefined) {
      partial.actions = parseJsonField(body.actions);
    }
    if (body.persona !== undefined) {
      partial.persona = normalizePersona(body.persona, session.user.persona);
    }

    if (partial.nombre !== undefined && !partial.nombre.trim()) {
      throw new RuleError("El nombre es obligatorio", 422);
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const rule = await updateImportRule(client, id, session.user.persona, partial);
    return NextResponse.json({ rule });
  } catch (err) {
    console.error("Import rule update error:", err);
    const { message, status } = mapRuleError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    await deleteImportRule(client, id, session.user.persona);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Import rule delete error:", err);
    const { message, status } = mapRuleError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
