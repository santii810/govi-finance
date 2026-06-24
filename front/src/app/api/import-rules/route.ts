import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/config";
import {
  createImportRule,
  listImportRulesForUser,
  mapRuleError,
  normalizeRuleInput,
  RuleError,
} from "@/lib/import-rules-store";
import { NocoDbClient } from "@/lib/nocodb";
import { getSession } from "@/lib/session";
import type { ImportRuleInput } from "@/lib/import-rules/types";

function validateRuleActions(actions: ImportRuleInput["actions"]): void {
  if (actions.ignorar) return;
  if (!actions.tabla_destino) {
    throw new RuleError("La tabla destino es obligatoria (o elige «Ignorar»)", 422);
  }
}

export async function GET() {
  try {
    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const rules = await listImportRulesForUser(client, session.user.persona);
    return NextResponse.json({ rules });
  } catch (err) {
    console.error("Import rules list error:", err);
    const { message, status } = mapRuleError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const { nocodbUrl, nocodbToken, sessionSecret } = getAppConfig();
    const session = await getSession(sessionSecret);

    if (!session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const input = normalizeRuleInput(body, session.user.persona);

    if (!input.nombre.trim()) {
      throw new RuleError("El nombre es obligatorio", 422);
    }
    validateRuleActions(input.actions);
    if (input.alcance === "account" && !input.cuenta?.trim()) {
      throw new RuleError("La cuenta es obligatoria para reglas de cuenta", 422);
    }

    const client = new NocoDbClient(nocodbUrl, nocodbToken);
    const rule = await createImportRule(client, input);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    console.error("Import rule create error:", err);
    const { message, status } = mapRuleError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
